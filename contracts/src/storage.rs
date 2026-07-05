//! Storage helpers for session archival and TTL (Time-To-Live) extension.

use soroban_sdk::{symbol_short, Env};

use crate::{DataKey, Session};

/// ~90 days in ledgers (5-second ledger time).
pub const ARCHIVE_TTL_LEDGERS: u32 = 90 * 24 * 60 * 60 / 5; // 1_555_200

/// Minimum ledgers remaining before we bother extending (same as TTL).
pub const ARCHIVE_TTL_THRESHOLD: u32 = ARCHIVE_TTL_LEDGERS;

/// Default minimum TTL extension in ledgers (~5.8 days at 5s/ledger).
pub const DEFAULT_MIN_TTL_LEDGERS: u32 = 100_000;

/// Default maximum TTL extension in ledgers (~115.7 days at 5s/ledger).
pub const DEFAULT_MAX_TTL_LEDGERS: u32 = 2_000_000;

/// Storage key for the configurable minimum TTL threshold.
const MIN_TTL_KEY: soroban_sdk::Symbol = symbol_short!("minTtl");
/// Storage key for the configurable maximum TTL threshold.
const MAX_TTL_KEY: soroban_sdk::Symbol = symbol_short!("maxTtl");

// ---------------------------------------------------------------------------
// TTL Configuration
// ---------------------------------------------------------------------------

/// Returns the configured minimum TTL in ledgers.
pub fn min_ttl_ledgers(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&MIN_TTL_KEY)
        .unwrap_or(DEFAULT_MIN_TTL_LEDGERS)
}

/// Persists the minimum TTL threshold.
pub fn set_min_ttl_ledgers(env: &Env, ledgers: u32) {
    env.storage()
        .instance()
        .set(&MIN_TTL_KEY, &ledgers);
}

/// Returns the configured maximum TTL in ledgers.
pub fn max_ttl_ledgers(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&MAX_TTL_KEY)
        .unwrap_or(DEFAULT_MAX_TTL_LEDGERS)
}

/// Persists the maximum TTL threshold.
pub fn set_max_ttl_ledgers(env: &Env, ledgers: u32) {
    env.storage()
        .instance()
        .set(&MAX_TTL_KEY, &ledgers);
}

// ---------------------------------------------------------------------------
// TTL Extension Helpers
// ---------------------------------------------------------------------------

/// Extend the TTL of a persistent storage key using the configured min/max thresholds.
/// Should be called after every state-modifying write to an active key so that
/// the entry does not expire while still in use.
pub fn extend_persistent_ttl<K: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &K,
) {
    let min = min_ttl_ledgers(env);
    let max = max_ttl_ledgers(env);
    env.storage().persistent().extend_ttl(key, min, max);
}

/// Extend the TTL of an instance storage key using the configured min/max thresholds.
/// Call during initialisation and on every admin-config write to ensure instance
/// entries do not expire.
pub fn extend_instance_ttl<K: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(
    env: &Env,
    key: &K,
) {
    let min = min_ttl_ledgers(env);
    let max = max_ttl_ledgers(env);
    env.storage().instance().extend_ttl(min, max);
}

// ---------------------------------------------------------------------------
// Session Archival
// ---------------------------------------------------------------------------

/// Write `session` to temporary storage and set its TTL to ~90 days.
pub fn write_archive(env: &Env, session: &Session) {
    let key = DataKey::Session(session.id);
    env.storage().temporary().set(&key, session);
    env.storage()
        .temporary()
        .extend_ttl(&key, ARCHIVE_TTL_THRESHOLD, ARCHIVE_TTL_LEDGERS);
}

/// Read a session from temporary (archived) storage.
pub fn read_archive(env: &Env, session_id: u64) -> Option<Session> {
    env.storage()
        .temporary()
        .get(&DataKey::Session(session_id))
}
