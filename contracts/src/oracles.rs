//! Circuit breaker for extreme oracle price movements.
//!
//! When the oracle price for the base asset (XLM/USD) changes by more than
//! `max_price_deviation_bps` basis points in a single update, the contract
//! activates a circuit breaker that blocks new session creation. This guards
//! against oracle manipulation attacks where an inflated/deflated price is
//! injected to drain session escrows.
//!
//! ## Storage keys (defined in `lib.rs` DataKey)
//! - `LastOraclePrice`       — most recently accepted oracle price (Instance storage)
//! - `CircuitBreakerActive`  — boolean flag; `true` means new sessions are blocked
//! - `MaxPriceDeviationBps`  — admin-configurable deviation threshold (default 2 000 bps = 20%)
//!
//! ## Public functions added to `SkillSphereContract` (in `lib.rs`)
//! - `set_max_price_deviation_bps(env, bps)` — admin only
//! - `get_max_price_deviation_bps(env)`      — read the threshold
//! - `is_circuit_breaker_active(env)`        — check whether the breaker is tripped
//! - `reset_circuit_breaker(env)`            — admin only; resumes session creation

use soroban_sdk::Env;

use crate::{DataKey, Error};

/// Default maximum allowable price deviation: 20% (2 000 bps).
pub const DEFAULT_MAX_PRICE_DEVIATION_BPS: u32 = 2_000;

/// Returns `true` if the circuit breaker is currently active (new sessions blocked).
pub fn is_circuit_breaker_active(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::CircuitBreakerActive)
        .unwrap_or(false)
}

/// Deactivates the circuit breaker. Must be called by admin after investigation.
pub fn reset_circuit_breaker(env: &Env) {
    env.storage()
        .instance()
        .set(&DataKey::CircuitBreakerActive, &false);
}

/// Returns the configured maximum price-deviation threshold in basis points.
pub fn max_price_deviation_bps(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::MaxPriceDeviationBps)
        .unwrap_or(DEFAULT_MAX_PRICE_DEVIATION_BPS)
}

/// Persists a new maximum price-deviation threshold.
pub fn set_max_price_deviation_bps(env: &Env, bps: u32) {
    env.storage()
        .instance()
        .set(&DataKey::MaxPriceDeviationBps, &bps);
}

/// Checks `new_price` against the last stored oracle price and activates the
/// circuit breaker if the deviation exceeds `max_price_deviation_bps`.
///
/// On success the new price is persisted as `LastOraclePrice`. On failure
/// `Error::CircuitBreakerActive` is returned and the breaker flag is set so
/// that subsequent calls to `is_circuit_breaker_active` return `true`.
///
/// # Deviation formula
/// ```text
/// deviation_bps = |new_price - last_price| * 10_000 / last_price
/// ```
pub fn check_and_update_price(env: &Env, new_price: i128) -> Result<(), Error> {
    if new_price <= 0 {
        // Non-positive prices are ignored — the oracle may not have data yet.
        return Ok(());
    }

    if let Some(last_price) = env
        .storage()
        .instance()
        .get::<DataKey, i128>(&DataKey::LastOraclePrice)
    {
        if last_price > 0 {
            let diff = if new_price > last_price {
                new_price - last_price
            } else {
                last_price - new_price
            };
            // deviation_bps = |diff| * 10_000 / last_price
            let deviation_bps = diff.saturating_mul(10_000) / last_price;
            let max_dev = max_price_deviation_bps(env) as i128;

            if deviation_bps > max_dev {
                // Trip the circuit breaker.
                env.storage()
                    .instance()
                    .set(&DataKey::CircuitBreakerActive, &true);
                return Err(Error::CircuitBreakerActive);
            }
        }
    }

    // Price is within bounds — update the stored reference.
    env.storage()
        .instance()
        .set(&DataKey::LastOraclePrice, &new_price);

    Ok(())
}
