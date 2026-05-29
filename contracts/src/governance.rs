//! # Community Treasury Voting Power — Issue #204
//!
//! Links treasury-spending governance votes to a user's historical
//! participation in SkillSphere sessions.  Voting weight is computed as:
//!
//! ```text
//! voting_power(user) = total_spent(user) + total_earned(user)
//! ```
//!
//! Both counters are incremented automatically inside `internal_settle` in
//! `lib.rs` every time a session settles.
//!
//! ## Storage keys (defined in `lib.rs` DataKey)
//! - `UserTotalSpent(Address)`  — cumulative tokens spent by this address as seeker
//! - `UserTotalEarned(Address)` — cumulative tokens earned by this address as expert
//!
//! ## Public functions added to `SkillSphereContract` (in `lib.rs`)
//! - `voting_power(env, user) -> i128`      — returns `spent + earned`
//! - `get_total_spent(env, user) -> i128`   — reads `UserTotalSpent`
//! - `get_total_earned(env, user) -> i128`  — reads `UserTotalEarned`

use soroban_sdk::{Address, Env};

use crate::DataKey;

/// Returns the accumulated tokens spent by `user` as a seeker.
pub fn total_spent(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::UserTotalSpent(user.clone()))
        .unwrap_or(0i128)
}

/// Returns the accumulated tokens earned by `user` as an expert.
pub fn total_earned(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::UserTotalEarned(user.clone()))
        .unwrap_or(0i128)
}

/// Increments the seeker's `UserTotalSpent` counter by `amount`.
/// Called from `internal_settle` in `lib.rs` on every settlement.
pub fn accrue_spent(env: &Env, seeker: &Address, amount: i128) {
    let prev = total_spent(env, seeker);
    env.storage()
        .persistent()
        .set(&DataKey::UserTotalSpent(seeker.clone()), &prev.saturating_add(amount));
}

/// Increments the expert's `UserTotalEarned` counter by `amount`.
/// Called from `internal_settle` in `lib.rs` on every settlement.
pub fn accrue_earned(env: &Env, expert: &Address, amount: i128) {
    let prev = total_earned(env, expert);
    env.storage()
        .persistent()
        .set(&DataKey::UserTotalEarned(expert.clone()), &prev.saturating_add(amount));
}
