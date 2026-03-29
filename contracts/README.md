# SkillSphere Smart Contract

A Soroban smart contract implementing per-second streaming payments for expert consultations with dispute resolution, reentrancy protection, and protocol upgrade timelock mechanisms.

## Features

### 1. Streaming Payments (Core)
- Per-second payment streaming from seeker to expert
- Partial settlements allowing experts to claim earned amounts
- Pause/resume functionality for session management
- Automatic balance calculations based on elapsed time

### 2. Dispute Flagging Mechanism (Issue #122)
Seekers can flag disputes to freeze session balances when experts fail to provide value.

**Key Functions:**
- `flag_dispute()` - Seeker initiates dispute with reason and IPFS metadata
- `resolve_dispute()` - Arbitrator resolves with three options:
  - **SeekerWins**: Full refund to seeker
  - **ExpertWins**: Full balance to expert
  - **Refund**: Split between expert (accrued) and seeker (remaining)
- `get_dispute()` - Retrieve dispute details and metadata reference

**Status:** Disputed sessions freeze balance, preventing further settlements until resolved.

### 3. Reentrancy Protection (Issue #120)
All token transfers follow the **Checks-Effects-Interactions** pattern.

**Implementation:**
- `start_session()`: Update session state → emit event → transfer tokens
- `settle_session()`: Update balance/status → save state → transfer tokens
- `end_session()`: Update all state → save → transfer tokens
- `resolve_dispute()`: Update dispute/session → save → transfer tokens

**Benefit:** Prevents reentrancy attacks through callback loops.

### 4. Timelock for Protocol Upgrades (Issue #121)
Admin upgrades require a 48-hour notice period for user protection.

**Key Functions:**
- `initiate_upgrade()` - Admin queues WASM upgrade with 48-hour delay
- `execute_upgrade()` - Execute upgrade after timelock expires
- `get_upgrade_timelock()` - Check upgrade status

**Timeline:**
1. Admin calls `initiate_upgrade()` at time T
2. Users have 48 hours to prepare
3. Admin calls `execute_upgrade()` at time T + 48 hours
4. Contract WASM is updated

### 5. Arbitrator Support (Issue #123)
Comprehensive documentation and tools for arbitrators to resolve disputes.

**Resources:**
- `ARBITRATOR_GUIDE.md` - Complete technical guide with examples
- Inline code documentation with arbitrator-specific notes
- IPFS metadata integration for evidence storage
- Event monitoring for dispute lifecycle

## Data Structures

### Session
```rust
pub struct Session {
    pub id: u64,
    pub seeker: Address,
    pub expert: Address,
    pub token: Address,
    pub rate_per_second: i128,
    pub start_timestamp: u64,
    pub last_settlement_timestamp: u64,
    pub status: SessionStatus,
    pub balance: i128,
    pub accrued_amount: i128,
}
```

### SessionStatus
- `Active` - Session in progress, payments streaming
- `Paused` - Session temporarily paused
- `Finished` - Session completed or ended
- `Disputed` - Session under arbitration (balance frozen)

### Dispute
```rust
pub struct Dispute {
    pub session_id: u64,
    pub reason: String,
    pub ipfs_metadata_hash: String,
    pub created_at: u64,
    pub resolved: bool,
    pub resolution: u32, // 0=unresolved, 1=SeekerWins, 2=ExpertWins, 3=Refund
}
```

### Resolution
- `SeekerWins` (1) - Seeker gets full refund
- `ExpertWins` (2) - Expert gets full balance
- `Refund` (3) - Split: expert gets accrued, seeker gets remaining

### UpgradeTimelock
```rust
pub struct UpgradeTimelock {
    pub new_wasm_hash: BytesN<32>,
    pub initiated_at: u64,
    pub execute_after: u64,
}
```

## API Reference

### Session Management

#### `initialize(env, admin)`
Initialize contract with admin address.

#### `start_session(env, seeker, expert, token, rate_per_second, amount) -> u64`
Create new session. Seeker locks funds in contract.

**Returns:** Session ID

#### `calculate_claimable_amount(env, session_id, current_time) -> i128`
Calculate expert's claimable amount at given time.

#### `settle_session(env, session_id) -> i128`
Expert claims earned amount. Returns amount transferred.

