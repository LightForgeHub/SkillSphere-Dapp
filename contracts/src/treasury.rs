//! Anti-spam session deposit — configurable per-session burn to the insurance fund.
//!
//! A small, non-refundable deposit is required when creating any new session.
//! The deposit is transferred to the contract and credited to the insurance-vault
//! balance so it cannot be withdrawn by the seeker and acts as a deterrent against
//! bot-driven session spam.
//!
//! ## Storage keys (defined in `lib.rs` DataKey)
//! - `SpamDepositAmount` — configured deposit per session (i128, default 0 = disabled)
//!
//! ## Public functions added to `SkillSphereContract` (in `lib.rs`)
//! - `set_spam_deposit_amount(env, amount)` — FeeManager / admin only
//! - `get_spam_deposit_amount(env)` — returns the current deposit requirement

use soroban_sdk::{token, Address, Env};

use crate::{DataKey, Error};

/// Default spam deposit: 0 (disabled until explicitly configured by admin).
pub const DEFAULT_SPAM_DEPOSIT_AMOUNT: i128 = 0;

/// Returns the currently-configured anti-spam deposit amount.
pub fn spam_deposit_amount(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::SpamDepositAmount)
        .unwrap_or(DEFAULT_SPAM_DEPOSIT_AMOUNT)
}

/// Persists a new anti-spam deposit amount. Callable only by admin.
pub fn set_spam_deposit_amount(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&DataKey::SpamDepositAmount, &amount);
}

/// Collects the anti-spam deposit from `seeker` and credits it to the
/// insurance vault balance.
///
/// If `spam_deposit_amount` is 0 this is a no-op. Returns
/// `Error::InsufficientAntiSpamDeposit` when the seeker's token balance
/// cannot cover the deposit. The deposit is separate from the session
/// escrow and does not count toward `session.balance`.
pub fn collect_spam_deposit(
    env: &Env,
    seeker: &Address,
    token: &Address,
) -> Result<(), Error> {
    let deposit = spam_deposit_amount(env);
    if deposit == 0 {
        return Ok(());
    }

    let token_client = token::Client::new(env, token);
    if token_client.balance(seeker) < deposit {
        return Err(Error::InsufficientAntiSpamDeposit);
    }

    // Transfer deposit into the contract.
    token_client.transfer(seeker, &env.current_contract_address(), &deposit);

    // Credit to the insurance vault balance (stays in contract until withdrawn).
    let mut vault_bal: i128 = env
        .storage()
        .instance()
        .get(&DataKey::InsuranceVaultBalance(token.clone()))
        .unwrap_or(0i128);
    vault_bal = vault_bal.saturating_add(deposit);
    env.storage()
        .instance()
        .set(&DataKey::InsuranceVaultBalance(token.clone()), &vault_bal);

    Ok(())
}
