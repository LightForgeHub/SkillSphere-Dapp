//! Expert cooldown after dispute loss — Issue #240.
//!
//! When arbitration awards more to the seeker than the expert, the expert
//! enters a temporary cooldown during which they cannot accept new sessions.
//! Cooldown expiry is tracked by ledger sequence in temporary storage.

use soroban_sdk::{Address, Env};

use crate::DataKey;

/// Stellar closes a ledger roughly every 5 seconds; seven days ≈ 120_960 ledgers.
pub const DEFAULT_EXPERT_COOLDOWN_LEDGERS: u32 = 7 * 24 * 60 * 12;

/// Returns the configured cooldown length in ledgers (admin-set, default 7 days).
pub fn cooldown_ledgers(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::ExpertCooldownLedgers)
        .unwrap_or(DEFAULT_EXPERT_COOLDOWN_LEDGERS)
}

/// Admin-only setter invoked from `lib.rs`.
pub fn set_cooldown_ledgers(env: &Env, ledgers: u32) {
    env.storage()
        .instance()
        .set(&DataKey::ExpertCooldownLedgers, &ledgers);
}

/// True when the expert still has an active post-loss cooldown.
pub fn is_expert_on_cooldown(env: &Env, expert: &Address) -> bool {
    if let Some(until_ledger) = env
        .storage()
        .temporary()
        .get::<DataKey, u32>(&DataKey::ExpertCooldownUntil(expert.clone()))
    {
        return env.ledger().sequence() < until_ledger;
    }
    false
}

/// Returns the ledger sequence after which the expert may accept sessions again.
pub fn expert_cooldown_until(env: &Env, expert: &Address) -> Option<u32> {
    env.storage()
        .temporary()
        .get(&DataKey::ExpertCooldownUntil(expert.clone()))
}

/// Apply cooldown when the seeker receives a strictly larger award than the expert.
pub fn apply_cooldown_if_expert_lost(
    env: &Env,
    expert: &Address,
    seeker_award_bps: u32,
    expert_award_bps: u32,
) {
    if seeker_award_bps <= expert_award_bps {
        return;
    }

    let ledgers = cooldown_ledgers(env);
    let until = env.ledger().sequence().saturating_add(ledgers);
    env.storage()
        .temporary()
        .set(&DataKey::ExpertCooldownUntil(expert.clone()), &until);
}