#### `pause_session(env, caller, session_id)`
Pause session (seeker or expert can call).

#### `resume_session(env, caller, session_id)`
Resume paused session (seeker or expert can call).

#### `end_session(env, caller, session_id)`
End session and distribute remaining balance (seeker or expert can call).

#### `get_session(env, session_id) -> Session`
Retrieve session details.

### Dispute Resolution

#### `flag_dispute(env, session_id, seeker, reason, ipfs_metadata_hash)`
Seeker initiates dispute with frozen balance.

#### `resolve_dispute(env, session_id, resolution)`
Arbitrator resolves dispute with chosen resolution.

#### `get_dispute(env, session_id) -> Dispute`
Retrieve dispute details and metadata reference.

### Protocol Upgrades

#### `initiate_upgrade(env, new_wasm_hash)`
Admin queues WASM upgrade with 48-hour delay.

#### `execute_upgrade(env)`
Execute upgrade after timelock expires.

#### `get_upgrade_timelock(env) -> UpgradeTimelock`
Check current upgrade status.

## Error Codes

| Code | Error | Cause |
|------|-------|-------|
| 1 | `Unauthorized` | Caller lacks required authorization |
| 2 | `SessionNotFound` | Session ID doesn't exist |
| 3 | `InvalidSessionState` | Operation invalid for current status |
| 4 | `InsufficientBalance` | Seeker has insufficient funds |
| 5 | `InvalidAmount` | Amount is zero or negative |
| 6 | `NotStarted` | Session not yet started |
| 7 | `AlreadyFinished` | Session already finished |
| 8 | `DisputeNotFound` | No dispute for session |
| 9 | `UpgradeNotInitiated` | No upgrade in progress |
| 10 | `TimelockNotExpired` | Upgrade timelock not yet expired |
| 11 | `EmptyDisputeReason` | Dispute reason cannot be empty |

## Events

### Session Events
- `started` - Session created
- `paused` - Session paused
- `resumed` - Session resumed
- `settled` - Expert claimed payment
- `finished` - Session ended

### Dispute Events
- `disputed` - Dispute flagged
- `resolved` - Dispute resolved

### Upgrade Events
- `upgInit` - Upgrade initiated
- `upgExec` - Upgrade executed

## Usage Examples

### Start a Session
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source seeker-key \
  -- start_session \
  --seeker GAAAA... \
  --expert GBBBB... \
  --token GCCCC... \
  --rate_per_second 100 \
  --amount 50000
```

### Flag a Dispute
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source seeker-key \
  -- flag_dispute \
  --session_id 12345 \
  --seeker GAAAA... \
  --reason "Expert did not respond" \
  --ipfs_metadata_hash "QmXxxx..."
```

### Resolve Dispute (Arbitrator)
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source arbitrator-key \
  -- resolve_dispute \
  --session_id 12345 \
  --resolution 3  # Refund
```

### Initiate Upgrade (Admin)
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin-key \
  -- initiate_upgrade \
  --new_wasm_hash <HASH>
```

## Security Considerations

### Reentrancy Protection
All token transfers occur after state mutations, preventing reentrancy attacks.

### Dispute Freezing
Disputed sessions cannot be settled or ended until resolved, protecting both parties.

### Upgrade Timelock
48-hour delay on protocol upgrades allows users to prepare or migrate.

### Authorization
- Seeker: Can start, pause, resume, end, and dispute sessions
- Expert: Can settle and resume sessions
- Admin: Can resolve disputes and upgrade contract
- Arbitrator: Can resolve disputes (admin role)

## Testing

Run all tests:
```bash
cargo test
```

Tests verify:
- Session creation and token locking
- Streaming payment calculations
- Pause/resume functionality
- Settlement mechanics
- Balance calculations
- Authorization checks

## Building

Build the contract:
```bash
cargo build --target wasm32-unknown-unknown --release
```

## Documentation

- **ARBITRATOR_GUIDE.md** - Complete guide for arbitrators
- **Inline code comments** - Detailed function documentation
- **This README** - API reference and overview

## Version

- Contract Version: 1.0
- Soroban SDK: 21.0.0
- Rust Edition: 2021

## License

See LICENSE file in repository root.
