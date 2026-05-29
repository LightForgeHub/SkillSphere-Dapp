//! # Cross-Contract Token Swaps (DEX Integration) — Issue #205
//!
//! Allows a seeker who holds `XLM` (or any asset) to start a session where
//! the expert is paid in a *different* token (e.g. `USDC`).  The contract
//! bridges the two assets on-the-fly by calling a Stellar DEX router
//! (Phoenix / Soroswap) through a cross-contract invocation.
//!
//! ## Storage keys (defined in `lib.rs` DataKey)
//! - `DexContractAddress` — admin-set address of the DEX router contract
//!
//! ## Public functions added to `SkillSphereContract` (in `lib.rs`)
//! - `set_dex_contract(env, dex_addr)`  — admin-only, sets `DexContractAddress`
//! - `start_session_with_swap(env, seeker, expert, offer_token, ask_token,
//!                            path, offer_amount, metadata_cid)` — swaps then
//!    starts a streaming session denominated in `ask_token`
//! - `get_dex_contract(env)`            — reads the configured DEX address

use soroban_sdk::{contracttype, symbol_short, Address, Env, IntoVal, Vec};

/// Descriptor for a DEX swap leg passed into `start_session_with_swap`.
///
/// For a direct pair swap `path` is empty; multi-hop swaps list the
/// intermediate asset addresses between offer and ask.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SwapPath {
    /// The token the seeker is sending (e.g. XLM).
    pub offer_asset: Address,
    /// The token the expert will receive (e.g. USDC).
    pub ask_asset: Address,
    /// Optional intermediate hops (empty Vec for a direct pair).
    pub path: Vec<Address>,
}

/// Cross-contract call: invokes `swap` on the DEX router and returns the
/// `ask_asset` amount received.
///
/// The DEX router is expected to implement a function named `"swap"` with
/// signature `swap(offer_asset, ask_asset, path, offer_amount) -> i128`.
///
/// # Arguments
/// * `env`          — current contract environment
/// * `dex_contract` — address of the DEX router
/// * `offer_asset`  — token being sold
/// * `ask_asset`    — token being bought
/// * `path`         — intermediate asset hops (may be empty)
/// * `offer_amount` — amount of `offer_asset` to swap
///
/// # Returns
/// Amount of `ask_asset` received from the swap.
pub fn cross_contract_swap(
    env: &Env,
    dex_contract: &Address,
    offer_asset: &Address,
    ask_asset: &Address,
    path: &Vec<Address>,
    offer_amount: i128,
) -> i128 {
    let args: Vec<soroban_sdk::Val> = soroban_sdk::vec![
        env,
        offer_asset.into_val(env),
        ask_asset.into_val(env),
        path.into_val(env),
        offer_amount.into_val(env),
    ];
    env.invoke_contract::<i128>(dex_contract, &symbol_short!("swap"), args)
}
