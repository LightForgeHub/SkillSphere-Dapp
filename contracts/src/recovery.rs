//! Dead Letter Queue for failed token transfers — Issue #273.
//!
//! When `settle_session` cannot transfer tokens to a recipient (e.g. missing
//! trustline), the amount is stored here. The recipient can retry via
//! `claim_failed_transfer`. Entries expire after 180 days.

use soroban_sdk::{symbol_short, Address, Env};

use crate::{events, DataKey};

/// 180 days in seconds.
pub const DLQ_EXPIRY_SECS: u64 = 180 * 24 * 60 * 60;

/// Key for the DLQ entry timestamp (used for expiry checks).
fn dlq_ts_key(recipient: &Address) -> (soroban_sdk::Symbol, Address) {
    (symbol_short!("dlq_ts"), recipient.clone())
}

/// Store a failed transfer amount in the dead letter queue.
/// If an entry already exists, the amounts are summed.
pub fn enqueue_failed_transfer(env: &Env, recipient: &Address, amount: i128) {
    let key = DataKey::FailedTransfer(recipient.clone());
    let prev: i128 = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(0i128);
    env.storage()
        .persistent()
        .set(&key, &prev.saturating_add(amount));

    // Record timestamp for expiry (only set on first enqueue).
    let ts_key = dlq_ts_key(recipient);
    if prev == 0 {
        env.storage()
            .persistent()
            .set(&ts_key, &env.ledger().timestamp());
    }

    events::publish_event(
        env,
        symbol_short!("dlqQueue"),
        0,
        (symbol_short!("TransfQ"), recipient.clone(), amount),
    );
}

/// Attempt to claim (retry) a failed transfer. Returns the amount claimed.
/// Panics if the entry is expired or there is nothing to claim.
pub fn claim_failed_transfer(
    env: &Env,
    recipient: &Address,
    token: &Address,
) -> Result<i128, crate::Error> {
    recipient.require_auth();

    let key = DataKey::FailedTransfer(recipient.clone());
    let amount: i128 = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(0i128);

    if amount == 0 {
        return Err(crate::Error::InsufficientBalance);
    }

    // Check expiry.
    let ts_key = dlq_ts_key(recipient);
    let enqueued_at: u64 = env
        .storage()
        .persistent()
        .get(&ts_key)
        .unwrap_or(0u64);
    let now = env.ledger().timestamp();
    if now.saturating_sub(enqueued_at) > DLQ_EXPIRY_SECS {
        // Expired — clear and return error.
        env.storage().persistent().remove(&key);
        env.storage().persistent().remove(&ts_key);
        return Err(crate::Error::SessionExpired);
    }

    // Clear before transfer (checks-effects-interactions).
    env.storage().persistent().remove(&key);
    env.storage().persistent().remove(&ts_key);

    let token_client = soroban_sdk::token::Client::new(env, token);
    token_client.transfer(&env.current_contract_address(), recipient, &amount);

    events::publish_event(
        env,
        symbol_short!("dlqClaim"),
        0,
        (symbol_short!("TransfC"), recipient.clone(), amount),
    );

    Ok(amount)
}

/// Read the pending DLQ amount for a recipient (0 if none).
pub fn pending_failed_transfer(env: &Env, recipient: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::FailedTransfer(recipient.clone()))
        .unwrap_or(0i128)
}
