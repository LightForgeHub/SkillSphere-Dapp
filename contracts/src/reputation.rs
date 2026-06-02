//! # Soulbound Skill Badges — Issue #202
//! # Expert Tier System
//!
//! Rewards experts with a non-transferable (soulbound) badge NFT minted on a
//! separate SBT contract once they have accumulated ≥ 100 hours of settled
//! session time inside SkillSphere.
//!
//! Expert tier (Bronze / Silver / Gold) is recalculated on every session
//! completion and stored under `DataKey::ExpertTier(expert)`. Gold experts pay
//! zero platform fee; Silver experts pay a 50%-discounted fee; Bronze experts
//! pay the full configured fee.
//!
//! ## Storage keys (defined in `lib.rs` DataKey)
//! - `SbtContractAddress`                  — the deployed SBT contract address
//! - `ExpertBadge(Address)`                — `BadgeRecord` for a minted expert
//! - `ExpertTotalSeconds(Address)`         — cumulative settled seconds
//! - `ExpertTier(Address)`                 — current `ExpertTier` for an expert
//! - `ExpertCompletedSessions(Address)`    — count of fully-completed sessions
//!
//! ## Public functions added to `SkillSphereContract` (in `lib.rs`)
//! - `set_sbt_contract(env, sbt_addr)`           — admin-only
//! - `mint_badge(env, expert)`                   — checks threshold, cross-calls SBT
//! - `get_badge(env, expert)`                    — reads `ExpertBadge`
//! - `get_expert_total_seconds(env, expert)`     — reads accumulated seconds
//! - `get_expert_tier(env, expert)`              — reads current `ExpertTier`
//! - `get_expert_completed_sessions(env, expert)` — reads completed session count

#![allow(unused_imports)]

use soroban_sdk::{contracttype, symbol_short, Address, Env, IntoVal, Symbol, Vec};

use crate::{DataKey, events};

// ---------------------------------------------------------------------------
// Issue #277 — Reputation Decay for Inactive Experts
// ---------------------------------------------------------------------------

/// Seconds in 30 days.
const DECAY_PERIOD_SECS: u64 = 30 * 24 * 60 * 60;
/// Retention per period in basis points (95% = 9500 bps, i.e. 5% decay).
const DECAY_RETENTION_BPS: u64 = 9_500;
/// Floor: rating cannot fall below 50% of original (5000 bps).
const DECAY_FLOOR_BPS: u64 = 5_000;

/// Returns the retention factor in basis points (0–10000) given how long the
/// expert has been inactive.  Pure function — safe to call anywhere.
///
/// For every 30-day period of inactivity, 5% is removed (multiplicatively).
/// The result is floored at 50% so `effective ≥ stored / 2`.
pub fn decay_factor_bps(now: u64, last_active: u64) -> u64 {
    if now <= last_active {
        return 10_000;
    }
    let elapsed = now - last_active;
    let periods = elapsed / DECAY_PERIOD_SECS;
    if periods == 0 {
        return 10_000;
    }
    // Each period retains 95% = 9500 bps.
    let mut factor: u64 = 10_000;
    for _ in 0..periods {
        factor = factor.saturating_mul(DECAY_RETENTION_BPS) / 10_000;
        if factor <= DECAY_FLOOR_BPS {
            return DECAY_FLOOR_BPS;
        }
    }
    factor.max(DECAY_FLOOR_BPS)
}

/// Applies decay to `stored_rating` (1–5 scale expressed in hundredths for
/// precision).  Returns the effective rating on the same 1–5 scale.
pub fn effective_rating(stored_rating: u32, now: u64, last_active: u64) -> u32 {
    if stored_rating == 0 {
        return 0;
    }
    let factor = decay_factor_bps(now, last_active);
    // Multiply rating × factor (bps) then divide by 10000.
    ((stored_rating as u64).saturating_mul(factor) / 10_000) as u32
}

/// Update the expert's `last_active` timestamp in persistent storage.
pub fn record_expert_activity(env: &Env, expert: &Address) {
    env.storage()
        .persistent()
        .set(&DataKey::ExpertLastActive(expert.clone()), &env.ledger().timestamp());
}

/// Threshold: 100 hours expressed in seconds.
pub const BADGE_HOURS_THRESHOLD_SECS: u64 = 100 * 60 * 60;

/// Minimum completed sessions to reach Silver tier.
pub const TIER_SILVER_MIN_SESSIONS: u32 = 10;
/// Minimum average rating (1–5 scale) required to reach Silver tier.
pub const TIER_SILVER_MIN_RATING: u32 = 4;
/// Minimum completed sessions to reach Gold tier.
pub const TIER_GOLD_MIN_SESSIONS: u32 = 50;
/// Minimum average rating (1–5 scale) required to reach Gold tier.
pub const TIER_GOLD_MIN_RATING: u32 = 4;

