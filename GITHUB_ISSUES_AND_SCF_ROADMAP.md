# SkillSphere — Open-Source GitHub Issues & SCF Submission Roadmap

This document serves as the comprehensive open-source contributor guide, issue directory, and Stellar Community Fund (SCF) roadmap for **SkillSphere** — a decentralized, peer-to-peer knowledge marketplace with real-time per-second streaming payments powered by Stellar and Soroban smart contracts.

---

## 🏛️ 1. Project Architecture & Integration Flow

SkillSphere consists of three core open-source repositories designed for seamless interaction:

```
+-----------------------------------------------------------------------------------+
|                                SkillSphere-Dapp                                   |
|       (Next.js 15 App Router, React 19, TailwindCSS, @stellar/freighter-api)      |
+----------------------------------------+------------------------------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+----------------------------------------+        +----------------------------------+
|          SkillSphere (Backend)         |        |      SkillSphere-Contracts       |
| (Node.js/TS, Express, Apollo GraphQL,  |        | (Rust + Soroban Smart Contracts: |
|  Prisma PostgreSQL, Event Indexer)     |        |  Vault, Reputation, Calendar, ID)|
+----------------------------------------+        +----------------------------------+
```

### Component Roles:
1. **`SkillSphere-Contracts`**: Soroban smart contracts handling trustless escrow lockup, continuous per-second value release, instant refunds, on-chain user identity registration, and immutable reputation scoring.
2. **`SkillSphere` (Backend)**: Off-chain auxiliary service that indexes Soroban RPC event logs into PostgreSQL, powers full-text expert search, and provides WebRTC signaling for video consultations.
3. **`SkillSphere-Dapp` (Frontend)**: Web application providing expert discovery, wallet connection, session booking, WebRTC video calling with live per-second payment timer overlays, and transaction tracking.

---

## ⚡ 2. Wallet Connection & Network Alignment (Testnet & Mainnet)

