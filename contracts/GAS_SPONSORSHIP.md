# Soroban Fee Sponsorship — SkillSphere (#201)

Stellar lets one account pay another account's transaction fees via
`SponsoredTransaction` / `pay_and_invoke` patterns. SkillSphere's
public entry points are designed so a sponsor (e.g. an onboarding
campaign, an employer onboarding their experts, or a referral program)
can cover gas for first-time users without changing the user's
authentication semantics.

## How it works on Stellar

A Soroban transaction has two distinct accounts:

| Role         | Pays the fee?              | Required signature |
| ------------ | -------------------------- | ------------------ |
| **Fee source** | yes                        | yes                |
| **Source / invoker** | no                  | yes, on `invoke_host_function` |

When the two are different, the transaction is a *sponsored* invocation.
The sponsor's keypair signs the fee-bump envelope and the invoker
(seeker / expert / admin) signs the inner `InvokeHostFunctionOp`.

## How SkillSphere entry points stay sponsor-compatible

All public entry points that touch funds or change protocol state call
`<address>.require_auth()` against the **invoker** address — never
against `env.current_contract_address()` and never against an implicit
"transaction source". Concrete examples:

- `register_expert(expert, ..)` requires `expert.require_auth()`.
- `start_session(seeker, expert, ..)` requires `seeker.require_auth()`.
- `heartbeat(expert)` requires `expert.require_auth()` (#199).
- `flag_dispute(session_id, seeker, ..)` requires `seeker.require_auth()`.
- `add_dispute_evidence(caller, ..)` requires `caller.require_auth()` (#198).
- `settle_session(session_id)` requires `session.expert.require_auth()`.

Because the invoker is always an *explicit* `Address` argument, the
sponsor can be any account — including one that has never interacted
with the contract before — and the call still succeeds as long as the
invoker signs.

## Sponsoring an `start_session` from a campaign account

Pseudocode (TypeScript, `@stellar/stellar-sdk`):

```ts
const tx = new TransactionBuilder(sponsorSource, {fee: BASE_FEE, networkPassphrase})
  .addOperation(Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeInvokeContract(/* start_session args */),
    auth: [
      // The seeker authorises the contract call.
      seekerAuth,
    ],
  }))
  .setTimeout(30)
  .build();

// Sponsor pays the fee:
tx.sign(sponsorKey);
// Seeker authorises the invocation:
tx.sign(seekerKey);
```

The contract sees `seeker.require_auth()` succeed because the seeker's
auth entry is in `auth[]`; the fee comes from `sponsorSource`'s XLM
balance.

## Things sponsors should know

1. **Fee source must hold XLM.** Contract calls cost in XLM; SkillSphere
   does not subsidise XLM gas itself.
2. **Token approvals are the user's job.** If the entry point transfers
   a token from the user (e.g. `start_session` calls
   `token.transfer(seeker, contract, amount)`), the seeker still needs
   to hold and authorise that token transfer. The sponsor only covers
   the XLM fee, not the funded amount.
3. **No state lives on the sponsor account.** Sponsors are interchangeable
   — the contract attributes every effect to the invoker, never to the
   fee source.
4. **Heartbeat (#199) and dispute-evidence (#198) calls are cheap and
   sponsor-friendly.** Both are zero-token, single-storage-write
   operations — typical use case: an onboarding pipeline that ticks
   `heartbeat()` for newly-onboarded experts using a single sponsor
   key.

## What does NOT need changing

The acceptance criteria for #201 asked us to confirm the entry points
are "compatible with Soroban fee-sponsorship patterns". The audit above
confirms they already are — every public entry point takes the
authorising party as an explicit `Address` and calls
`require_auth()` on it. No contract-side change is required to enable
sponsorship; only client-side transaction-builder code differs.
