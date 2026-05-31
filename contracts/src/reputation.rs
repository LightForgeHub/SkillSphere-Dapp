//! # Soulbound Skill Badges — Issue #202
//!
//! Rewards experts with a non-transferable (soulbound) badge NFT minted on a
//! separate SBT contract once they have accumulated ≥ 100 hours of settled
//! session time inside SkillSphere.
//!
//! ## Storage keys (defined in `lib.rs` DataKey)
//! - `SbtContractAddress`        — the deployed SBT contract address (admin-set)
//! - `ExpertBadge(Address)`      — `BadgeRecord` for an expert that has been minted
//! - `ExpertTotalSeconds(Address)` — running total of settled seconds per expert
//!
//! ## Public functions added to `SkillSphereContract` (in `lib.rs`)
//! - `set_sbt_contract(env, sbt_addr)`  — admin-only, persists `SbtContractAddress`
//! - `mint_badge(env, expert)`          — checks threshold, cross-calls SBT contract
//! - `get_badge(env, expert)`           — reads `ExpertBadge`
//! - `get_expert_total_seconds(env, expert)` — reads accumulated seconds

#![allow(unused_imports)]

use soroban_sdk::{contracttype, symbol_short, Address, Env, IntoVal, Symbol, Vec};

/// Threshold: 100 hours expressed in seconds.
pub const BADGE_HOURS_THRESHOLD_SECS: u64 = 100 * 60 * 60;

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

/// Cross-contract call: invokes `mint_badge(expert, badge_id)` on the
/// external SBT contract.  The SBT contract is expected to implement a
/// function with the symbol `"mint_bdg"` that accepts an `Address` and
/// a `u64` badge ID and returns `()`.
///
/// # Arguments
/// * `env`           — current contract environment
/// * `sbt_contract`  — address of the deployed SBT contract
/// * `expert`        — recipient of the soulbound badge
/// * `badge_id`      — sequential badge token ID (caller supplies)
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
