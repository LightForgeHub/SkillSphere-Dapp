//! Standardized webhook event schema — Issue #243.
//! Contract Event Replay Index (ring buffer) — Issue #274.
//!
//! Every contract event is published as a four-field envelope:
//! `{ event_type, session_id, timestamp, payload }` under the `webhook`
//! topic so off-chain relay daemons can parse a single shape.
//!
//! Additionally, every state-change event writes a compact summary entry
//! into a ring buffer of the last 1000 events stored in Temporary storage
//! (DataKey::EventLog(index)). Off-chain indexers that missed events can
//! call `get_event_log(from_index, limit)` to re-fetch them without
//! re-scanning the entire chain.

use soroban_sdk::{contracttype, symbol_short, Env, IntoVal, Symbol, Val, Vec};

/// Maximum number of entries kept in the on-chain ring buffer.
pub const EVENT_LOG_CAPACITY: u32 = 1000;

/// Compact summary stored per ring-buffer slot.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventLogEntry {
    /// Monotonically increasing global index (wraps at EVENT_LOG_CAPACITY).
    pub index: u32,
    /// The event type symbol (mirrors the `event_type` module).
    pub event_type: Symbol,
    /// Session id (0 for non-session events).
    pub session_id: u64,
    /// Ledger timestamp at the time of the event.
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Ring-buffer helpers
// ---------------------------------------------------------------------------

/// Storage key for the ring-buffer head pointer (next write position).
fn head_key() -> Symbol {
    symbol_short!("evtHead")
}

/// Write one entry into the ring buffer and advance the head pointer.
fn append_to_ring(env: &Env, event_type: Symbol, session_id: u64) {
    let head: u32 = env
        .storage()
        .temporary()
        .get(&head_key())
        .unwrap_or(0u32);

    let slot = head % EVENT_LOG_CAPACITY;
    let entry = EventLogEntry {
        index: head,
        event_type,
        session_id,
        timestamp: env.ledger().timestamp(),
    };

    let key = crate::DataKey::EventLog(slot);
    env.storage().temporary().set(&key, &entry);

    env.storage()
        .temporary()
        .set(&head_key(), &head.saturating_add(1));
}

/// Return up to `limit` entries starting from `from_index` (inclusive).
/// Results are ordered oldest-first. Returns an empty vec if the requested
/// range has been overwritten or does not yet exist.
pub fn get_event_log(env: &Env, from_index: u32, limit: u32) -> Vec<EventLogEntry> {
    let head: u32 = env
        .storage()
        .temporary()
        .get(&head_key())
        .unwrap_or(0u32);

    let mut results: Vec<EventLogEntry> = Vec::new(env);
    let count = limit.min(EVENT_LOG_CAPACITY);
    let mut idx = from_index;
    let mut fetched = 0u32;

    while fetched < count && idx < head {
        let slot = idx % EVENT_LOG_CAPACITY;
        if let Some(entry) = env
            .storage()
            .temporary()
            .get::<crate::DataKey, EventLogEntry>(&crate::DataKey::EventLog(slot))
        {
            // Confirm the slot hasn't been overwritten by a newer entry.
            if entry.index == idx {
                results.push_back(entry);
                fetched += 1;
            }
        }
        idx += 1;
    }

    results
}

/// Return the current head pointer (total events ever written, mod wraps internally).
pub fn event_log_head(env: &Env) -> u32 {
    env.storage()
        .temporary()
        .get(&head_key())
        .unwrap_or(0u32)
}

// ---------------------------------------------------------------------------
// Core publish helper
// ---------------------------------------------------------------------------

/// Publish a webhook envelope consumed by off-chain relay services,
/// and append a compact summary to the on-chain ring buffer.
pub fn publish_event<P>(
    env: &Env,
    event_type: Symbol,
    session_id: u64,
    payload: P,
) where
    P: IntoVal<Env, Val>,
{
    env.events().publish(
        (symbol_short!("webhook"),),
        (
            event_type.clone(),
            session_id,
            env.ledger().timestamp(),
            payload.into_val(env),
        ),
    );

    // Issue #274: write summary to ring buffer.
    append_to_ring(env, event_type, session_id);
}

