# Archived State Recovery

When an expert has been inactive for a long time, their on-chain profile data
may be **archived** by Soroban's [State Archival](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival)
mechanism. Archived persistent entries are not readable until they are
restored. This guide explains how to detect archived keys and recover expert
profiles on SkillSphere.

> **Note:** Session archival (`archive_session` / `get_archived_session`) is a
> separate, contract-level feature that moves completed sessions into temporary
> storage. This document covers **protocol-level** State Archival of persistent
> contract keys such as `ExpertProfile`.

## Background

SkillSphere stores expert profiles in **persistent** storage under
`DataKey::ExpertProfile(address)`. Each write extends the entry TTL, but if
nobody interacts with the profile for long enough the TTL expires and the
entry is archived.

Symptoms of an archived expert profile:

- Off-chain reads via RPC return `archived` for the profile ledger key.
- Simulating `get_expert_profile` returns a `restorePreamble` hint.
- Direct contract reads fail before restoration.

## Automatic restoration (Protocol 23+)

On current Stellar networks, invoking a contract with an archived key in the
transaction footprint usually **auto-restores** the entry. Many dapps need no
extra code. Manual restoration is still useful when:

- You want to restore data **before** a user-facing transaction.
- Simulation reports archived keys and you prefer an explicit `RestoreFootprintOp`.
- A batch of archived keys must be restored across multiple transactions.

## Helper script

The repository ships `scripts/restore_state.ts` for operators and integrators.

### Prerequisites

- Node.js 18+
- A funded Stellar account (testnet or mainnet) with enough XLM for fees.
- The SkillSphere contract ID and the expert's Stellar address.

### Install

```bash
cd scripts
npm install
```

### Detect archived keys (dry run)

```bash
CONTRACT_ID=CABC... \
EXPERT_ADDRESS=GABC... \
DRY_RUN=true \
npm run restore-state
```

The script queries the Soroban RPC `getLedgerEntries` endpoint for the
`ExpertProfile` persistent key and prints whether it is `live`, `archived`, or
`missing`.

### Restore and verify

```bash
CONTRACT_ID=CABC... \
EXPERT_ADDRESS=GABC... \
SECRET_KEY=SABC... \
RPC_URL=https://soroban-testnet.stellar.org \
npm run restore-state
```

The script:

1. Confirms the `ExpertProfile` key is archived.
2. Simulates `get_expert_profile(expert)`.
3. If simulation requires restoration, submits a `RestoreFootprintOp` using the
   RPC `restorePreamble` hints.
4. Retries the read and confirms the profile is accessible again.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTRACT_ID` | yes | — | Deployed SkillSphere contract address |
| `EXPERT_ADDRESS` | yes | — | Expert's Stellar address (G…) |
| `SECRET_KEY` | yes* | — | Signer secret key (*not needed when `DRY_RUN=true`) |
| `RPC_URL` | no | testnet RPC | Soroban RPC endpoint |
| `NETWORK_PASSPHRASE` | no | testnet | Stellar network passphrase |
| `DRY_RUN` | no | `false` | Detect only; do not submit transactions |

## Manual restoration walkthrough

If you integrate restoration into your own dapp, follow this pattern
(adapted from the [Stellar archival guides](https://developers.stellar.org/docs/build/guides/archival/restore-data-js)):

### Step 1 — Build the profile read transaction

```typescript
import { Contract, TransactionBuilder, nativeToScVal, Address } from "@stellar/stellar-sdk";

const contract = new Contract(CONTRACT_ID);
const tx = new TransactionBuilder(account, { fee, networkPassphrase })
  .addOperation(
    contract.call(
      "get_expert_profile",
      nativeToScVal(Address.fromString(expertAddress), { type: "address" }),
    ),
  )
  .setTimeout(300)
  .build();
```

### Step 2 — Simulate and check for archived entries

```typescript
import { Api } from "@stellar/stellar-sdk/rpc";

const sim = await server.simulateTransaction(tx);

if (Api.isSimulationRestore(sim)) {
  // Archived keys are in sim.restorePreamble
}
```

### Step 3 — Submit `RestoreFootprintOp`

```typescript
import { Operation } from "@stellar/stellar-sdk";

const restoreTx = new TransactionBuilder(account, {
  fee: (parseInt(BASE_FEE) + parseInt(sim.restorePreamble.minResourceFee)).toString(),
  networkPassphrase,
})
  .setSorobanData(sim.restorePreamble.transactionData.build())
  .addOperation(Operation.restoreFootprint({}))
  .setTimeout(300)
  .build();
```

Sign and submit `restoreTx`, wait for success, then retry the original
`get_expert_profile` invocation.

### Step 4 — Confirm the profile

After restoration, `get_expert_profile` should return the expert's
`rate_per_second`, `metadata_cid`, `availability_status`, and rating fields.

## Preventing future archival

Issue #282 added configurable TTL extension helpers in the contract so active
keys are bumped on write. Experts who remain active through sessions,
availability updates, or profile edits keep their TTL refreshed automatically.

For long-idle experts, integrators can:

- Periodically call a read-only `get_expert_profile` (which refreshes the
  footprint on access after restoration).
- Use the restore script proactively before onboarding flows.

## Integration tests

The contract test suite includes
`test_archived_expert_profile_restored_and_readable` in
`contracts/src/lib.rs`. It:

1. Registers an expert and records the profile fields.
2. Advances the ledger until the `ExpertProfile` persistent TTL expires.
3. Calls `get_expert_profile` and asserts the original data is returned.
4. Verifies Soroban resource metering reflects the restoration write.

Run contract tests:

```bash
cd contracts
cargo test test_archived_expert_profile_restored_and_readable
```

## Related documentation

- [State Archival fundamentals](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival)
- [Restore archived data (JavaScript)](https://developers.stellar.org/docs/build/guides/archival/restore-data-js)
- [Test TTL extension logic](https://developers.stellar.org/docs/build/guides/archival/test-ttl-extension)
- SkillSphere session archival: `archive_session` / `get_archived_session` in `contracts/README.md`

## Troubleshooting

| Problem | Likely cause | Action |
|---------|--------------|--------|
| Key status `missing` | Expert never registered or wrong address | Verify with `register_expert` history |
| Restore tx fails | Insufficient XLM or wrong network | Check signer balance and `NETWORK_PASSPHRASE` |
| Profile returns defaults after restore | Wrong expert address | Confirm the `ExpertProfile` key matches the expert |
| `DRY_RUN` shows archived but restore succeeds on retry | Another party restored the key | Re-run dry run; key may already be live |
