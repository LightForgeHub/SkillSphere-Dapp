# @skillsphere/contract-sdk

Auto-generated TypeScript SDK for the **SkillSphere** Soroban smart contract.

The SDK is regenerated automatically on every push to `main` via the
`sdk` job in `.github/workflows/soroban.yml`.  The source of truth is always
the compiled contract WASM; this package is a typed convenience wrapper around
`@stellar/stellar-sdk`.

---

## Installation

```bash
npm install @skillsphere/contract-sdk @stellar/stellar-sdk
```

---

## Quick start

```typescript
import { createTestnetClient } from "@skillsphere/contract-sdk";
import { Keypair } from "@stellar/stellar-sdk";

const CONTRACT_ID = "C..."; // deployed contract address

const client = createTestnetClient(CONTRACT_ID);
```

---

## API

### `startSession`

Opens a new mentorship session, locking an escrow deposit from the seeker.

```typescript
import { createTestnetClient } from "@skillsphere/contract-sdk";
import { Keypair } from "@stellar/stellar-sdk";

const client = createTestnetClient("CCONTRACT_ADDRESS_HERE");

const seekerKeypair = Keypair.fromSecret("S...");
const expertAddress = "G...";       // expert's Stellar address
const tokenAddress  = "C...";       // whitelisted payment-token contract
const amount        = 3_000n;       // deposit in token base units (i128)
const minReputation = 0;            // 0 = accept any reputation score
const metadataCid   = "bafybeig..."; // IPFS CID of session metadata

const sessionId = await client.startSession(
  seekerKeypair,
  expertAddress,
  tokenAddress,
  amount,
  minReputation,
  metadataCid
);

console.log("Session started, ID:", sessionId);
```

---

### `endSession`

Closes an active session.  Either the seeker or the expert may call this.

```typescript
import { createTestnetClient } from "@skillsphere/contract-sdk";
import { Keypair } from "@stellar/stellar-sdk";

const client = createTestnetClient("CCONTRACT_ADDRESS_HERE");

const callerKeypair = Keypair.fromSecret("S...");
const sessionId = 42n; // ID returned by startSession

await client.endSession(callerKeypair, sessionId);
console.log("Session ended.");
```

---

### `rateExpert`

Submits a multi-dimensional rating (1–5 per dimension) for a completed session.
Only the original seeker may rate; each session can only be rated once.

```typescript
import { createTestnetClient } from "@skillsphere/contract-sdk";
import { Keypair } from "@stellar/stellar-sdk";

const client = createTestnetClient("CCONTRACT_ADDRESS_HERE");

const seekerKeypair = Keypair.fromSecret("S...");
const sessionId = 42n;

await client.rateExpert(seekerKeypair, sessionId, {
  communication: 5,
  expertise:     4,
  punctuality:   5,
  overall:       5,
});

console.log("Expert rated successfully.");
```

---

## Mainnet

Swap `createTestnetClient` for `createMainnetClient`:

```typescript
import { createMainnetClient } from "@skillsphere/contract-sdk";

const client = createMainnetClient("CCONTRACT_ADDRESS_HERE");
```

---

## Build

```bash
npm run build   # compiles TypeScript → dist/
```

## Publish

```bash
npm publish     # runs prepublishOnly (build) then publishes to NPM
```

The package is scoped to `@skillsphere` and published publicly
(`"access": "public"` in `package.json`).