/// Session lifecycle events.
pub mod event_type {
    use soroban_sdk::symbol_short;

    use super::Symbol;

    pub fn session_started() -> Symbol {
        symbol_short!("sessStart")
    }
    pub fn session_paused() -> Symbol {
        symbol_short!("sessPause")
    }
    pub fn session_resumed() -> Symbol {
        symbol_short!("sessResum")
    }
    pub fn session_settled() -> Symbol {
        symbol_short!("sessSettl")
    }
    pub fn session_finished() -> Symbol {
        symbol_short!("sessFinsh")
    }
    pub fn session_refund() -> Symbol {
        symbol_short!("sessRefnd")
    }
    pub fn session_commit() -> Symbol {
        symbol_short!("sessComit")
    }
    pub fn session_reveal() -> Symbol {
        symbol_short!("sessRevl")
    }
    pub fn session_voucher() -> Symbol {
        symbol_short!("sessVouch")
    }

    pub fn session_reserved() -> Symbol {
        symbol_short!("sessResrv")
    }

    pub fn session_reserved_activated() -> Symbol {
        symbol_short!("sessRact")
    }

    pub fn session_cancelled() -> Symbol {
        symbol_short!("sessCncl")
    }

    pub fn referral_commission_paid() -> Symbol {
        symbol_short!("refComm")
    }

    pub fn revenue_shared() -> Symbol {
        symbol_short!("revShare")
    }

    pub fn dispute_flagged() -> Symbol {
        symbol_short!("dispFlag")
    }
    pub fn dispute_evidence() -> Symbol {
        symbol_short!("dispEvid")
    }
    pub fn dispute_resolved() -> Symbol {
        symbol_short!("dispResl")
    }

    pub fn expert_cooldown() -> Symbol {
        symbol_short!("expCooldn")
    }
    pub fn spending_limit() -> Symbol {
        symbol_short!("spndLim")
    }

    pub fn admin_config() -> Symbol {
        symbol_short!("adminCfg")
    }
    pub fn platform_stats() -> Symbol {
        symbol_short!("platStat")
    }
    pub fn fee_burn() -> Symbol {
        symbol_short!("feeBurn")
    }
    pub fn staking() -> Symbol {
        symbol_short!("staking")
    }
    pub fn subscription() -> Symbol {
        symbol_short!("subscrip")
    }
    pub fn fixed_price() -> Symbol {
        symbol_short!("fixPrice")
    }
    pub fn expert_profile() -> Symbol {
        symbol_short!("expert")
    }
    pub fn rating() -> Symbol {
        symbol_short!("rating")
    }
    pub fn swap() -> Symbol {
        symbol_short!("swap")
    }
    pub fn governance() -> Symbol {
        symbol_short!("gov")
    }
    pub fn insurance() -> Symbol {
        symbol_short!("insuranc")
    }
    pub fn upgrade() -> Symbol {
        symbol_short!("upgrade")
    }
    pub fn integration() -> Symbol {
        symbol_short!("integr")
    }
    pub fn heartbeat() -> Symbol {
        symbol_short!("heartbt")
    }
    pub fn slashing() -> Symbol {
        symbol_short!("slash")
    }
    pub fn reverify() -> Symbol {
        symbol_short!("reverify")
    }
    pub fn frozen() -> Symbol {
        symbol_short!("frozen")
    }
    pub fn badge() -> Symbol {
        symbol_short!("badge")
    }
    pub fn tier_upgraded() -> Symbol {
        symbol_short!("tierUp")
    }
    pub fn session_expired() -> Symbol {
        symbol_short!("sessExp")
    }
}