The dApp frontend (`SkillSphere-Dapp`) is integrated with `@stellar/freighter-api` via [`WalletProvider.tsx`](file:///c:/Users/TOSHIBA/Documents/SkillSphere-Dapp/src/providers/WalletProvider.tsx).

### Key Integration Highlights:
- **Freighter Wallet Integration**: Connects directly to Freighter browser extension to retrieve public key addresses (`G...`) without requiring central accounts or password storage.
- **Network Polling & Auto-Detection**: Continuously polls Freighter network state every 3 seconds to determine active network (`TESTNET`, `PUBLIC` / Mainnet, `FUTURENET`).
- **Horizon XLM Balance Sync**: Connects to official Horizon RPC nodes (`https://horizon-testnet.stellar.org` & `https://horizon.stellar.org`) to fetch live native account balances.
- **Network Mismatch Warning Banner**: Displays an alert banner on top of the UI whenever a user's Freighter network is set differently than the application environment (e.g. prompt to switch from Mainnet to Testnet).
- **Sandbox Mock Switcher**: Includes a built-in sandbox mock profile toggle ([`DevToolsSwitcher.tsx`](file:///c:/Users/TOSHIBA/Documents/SkillSphere-Dapp/src/components/ui/DevToolsSwitcher.tsx)) allowing open-source contributors and SCF reviewers to test client and expert personas without requiring a live browser extension.

---

## 📋 3. Detailed Open-Source GitHub Issues Directory

Below is a curated set of 10 GitHub issue templates ready for creation across your repositories.

---

### 📜 Category A: `SkillSphere-Contracts` (Rust / Soroban Smart Contracts)

#### **Issue #1: Implement Dynamic Rate-Limit Escrow Locking in `payment-vault-contract`**
- **Labels**: `enhancement`, `good first issue`, `soroban`, `rust`
- **Context**: Prevent clients from creating multiple rapid escrow locks for the same session ID due to frontend retries or network latency.
- **Tasks**:
  1. Add `min_session_interval` configuration in contract persistent storage.
  2. Validate that the elapsed time between consecutive escrow locks for a given session ID exceeds `min_session_interval`.
  3. Emit Soroban event: `EscrowLocked(session_id, client, expert, rate_per_second, total_deposit)`.
- **Suggested Files**: `contracts/payment-vault-contract/src/contract.rs`, `storage.rs`, `events.rs`
- **Acceptance Criteria**: Unit tests in `test.rs` confirm rapid duplicate lock calls revert with `Error::RateLimitExceeded`.

---

#### **Issue #2: Add Multi-Asset Token Support (Stellar Asset Contract / USDC) to Escrow Vault**
- **Labels**: `feature`, `smart-contracts`, `scf-priority`
- **Context**: Expand the payment vault to accept Stellar Asset Contracts (SAC) such as USDC alongside native XLM.
- **Tasks**:
  1. Modify `initialize_session_vault` to accept an asset `Address` parameter.
  2. Implement cross-contract invocations using `token::Client::new(&env, &token_address).transfer(...)`.
  3. Support multi-token streaming rate calculations based on asset decimal precision.
- **Suggested Files**: `contracts/payment-vault-contract/src/contract.rs`, `types.rs`
- **Acceptance Criteria**: Integration test demonstrates depositing and streaming custom Stellar tokens (e.g., testnet USDC).

---

#### **Issue #3: Automated Dispute Penalty Slashing in `reputation-scoring-contract`**
- **Labels**: `feature`, `security`, `soroban`
- **Context**: When a dispute is resolved in favor of the client, expert reputation scores should automatically decrease based on dispute severity.
- **Tasks**:
  1. Add `penalize_expert(expert: Address, penalty_points: u32)` function restricted to authorized dispute arbitrator contracts.
  2. Update expert tier thresholds (`ExpertTier::Verified`, `ExpertTier::TopRated`, `ExpertTier::Suspended`).
  3. Emit event `ReputationPenalized(expert, penalty_points, new_score)`.
- **Suggested Files**: `contracts/reputation-scoring-contract/src/contract.rs`, `lib.rs`
- **Acceptance Criteria**: `cargo test` confirms proper deduction of points and automatic tier demotion.

---

#### **Issue #4: WASM Binary Footprint & Gas Profile Optimization**
- **Labels**: `performance`, `ci/cd`, `rust`
- **Context**: Optimize compiled Soroban WASM binaries to minimize transaction footprint and gas execution costs on Stellar mainnet.
- **Tasks**:
  1. Configure release profile options in root `Cargo.toml` (`opt-level = "z"`, `codegen-units = 1`, `panic = "abort"`).
  2. Profile gas usage using `soroban-cli` contract invocation metrics.
- **Suggested Files**: `Cargo.toml`, `.github/workflows/ci.yml`
- **Acceptance Criteria**: Reduced WASM file size below 50KB per contract module.

---

### ⚙️ Category B: `SkillSphere` (Backend & Indexer API)

#### **Issue #5: Soroban Event Stream Consumer for Real-Time Payment Indexing**
- **Labels**: `feature`, `backend`, `indexer`
- **Context**: Index contract events from Stellar RPC into PostgreSQL so expert earnings and session histories are queried instantly off-chain.
- **Tasks**:
  1. Create a Stellar RPC event poller in `backend/src/indexer.ts` fetching `getEvents` filtered by contract ID.
  2. Decode Soroban XDR event topics and data into TypeScript objects.
  3. Save transactions and update session status in PostgreSQL via Prisma.
- **Suggested Files**: `backend/src/indexer.ts`, `backend/prisma/schema.prisma`
- **Acceptance Criteria**: Emitted `PaymentStreamed` events update database records within 2 seconds.

---

#### **Issue #6: WebRTC Peer-to-Peer Signaling Server Heartbeat & Disconnect Timeout**
- **Labels**: `enhancement`, `websockets`, `backend`
- **Context**: Ensure video call sessions handle sudden peer disconnects gracefully and trigger contract auto-settlement.
- **Tasks**:
  1. Add ping/pong heartbeat intervals (10s) in Socket.IO signaling server.
  2. If a peer drops connection without sending `EndSession`, wait 60 seconds grace period then trigger fallback settlement.
- **Suggested Files**: `backend/src/socket/signaling.ts`
- **Acceptance Criteria**: Simulated network disconnect triggers `PeerDisconnected` notification and auto-settlement fallback.

---

#### **Issue #7: GraphQL Subscriptions for Live Consultation Session Status**
- **Labels**: `enhancement`, `graphql`, `backend`
- **Context**: Provide live real-time updates to client and expert UI dashboards when session status changes.
- **Tasks**:
  1. Define Apollo Server GraphQL subscriptions for `sessionUpdated(sessionId: ID!)`.
  2. Publish events when indexer detects escrow funding or settlement transactions on-chain.
- **Suggested Files**: `backend/src/graphql/schema.ts`, `backend/src/graphql/resolvers.ts`
- **Acceptance Criteria**: Frontend subscription receives real-time payload upon escrow confirmation.

---

### 🎨 Category C: `SkillSphere-Dapp` (Next.js Frontend)

#### **Issue #8: Real-Time Freighter Transaction Signing Stepper for Escrow Lockup**
- **Labels**: `feature`, `wallet`, `frontend`
- **Context**: Connect [`FundSessionModal.tsx`](file:///c:/Users/TOSHIBA/Documents/SkillSphere-Dapp/src/components/marketplace/FundSessionModal.tsx) to sign and submit Soroban transactions directly using Freighter.
- **Tasks**:
  1. Construct contract call XDR using `@stellar/stellar-sdk` and `useSorobanTx` hook.
  2. Prompt Freighter signature via `signTransaction()`.
  3. Show step-by-step progress using [`TxProgressStepper.tsx`](file:///c:/Users/TOSHIBA/Documents/SkillSphere-Dapp/src/components/ui/TxProgressStepper.tsx) (Preparing -> Signing -> Submitting -> Confirmed).
- **Suggested Files**: `src/components/marketplace/FundSessionModal.tsx`, `src/hooks/useSorobanTx.ts`
- **Acceptance Criteria**: Successful transaction displays live Stellar Explorer transaction hash link.

---

#### **Issue #9: On-Chain Dispute Resolution & Appeal Submission UI**
- **Labels**: `feature`, `ui`, `frontend`
- **Context**: Allow knowledge seekers or experts to submit a dispute claim for reviewed sessions.
- **Tasks**:
  1. Create an appeal submission modal using [`AppealForm.tsx`](file:///c:/Users/TOSHIBA/Documents/SkillSphere-Dapp/src/components/session/AppealForm.tsx).
  2. Upload evidence metadata and invoke `submit_dispute` on the `reputation-scoring-contract`.
- **Suggested Files**: `src/components/session/AppealForm.tsx`, `src/app/dashboard/support/page.tsx`
- **Acceptance Criteria**: Submitted disputes appear in the `/admin/disputes` dashboard view.

---

#### **Issue #10: Multi-Currency Exchange Rate Conversion & Live Wallet Switcher**
- **Labels**: `enhancement`, `ui`, `frontend`
- **Context**: Display session prices in XLM alongside fiat equivalence (USD, EUR, GBP, JPY) using real-time price feeds.
- **Tasks**:
  1. Wire [`useCurrency.ts`](file:///c:/Users/TOSHIBA/Documents/SkillSphere-Dapp/src/hooks/useCurrency.ts) to public exchange rate API.
  2. Allow instant switching between currencies in [`Navbar.tsx`](file:///c:/Users/TOSHIBA/Documents/SkillSphere-Dapp/src/components/layout/Navbar.tsx).
- **Suggested Files**: `src/hooks/useCurrency.ts`, `src/components/layout/Navbar.tsx`
- **Acceptance Criteria**: Toggling currency dropdown updates rates smoothly across expert cards and booking modals.

---

## 🚀 4. Stellar Community Fund (SCF) Milestone Strategy & Presentation

To present a compelling proposal to **Stellar Community Fund (SCF)** reviewers:

### Recommended SCF Milestone Structure

| Milestone | Deliverables | Key Deliverable Proofs |
|---|---|---|
| **Milestone 1: Core Contracts & Escrow Streaming** | - Soroban `payment-vault` & `identity-registry` contracts.<br>- Automated dispute penalty mechanisms.<br>- Unit & integration test suites. | - Smart contract WASM builds.<br>- GitHub test suite reports (`cargo test`).<br>- Soroban CLI invocation scripts. |
| **Milestone 2: Dapp UI, Wallet Integration & WebRTC** | - Next.js frontend with Freighter Wallet integration.<br>- Per-second streaming payment timer overlay.<br>- 3-step escrow funding wizard. | - Live dApp deployment link.<br>- Interactive demo flows (`/explore-experts`, `/ui-demo/video-call`). |
| **Milestone 3: Indexer, Analytics & Mainnet Readiness** | - Event indexer syncing Soroban events to PostgreSQL.<br>- On-chain transaction history explorer.<br>- Production security audits & mainnet deployment. | - Indexed GraphQL API endpoints.<br>- Mainnet contract deployment transaction hashes. |

---

### Live Interactive Demo Routes for Reviewers

Include direct links to these pre-configured prototype routes in your SCF application pitch:

- 🔍 **Expert Directory**: `http://localhost:3000/explore-experts` — Browse verified experts, categories, and per-minute rates.
- 💳 **Escrow Funding Wizard**: `http://localhost:3000/ui-demo/fund-session` — Interactive 3-step wallet funding simulation.
- 📹 **Live Consultation Room**: `http://localhost:3000/ui-demo/video-call` — WebRTC call interface with live per-second payment counter.
- 📑 **Stellar Transaction Explorer**: `http://localhost:3000/ui-demo/transactions` — On-chain escrow lock and settlement receipts.
