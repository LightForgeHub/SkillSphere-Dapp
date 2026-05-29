//! Strongly-typed event variants emitted by the SkillSphere contract.
//! Mirrors the `env.events().publish` calls in `contracts/src/lib.rs`
//! so the indexer can decode the topic tuple and route each event to
//! the right write path.

/// Kinds of contract events the listener subscribes to. The contract
/// publishes them under short symbol tuples — see the contract source
/// for the exact `(topic, sub_topic)` shape per variant.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EventKind {
    /// `(session, started) -> (id, seeker, expert, rate, amount, ts, cid)`
    SessionStarted,
    /// `(session, settled) -> (id, expert_payout, ts)`
    SessionSettled,
    /// `(dispute, flagged) -> (session_id, seeker, evidence_cid, ts)`
    DisputeFlagged,
    /// `(plat_stat,) -> (total_sessions, total_volume, ts)`
    /// — emitted every N sessions (#200).
    PlatformStats,
    /// `(burn,) -> (token, amount, burn_bps)` — emitted on every
    /// settlement when fee burn is enabled (#213).
    FeeBurn,
    /// `(stake,) -> (staker, token, amount)` (#214).
    StakeDeposited,
    /// `(claim,) -> (staker, reward_token, amount)` (#214).
    StakingRewardClaimed,
}

impl EventKind {
    pub fn all_known() -> Vec<Self> {
        vec![
            Self::SessionStarted,
            Self::SessionSettled,
            Self::DisputeFlagged,
            Self::PlatformStats,
            Self::FeeBurn,
            Self::StakeDeposited,
            Self::StakingRewardClaimed,
        ]
    }
}

/// A decoded event payload. The MVP stores them in a uniform
/// `RawEvent`; a follow-up swaps this for typed variants so the
/// GraphQL resolvers can return strong types directly.
#[derive(Debug, Clone)]
pub struct RawEvent {
    pub kind: EventKind,
    pub tx_hash: String,
    pub ledger_seq: u32,
    pub timestamp: u64,
    /// XDR-serialised topic + data tuple. Encoded so the storage layer
    /// stays format-agnostic — Postgres can keep it as `BYTEA`, Redis
    /// as the value of a hash field.
    pub xdr_payload: Vec<u8>,
}