/// Expert performance tier that determines platform-fee discounts.
///
/// | Tier   | Platform fee         | Conditions                              |
/// |--------|----------------------|-----------------------------------------|
/// | Bronze | Full fee (no change) | < 10 sessions OR avg rating < 4         |
/// | Silver | 50% discount         | ≥ 10 sessions AND avg rating ≥ 4        |
/// | Gold   | 0% (zero fee)        | ≥ 50 sessions AND avg rating ≥ 4        |
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ExpertTier {
    /// Default tier — full platform fee applies.
    Bronze,
    /// Mid tier — 50% platform-fee discount.
    Silver,
    /// Top tier — zero platform fee.
    Gold,
}

/// On-chain record stored when a badge is minted for an expert.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeRecord {
    /// The expert's address (redundant but useful for indexers).
    pub expert: Address,
    /// Total settled seconds the expert had accumulated at mint time.
    pub seconds_at_mint: u64,
    /// Ledger timestamp at the moment of minting.
    pub minted_at: u64,
    /// Token/badge ID returned by the SBT contract (stored for reference).
    pub badge_token_id: u64,
}

/// Compute the tier an expert belongs to given their performance stats.
///
/// Tiers escalate from Bronze → Silver → Gold:
/// - **Gold**: ≥ `TIER_GOLD_MIN_SESSIONS` sessions AND avg rating ≥ `TIER_GOLD_MIN_RATING`
/// - **Silver**: ≥ `TIER_SILVER_MIN_SESSIONS` sessions AND avg rating ≥ `TIER_SILVER_MIN_RATING`
/// - **Bronze**: everyone else (including brand-new experts)
pub fn compute_tier(completed_sessions: u32, avg_rating: u32) -> ExpertTier {
    if completed_sessions >= TIER_GOLD_MIN_SESSIONS && avg_rating >= TIER_GOLD_MIN_RATING {
        ExpertTier::Gold
    } else if completed_sessions >= TIER_SILVER_MIN_SESSIONS
        && avg_rating >= TIER_SILVER_MIN_RATING
    {
        ExpertTier::Silver
    } else {
        ExpertTier::Bronze
    }
}

/// Reads an expert's current tier from persistent storage (defaults to `Bronze`).
pub fn get_tier(env: &Env, expert: &Address) -> ExpertTier {
    env.storage()
        .persistent()
        .get(&DataKey::ExpertTier(expert.clone()))
        .unwrap_or(ExpertTier::Bronze)
}

/// Called on every session completion.
///
/// Increments `ExpertCompletedSessions`, recomputes the tier, persists the
/// result, and emits a `TierUpgraded` event when the tier level changes.
pub fn update_expert_tier_on_completion(env: &Env, expert: &Address) {
    // Increment the completed-session counter for this expert.
    let prev_count: u32 = env
        .storage()
        .persistent()
        .get(&DataKey::ExpertCompletedSessions(expert.clone()))
        .unwrap_or(0u32);
    let new_count = prev_count.saturating_add(1);
    env.storage()
        .persistent()
        .set(&DataKey::ExpertCompletedSessions(expert.clone()), &new_count);

    // Average rating — 0 if the expert has no ratings yet (stays Bronze until rated).
    let avg_rating: u32 = env
        .storage()
        .persistent()
        .get(&DataKey::ExpertAverageRating(expert.clone()))
        .unwrap_or(0u32);

    let old_tier = get_tier(env, expert);
    let new_tier = compute_tier(new_count, avg_rating);

    env.storage()
        .persistent()
        .set(&DataKey::ExpertTier(expert.clone()), &new_tier);

    if new_tier != old_tier {
        // Emit TierUpgraded { expert, old_tier, new_tier }
        events::publish_event(
            env,
            events::event_type::tier_upgraded(),
            0,
            (expert.clone(), old_tier, new_tier),
        );
    }
}

/// Cross-contract call: invokes `mint_badge(expert, badge_id)` on the
/// external SBT contract.  The SBT contract must implement a function with
/// the symbol `"mint_bdg"` that accepts an `Address` and a `u64` badge ID.
pub fn cross_contract_mint_badge(
    env: &Env,
    sbt_contract: &Address,
    expert: &Address,
    badge_id: u64,
) {
    let args: Vec<soroban_sdk::Val> = soroban_sdk::vec![
        env,
        expert.into_val(env),
        badge_id.into_val(env),
    ];
    env.invoke_contract::<()>(sbt_contract, &symbol_short!("mint_bdg"), args);
}
