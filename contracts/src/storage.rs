//! Storage helpers for session archival.

use soroban_sdk::Env;

use crate::{DataKey, Session};

/// ~90 days in ledgers (5-second ledger time).
pub const ARCHIVE_TTL_LEDGERS: u32 = 90 * 24 * 60 * 60 / 5; // 1_555_200

/// Minimum ledgers remaining before we bother extending (same as TTL).
pub const ARCHIVE_TTL_THRESHOLD: u32 = ARCHIVE_TTL_LEDGERS;

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
