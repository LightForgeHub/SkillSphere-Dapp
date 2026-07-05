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

use soroban_sdk::{contracttype, symbol_short, token, Address, Env, Vec};

use crate::{dex, events, DataKey, DataKeyExt, Error};

#[contracttype]
#[derive(Clone)]
pub enum TreasuryKey {
    SpamDepositAmount,
}

/// Default spam deposit: 0 (disabled until explicitly configured by admin).
pub const DEFAULT_SPAM_DEPOSIT_AMOUNT: i128 = 0;

/// Returns the currently-configured anti-spam deposit amount.
pub fn spam_deposit_amount(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&TreasuryKey::SpamDepositAmount)
        .unwrap_or(DEFAULT_SPAM_DEPOSIT_AMOUNT)
}

/// Persists a new anti-spam deposit amount. Callable only by admin.
pub fn set_spam_deposit_amount(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&TreasuryKey::SpamDepositAmount, &amount);
}

/// Collects the anti-spam deposit from `seeker` and credits it to the
/// insurance vault balance.
///
/// If `spam_deposit_amount` is 0 this is a no-op. Returns
/// `Error::AmountBelowMinimum` when the seeker's token balance
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
        return Err(Error::AmountBelowMinimum);
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

// ---------------------------------------------------------------------------
// Issue #286 — Fee Auto-Conversion (SKILL token buyback)
// ---------------------------------------------------------------------------

/// Swap `fee_amount` of `source_token` into the SKILL governance token via
/// the configured DEX, crediting the acquired tokens back to the contract.
///
/// # Errors
/// - `BuybackDisabled` — fee buyback is not enabled by admin.
/// - `SkillTokenNotSet` — no SKILL token address has been configured.
/// - `ContractUnset` — no DEX contract address has been configured.
/// - `SwapFailed` — the DEX returned zero or negative output.
/// - `SlippageExceeded` — actual output deviates from `expected_skill_out`
///   beyond the configured slippage tolerance.
pub fn convert_fees_to_skill(
    env: &Env,
    fee_amount: i128,
    source_token: Address,
    expected_skill_out: i128,
) -> Result<i128, Error> {
    let enabled: bool = env
        .storage()
        .instance()
        .get(&DataKeyExt::FeeBuybackEnabled)
        .unwrap_or(false);
    if !enabled {
        return Err(Error::ProtocolPaused);
    }

    let skill_token: Address = env
        .storage()
        .instance()
        .get(&DataKeyExt::SkillTokenAddress)
        .ok_or(Error::ContractUnset)?;

    let dex_contract: Address = env
        .storage()
        .instance()
        .get(&symbol_short!("dex_addr"))
        .ok_or(Error::ContractUnset)?;

    let slippage_bps: u32 = env
        .storage()
        .instance()
        .get(&DataKeyExt::FeeBuybackSlippageBps)
        .unwrap_or(100u32);

    let path: Vec<Address> = Vec::new(env);
    let received = dex::cross_contract_swap(
        env,
        &dex_contract,
        &source_token,
        &skill_token,
        &path,
        fee_amount,
    );

    if received <= 0 {
        return Err(Error::SwapFailed);
    }

    dex::check_slippage(expected_skill_out, received, slippage_bps)?;

    events::publish_event(
        env,
        events::event_type::fee_buyback(),
        0,
        (source_token, skill_token, fee_amount, received),
    );

    Ok(received)
}
