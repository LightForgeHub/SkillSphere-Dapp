//! Admin helpers – thin re-exports so other modules can import from a single place.
use crate::{DataKey, Error};

pub use crate::Error;


use soroban_sdk::{Address, Env, Vec};



/// Default rate-limit cooldown: 0 disables per-address throttling.
const DEFAULT_RATE_LIMIT_MIN_LEDGERS: u32 = 0;

/// Returns the stored admin address, or `Error::Unauthorized` if not set.
pub fn get_admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::Unauthorized)
}

/// Requires the stored admin to have signed the current transaction.
pub fn require_admin(env: &Env) -> Result<Address, Error> {
    let admin = get_admin(env)?;
    admin.require_auth();
    Ok(admin)
//! Admin-managed configuration: rate-limit cooldowns (#236) and the
//! approved-token registry (#239).



/// Reads the configured minimum ledger gap between rate-limited calls.
pub fn rate_limit_min_ledgers(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::RateLimitMinLedgers)
        .unwrap_or(DEFAULT_RATE_LIMIT_MIN_LEDGERS)
}

/// Persists the minimum ledger gap between rate-limited calls.
pub fn set_rate_limit_min_ledgers(env: &Env, min_ledgers: u32) {
    env.storage()
        .instance()
        .set(&DataKey::RateLimitMinLedgers, &min_ledgers);
}

/// Enforces a per-address cooldown of at least `min_ledgers` ledgers
/// between successive calls.  The last action ledger is stored under
/// `DataKey::LastAction(address)` in **temporary** storage so it
/// auto-expires and does not accumulate rent.
pub fn rate_limit(env: &Env, caller: &Address, min_ledgers: u32) -> Result<(), Error> {
    if min_ledgers == 0 {
        return Ok(());
    }

    let key = DataKey::LastAction(caller.clone());
    let current = env.ledger().sequence();

    if let Some(last) = env
        .storage()
        .temporary()
        .get::<DataKey, u32>(&key)
    {
        if current.saturating_sub(last) < min_ledgers {
            return Err(Error::RateLimitExceeded);
        }
    }

    env.storage().temporary().set(&key, &current);

    // Keep the tombstone alive through the cooldown window.
    let extend_to = min_ledgers.saturating_add(10);
    env.storage()
        .temporary()
        .extend_ttl(&key, min_ledgers, extend_to);

    Ok(())
}

/// Returns the admin-maintained list of approved payment tokens.
pub fn approved_tokens(env: &Env) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::ApprovedTokens)
        .unwrap_or_else(|| Vec::new(env))
}

fn save_approved_tokens(env: &Env, tokens: &Vec<Address>) {
    env.storage()
        .persistent()
        .set(&DataKey::ApprovedTokens, tokens);
}

/// Returns `true` when `token` is present in the approved-token registry.
pub fn is_token_whitelisted(env: &Env, token: &Address) -> bool {
    let tokens = approved_tokens(env);
    for i in 0..tokens.len() {
        if tokens.get(i).unwrap() == *token {
            return true;
        }
    }
    false
}

/// Rejects `token` unless it appears in the approved-token registry.
pub fn require_token_whitelisted(env: &Env, token: &Address) -> Result<(), Error> {
    if is_token_whitelisted(env, token) {
        Ok(())
    } else {
        Err(Error::TokenNotWhitelisted)
    }
}

/// Appends `token` to the approved-token registry.
pub fn add_approved_token(env: &Env, token: Address) -> Result<(), Error> {
    let mut tokens = approved_tokens(env);
    for i in 0..tokens.len() {
        if tokens.get(i).unwrap() == token {
            return Err(Error::TokenAlreadyWhitelisted);
        }
    }
    tokens.push_back(token);
    save_approved_tokens(env, &tokens);
    Ok(())
}

/// Removes `token` from the approved-token registry.
pub fn remove_approved_token(env: &Env, token: Address) -> Result<(), Error> {
    let tokens = approved_tokens(env);
    let mut next = Vec::new(env);
    let mut found = false;
    for i in 0..tokens.len() {
        let entry = tokens.get(i).unwrap();
        if entry == token {
            found = true;
        } else {
            next.push_back(entry);
        }
    }
    if !found {
        return Err(Error::TokenNotInWhitelist);
    }
    save_approved_tokens(env, &next);
    Ok(())
}
