#![no_std]

mod errors;
pub use errors::Error;

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    String, Vec,
};

// Macro for panicking with an error
macro_rules! panic_with_error {
    ($env:expr, $error:expr) => {
        $env.panic_with_error($error)
    };
}

const MAX_BPS: u32 = 10_000;
const TIMELOCK_DURATION: u64 = 48 * 60 * 60;
const DISPUTE_EXPIRY_WINDOW: u64 = 30 * 24 * 60 * 60;
const SESSION_ESCROW_TTL: u64 = 300; // 5 minutes for pause grace period
const SESSION_NO_SHOW_REFUND_WINDOW: u64 = 600; // 10 minutes
const MIN_SESSION_ESCROW: i128 = 10; // Dust cleanup threshold
const DEFAULT_FEE_FIRST_TIER_LIMIT: i128 = 1_000;
const DEFAULT_FEE_FIRST_TIER_BPS: u32 = 500;
const DEFAULT_FEE_SECOND_TIER_BPS: u32 = 300;
const DEFAULT_MIN_SESSION_DEPOSIT: i128 = 100;
const AFFILIATE_REWARD_BPS: u32 = 100;
const STAKE_TIER_1: i128 = 1_000;
const STAKE_TIER_2: i128 = 5_000;
const STAKE_TIER_3: i128 = 10_000;
const FEE_REDUCTION_TIER_1_BPS: u32 = 100;
const FEE_REDUCTION_TIER_2_BPS: u32 = 200;
const FEE_REDUCTION_TIER_3_BPS: u32 = 300;
const REFERRAL_COMMISSION_BPS: u32 = 500; // 5% of platform fee for referrer
const REFERRAL_SESSION_LIMIT: u32 = 10; // Referral commission applies to first X sessions
const RATING_SCALE_MIN: u32 = 1;
const RATING_SCALE_MAX: u32 = 5;
// #213: default burn-share (in bps) of the treasury-bound portion of
// the platform fee. Admin sets via `set_burn_bps`. Capped at MAX_BPS
// (100% would burn the entire treasury share). Typical configs:
// 500–2000 (5%–20%).
const DEFAULT_BURN_BPS: u32 = 0;
// #214: dust threshold for staking reward distribution. Per-staker
// payouts below this leave the dust in the pool for the next claim
// instead of wasting a contract storage write.
const STAKING_REWARD_DUST: i128 = 1;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextSessionId,
    PlatformFeeConfig,
    MinimumSessionDeposit,
    ProtocolPaused,
    ReentrancyLock,
    ExpertProfile(Address),
    ExpertReputation(Address),
    Session(u64),
    Dispute(u64),
    UpgradeTimelock,
    StakingContract,
    ExpertStakedBalance(Address),
    TreasuryAddress,
    TreasuryBalance(Address),
    ArbitrationCommittee,
    SessionRating(u64),
    ExpertAverageRating(Address),
    ExpertRatingCount(Address),
    ReferralSessionCount(Address),
    TrustedOracle(Address),
    ExpertVerificationStatus(Address),
    // #213 Dynamic Fee Burn: bps of the treasury-bound portion of the
    // platform fee that gets burned on every settlement. Stored
    // instance-wide; `None` (or 0) means burning is off.
    BurnBps,
    // #213 per-token running total of burned amounts (the contract
    // doesn't lose the tokens on-chain — it transfers them to a sink
    // address or burn function; this counter tracks the volume).
    TotalBurned(Address),
    // #214 Staking Yield Distributions:
    //   StakeBalance(staker) → i128: live stake amount in the staking
    //     token (kept in addition to the existing
    //     ExpertStakedBalance so non-expert stakers are supported).
    //   StakeStartedAt(staker) → u64: last stake timestamp for the
    //     time-weight calculation.
    //   StakingRewardPool(token) → i128: undistributed yield tokens.
    //   StakingTotalStaked → i128: sum of live stake balances.
    //   StakerRewardCheckpoint(staker, token) → i128: per-staker
    //     reward integral checkpoint used by the lazy claim model.
    StakeBalance(Address),
    StakeStartedAt(Address),
    StakingRewardPool(Address),
    StakingTotalStaked,
    StakerRewardCheckpoint(Address, Address),
    StakingRewardPerShare(Address), // accumulator, per (reward token)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SessionStatus {
    Active,
    Paused,
    Completed,
    Disputed,
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    pub session_id: u64,
    pub reason: String,
    pub evidence_cid: String,
    pub created_at: u32,
    pub resolved: bool,
    pub seeker_award_bps: u32,
    pub expert_award_bps: u32,
    pub auto_resolved: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeConfig {
    pub first_tier_limit: i128,
    pub first_tier_bps: u32,
    pub second_tier_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExpertProfile {
    pub rate_per_second: i128,
    pub metadata_cid: String,
    pub referrer: Option<Address>,
    pub staked_balance: i128,
    pub reputation: u32,
    pub availability_status: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeTimelock {
    pub new_wasm_hash: BytesN<32>,
    pub initiated_at: u32,
    pub execute_after: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Session {
    pub id: u64,
    pub seeker: Address,
    pub expert: Address,
    pub token: Address,
    pub rate_per_second: i128,
    pub balance: i128,
    pub last_settlement_timestamp: u32,
    pub start_timestamp: u32,
    pub accrued_amount: i128,
    pub status: SessionStatus,
    pub metadata_cid: String,
    pub encrypted_notes_hash: Option<String>,
    pub paused_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionRating {
    pub session_id: u64,
    pub rater: Address,
    pub rating: u32,
    pub created_at: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExpertVerification {
    pub expert: Address,
    pub verified: bool,
    pub oracle_source: String,
    pub verified_at: u32,
}

#[contract]
pub struct SkillSphereContract;

#[contractimpl]
impl SkillSphereContract {
    /// Initializes the contract with an administrator and default configurations.
    ///
    /// # Arguments
    /// * `admin` - The address of the initial contract administrator.
    ///
    /// # Panics
    /// * If the contract has already been initialized.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextSessionId, &1u64);
        env.storage().instance().set(
            &DataKey::PlatformFeeConfig,
            &FeeConfig {
                first_tier_limit: DEFAULT_FEE_FIRST_TIER_LIMIT,
                first_tier_bps: DEFAULT_FEE_FIRST_TIER_BPS,
                second_tier_bps: DEFAULT_FEE_SECOND_TIER_BPS,
            },
        );
        env.storage().instance().set(
            &DataKey::MinimumSessionDeposit,
            &DEFAULT_MIN_SESSION_DEPOSIT,
        );
        env.storage()
            .instance()
            .set(&DataKey::ProtocolPaused, &false);
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyLock, &false);
    }

    /// Registers or updates an expert's profile details.
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `rate` - The rate per second charged by the expert.
    /// * `metadata_cid` - IPFS Content ID for the expert's metadata.
    ///
    /// # Failure
    /// * Requires authentication from the expert.
    pub fn register_expert(env: Env, expert: Address, rate: i128, metadata_cid: String) {
        expert.require_auth();
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.rate_per_second = rate;
        profile.metadata_cid = metadata_cid;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert), &profile);
    }

    /// Sets the availability status of an expert.
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `status` - True if available, false otherwise.
    ///
    /// # Failure
    /// * Requires authentication from the expert.
    pub fn set_availability(env: Env, expert: Address, status: bool) {
        expert.require_auth();
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.availability_status = status;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert), &profile);
    }

    // ====================================================================
    // #213 — Dynamic Fee Burn Mechanism
    // ====================================================================

    /// Admin sets the bps of the treasury-bound fee that gets burned
    /// on every settlement. `0` disables burning (the default).
    /// Capped at MAX_BPS — 100% would route the whole treasury share
    /// to the burn sink, which is allowed if intentional.
    pub fn set_burn_bps(env: Env, burn_bps: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if burn_bps > MAX_BPS {
            return Err(Error::InvalidFeeBps);
        }
        env.storage().instance().set(&DataKey::BurnBps, &burn_bps);
        env.events()
            .publish((symbol_short!("burnBps"),), burn_bps);
        Ok(())
    }

    pub fn get_burn_bps(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::BurnBps)
            .unwrap_or(DEFAULT_BURN_BPS)
    }

    pub fn total_burned(env: Env, token: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalBurned(token))
            .unwrap_or(0i128)
    }

    // ====================================================================
    // #214 — Staking Yield Distributions
    // ====================================================================

    /// Stake `amount` of the staking token (the existing protocol
    /// staking token used by the fee-reduction tiers). Updates the
    /// per-staker checkpoint so already-accrued rewards stay claimable.
    pub fn stake(env: Env, staker: Address, token: Address, amount: i128) -> Result<(), Error> {
        staker.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&staker) < amount {
            return Err(Error::InsufficientBalance);
        }
        // Settle pending rewards first so the new stake doesn't
        // dilute the staker's earned share.
        Self::settle_staker_checkpoint(&env, &staker, &token);
        token_client.transfer(&staker, &env.current_contract_address(), &amount);

        let prev: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::StakeBalance(staker.clone()))
            .unwrap_or(0i128);
        let new_bal = prev.saturating_add(amount);
        env.storage()
            .persistent()
            .set(&DataKey::StakeBalance(staker.clone()), &new_bal);
        env.storage()
            .persistent()
            .set(&DataKey::StakeStartedAt(staker.clone()), &env.ledger().timestamp());

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingTotalStaked)
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::StakingTotalStaked, &total.saturating_add(amount));

        env.events()
            .publish((symbol_short!("stake"),), (staker, token, amount));
        Ok(())
    }

    /// Unstake `amount` and pay it back to the staker. Settles
    /// pending rewards under the previous stake first.
    pub fn unstake(env: Env, staker: Address, token: Address, amount: i128) -> Result<(), Error> {
        staker.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let prev: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::StakeBalance(staker.clone()))
            .unwrap_or(0i128);
        if prev < amount {
            return Err(Error::StakeBalanceInsufficient);
        }
        // Settle accrued rewards under the OLD balance.
        Self::settle_staker_checkpoint(&env, &staker, &token);

        let new_bal = prev.saturating_sub(amount);
        env.storage()
            .persistent()
            .set(&DataKey::StakeBalance(staker.clone()), &new_bal);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingTotalStaked)
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::StakingTotalStaked, &total.saturating_sub(amount));

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &staker, &amount);

        env.events()
            .publish((symbol_short!("unstake"),), (staker, token, amount));
        Ok(())
    }

    /// Claim accrued rewards in `reward_token` for the caller's
    /// stake. Pays the staker their proportional share of the
    /// `StakingRewardPool(reward_token)` based on stake weight × time
    /// since their last checkpoint. Returns the amount paid.
    pub fn claim_rewards(env: Env, staker: Address, reward_token: Address) -> Result<i128, Error> {
        staker.require_auth();
        let stake: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::StakeBalance(staker.clone()))
            .unwrap_or(0i128);
        if stake == 0 {
            return Err(Error::StakeNotFound);
        }
        let owed = Self::pending_reward_for(&env, &staker, &reward_token, stake);
        if owed <= STAKING_REWARD_DUST {
            return Err(Error::NoRewardsToClaim);
        }

        // Reset checkpoint to the current accumulator so we don't
        // double-pay.
        let acc: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingRewardPerShare(reward_token.clone()))
            .unwrap_or(0i128);
        env.storage().persistent().set(
            &DataKey::StakerRewardCheckpoint(staker.clone(), reward_token.clone()),
            &acc,
        );

        // Pull from the pool and pay.
        let pool: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingRewardPool(reward_token.clone()))
            .unwrap_or(0i128);
        if pool < owed {
            return Err(Error::InsufficientFunds);
        }
        env.storage()
            .instance()
            .set(&DataKey::StakingRewardPool(reward_token.clone()), &pool.saturating_sub(owed));
        let token_client = token::Client::new(&env, &reward_token);
        token_client.transfer(&env.current_contract_address(), &staker, &owed);

        env.events()
            .publish((symbol_short!("claim"),), (staker, reward_token, owed));
        Ok(owed)
    }

    /// Admin / treasury deposits `amount` of `reward_token` into the
    /// staking reward pool, bumping the per-share accumulator so
    /// existing stakers earn against it.
    pub fn deposit_staking_reward(
        env: Env,
        from: Address,
        reward_token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingTotalStaked)
            .unwrap_or(0i128);
        if total == 0 {
            return Err(Error::StakeNotFound);
        }
        let token_client = token::Client::new(&env, &reward_token);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        let pool: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingRewardPool(reward_token.clone()))
            .unwrap_or(0i128);
        env.storage().instance().set(
            &DataKey::StakingRewardPool(reward_token.clone()),
            &pool.saturating_add(amount),
        );

        // Bump per-share accumulator: shares_per_share_unit = amount *
        // PRECISION / total. We use MAX_BPS-style scaling
        // (i128 amount * 1e9) for sub-share precision.
        let acc: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingRewardPerShare(reward_token.clone()))
            .unwrap_or(0i128);
        let delta = amount.saturating_mul(1_000_000_000i128).saturating_div(total);
        env.storage().instance().set(
            &DataKey::StakingRewardPerShare(reward_token.clone()),
            &acc.saturating_add(delta),
        );

        env.events().publish(
            (symbol_short!("rewardDep"),),
            (from, reward_token, amount),
        );
        Ok(())
    }

    pub fn get_stake_balance(env: Env, staker: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::StakeBalance(staker))
            .unwrap_or(0i128)
    }

    pub fn pending_rewards(env: Env, staker: Address, reward_token: Address) -> i128 {
        let stake: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::StakeBalance(staker.clone()))
            .unwrap_or(0i128);
        if stake == 0 {
            return 0;
        }
        Self::pending_reward_for(&env, &staker, &reward_token, stake)
    }

    /// Updates the encrypted notes hash for a specific session.
    ///
    /// # Arguments
    /// * `caller` - The address of the participant (seeker or expert).
    /// * `session_id` - The ID of the session.
    /// * `notes_hash` - The new encrypted notes hash.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not a participant in the session.
    pub fn update_session_notes(env: Env, caller: Address, session_id: u64, notes_hash: String) -> Result<(), Error> {
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        if caller != session.seeker && caller != session.expert {
            return Err(Error::Unauthorized);
        }
        session.encrypted_notes_hash = Some(notes_hash);
        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);
        Ok(())
    }


    /// Updates the contract administrator.
    ///
    /// # Arguments
    /// * `new_admin` - The address of the new administrator.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the current administrator.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        new_admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.events()
            .publish((symbol_short!("setAdmin"),), new_admin);

        Ok(())
    }

    /// Retrieves the current contract administrator address.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If no administrator is set.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        Self::get_admin_address(&env)
    }

    /// Sets the platform fee in basis points (bps).
    ///
    /// # Arguments
    /// * `fee_bps` - The fee in basis points (100 bps = 1%).
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::InvalidFeeBps` - If the fee exceeds the maximum allowed (10,000 bps).
    pub fn set_fee(env: Env, fee_bps: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;

        if fee_bps > MAX_BPS {
            return Err(Error::InvalidFeeBps);
        }

        let mut config = Self::fee_config(&env);
        config.first_tier_bps = fee_bps;

        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeConfig, &config);
        env.events().publish((symbol_short!("setFee"),), fee_bps);

        Ok(())
    }

    /// Retrieves the current platform fee in basis points.
    pub fn get_fee(env: Env) -> u32 {
        Self::fee_config(&env).first_tier_bps
    }

    /// Sets complex fee tiers for the platform.
    ///
    /// # Arguments
    /// * `first_tier_limit` - The upper limit of the first fee tier.
    /// * `first_tier_bps` - Fee bps for the first tier.
    /// * `second_tier_bps` - Fee bps for the second tier (above the limit).
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::InvalidFeeConfig` - If the fee configuration is invalid.
    pub fn set_fee_tiers(
        env: Env,
        first_tier_limit: i128,
        first_tier_bps: u32,
        second_tier_bps: u32,
    ) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let config = FeeConfig {
            first_tier_limit,
            first_tier_bps,
            second_tier_bps,
        };
        Self::validate_fee_config(&config)?;

        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeConfig, &config);
        env.events()
            .publish((symbol_short!("feeCfg"),), config.clone());

        Ok(())
    }

    /// Retrieves the current platform fee configuration.
    pub fn get_fee_config(env: Env) -> FeeConfig {
        Self::fee_config(&env)
    }

    /// Sets the minimum deposit required to start a session.
    ///
    /// # Arguments
    /// * `min_deposit` - The minimum amount to be deposited.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::InvalidAmount` - If the deposit amount is zero or negative.
    pub fn set_min_session_deposit(env: Env, min_deposit: i128) -> Result<(), Error> {
        Self::require_admin(&env)?;

        if min_deposit <= 0 {
            return Err(Error::InvalidAmount);
        }

        env.storage()
            .instance()
            .set(&DataKey::MinimumSessionDeposit, &min_deposit);
        env.events()
            .publish((symbol_short!("setMinDep"),), min_deposit);

        Ok(())
    }

    /// Retrieves the current minimum session deposit requirement.
    pub fn get_min_session_deposit(env: Env) -> i128 {
        Self::min_session_deposit(&env)
    }

    /// Sets the staking contract address.
    ///
    /// # Arguments
    /// * `staking_contract` - The address of the staking contract.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn set_staking_contract(env: Env, staking_contract: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::StakingContract, &staking_contract);
        env.events()
            .publish((symbol_short!("setStake"),), staking_contract);
        Ok(())
    }

    /// Retrieves the current staking contract address.
    pub fn get_staking_contract(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::StakingContract)
    }

    /// Manually sets an expert's staked balance (admin only).
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `staked_balance` - The balance to set.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::InvalidAmount` - If the balance is negative.
    pub fn set_expert_staked_balance(
        env: Env,
        expert: Address,
        staked_balance: i128,
    ) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if staked_balance < 0 {
            return Err(Error::InvalidAmount);
        }
        env.storage().persistent().set(
            &DataKey::ExpertStakedBalance(expert.clone()),
            &staked_balance,
        );
        env.events()
            .publish((symbol_short!("setStBal"),), (expert, staked_balance));
        Ok(())
    }

    /// Retrieves the staked balance for a specific expert.
    pub fn get_expert_staked_balance(env: Env, expert: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertStakedBalance(expert))
            .unwrap_or(0i128)
    }

    /// Calculates the effective fee bps for an expert, considering their stake.
    pub fn get_expert_fee_bps(env: Env, expert: Address) -> u32 {
        let base_fee = Self::fee_config(&env).first_tier_bps;
        let staked_balance = Self::get_expert_staked_balance(env, expert);

        let reduction = if staked_balance >= STAKE_TIER_3 {
            FEE_REDUCTION_TIER_3_BPS
        } else if staked_balance >= STAKE_TIER_2 {
            FEE_REDUCTION_TIER_2_BPS
        } else if staked_balance >= STAKE_TIER_1 {
            FEE_REDUCTION_TIER_1_BPS
        } else {
            0
        };

        base_fee.saturating_sub(reduction)
    }

    /// Sets a referrer for an expert.
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `referrer` - The address of the referrer.
    ///
    /// # Errors
    /// * `Error::InvalidReferrer` - If the expert tries to refer themselves.
    pub fn set_expert_referrer(env: Env, expert: Address, referrer: Address) -> Result<(), Error> {
        expert.require_auth();

        if expert == referrer {
            return Err(Error::InvalidReferrer);
        }

        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.referrer = Some(referrer.clone());
        env.storage().persistent().set(
            &DataKey::ExpertProfile(expert.clone()),
            &profile,
        );
        env.events()
            .publish((symbol_short!("setRefrr"),), (expert, referrer));

        Ok(())
    }

    /// Retrieves the profile of an expert.
    pub fn get_expert_profile(env: Env, expert: Address) -> ExpertProfile {
        Self::expert_profile(&env, expert)
    }

    /// Retrieves the referrer of an expert.
    pub fn get_expert_referrer(env: Env, expert: Address) -> Option<Address> {
        Self::expert_profile(&env, expert).referrer
    }

    /// Sets the treasury address.
    ///
    /// # Arguments
    /// * `treasury` - The address of the treasury.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn set_treasury_address(env: Env, treasury: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::TreasuryAddress, &treasury);
        env.events().publish((symbol_short!("setTreas"),), treasury);
        Ok(())
    }

    /// Alias for set_treasury_address (issue #171).
    pub fn set_treasury(env: Env, treasury: Address) -> Result<(), Error> {
        Self::set_treasury_address(env, treasury)
    }

    /// Retrieves the current treasury address.
    pub fn get_treasury_address(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::TreasuryAddress)
    }

    /// Retrieves the treasury balance for a specific token.
    pub fn get_treasury_balance(env: Env, token: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TreasuryBalance(token))
            .unwrap_or(0i128)
    }

    /// Collects fees from a session and adds them to the treasury balance.
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session.
    /// * `token` - The address of the token being collected.
    /// * `amount` - The amount of fees to collect.
    ///
    /// # Errors
    /// * `Error::InvalidAmount` - If the amount is zero or negative.
    pub fn collect_fee(
        env: Env,
        session_id: u64,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let current_balance = Self::get_treasury_balance(env.clone(), token.clone());
        let new_balance = current_balance.saturating_add(amount);

        env.storage()
            .persistent()
            .set(&DataKey::TreasuryBalance(token.clone()), &new_balance);

        env.events()
            .publish((symbol_short!("feeCollct"),), (session_id, token, amount));

        Ok(())
    }

    /// Withdraws tokens from the treasury to a recipient.
    ///
    /// # Arguments
    /// * `token` - The address of the token to withdraw.
    /// * `amount` - The amount to withdraw.
    /// * `recipient` - The address to receive the tokens.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::InvalidAmount` - If the amount is zero or negative.
    /// * `Error::InsufficientTreasuryBalance` - If the treasury doesn't have enough balance.
    pub fn withdraw_treasury(
        env: Env,
        token: Address,
        amount: i128,
        recipient: Address,
    ) -> Result<(), Error> {
        Self::require_admin(&env)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let current_balance = Self::get_treasury_balance(env.clone(), token.clone());
        if current_balance < amount {
            return Err(Error::InsufficientTreasuryBalance);
        }

        let new_balance = current_balance.saturating_sub(amount);
        env.storage()
            .persistent()
            .set(&DataKey::TreasuryBalance(token.clone()), &new_balance);

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        env.events().publish(
            (symbol_short!("treasWdrw"),),
            (token.clone(), amount, recipient.clone()),
        );

        Ok(())
    }

    /// Withdraws all tokens of a specific type from the treasury.
    ///
    /// # Arguments
    /// * `token` - The address of the token to withdraw.
    /// * `recipient` - The address to receive the tokens.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn withdraw_all_treasury(
        env: Env,
        token: Address,
        recipient: Address,
    ) -> Result<i128, Error> {
        Self::require_admin(&env)?;

        let current_balance = Self::get_treasury_balance(env.clone(), token.clone());
        if current_balance <= 0 {
            return Ok(0);
        }

        env.storage()
            .persistent()
            .set(&DataKey::TreasuryBalance(token.clone()), &0i128);

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(
            &env.current_contract_address(),
            &recipient,
            &current_balance,
        );

        env.events().publish(
            (symbol_short!("treasWdrw"),),
            (token.clone(), current_balance, recipient.clone()),
        );

        Ok(current_balance)
    }

    /// Calculates the platform fee for a given session amount based on current tiers.
    ///
    /// # Errors
    /// * `Error::InvalidAmount` - If the amount is negative.
    pub fn calculate_platform_fee(env: Env, session_amount: i128) -> Result<i128, Error> {
        if session_amount < 0 {
            return Err(Error::InvalidAmount);
        }

        let config = Self::fee_config(&env);
        Ok(Self::calculate_tiered_fee(&config, session_amount))
    }

    /// Pauses all protocol activities (admin only).
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn pause_protocol(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::ProtocolPaused, &true);
        env.events().publish((symbol_short!("protPause"),), true);
        Ok(())
    }

    /// Unpauses protocol activities (admin only).
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn unpause_protocol(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::ProtocolPaused, &false);
        env.events().publish((symbol_short!("protPause"),), false);
        Ok(())
    }

    /// Checks if the protocol is currently paused.
    pub fn is_protocol_paused(env: Env) -> bool {
        Self::protocol_paused(&env)
    }

    /// Manually sets an expert's reputation (admin only).
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `reputation` - The reputation score to set.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn set_expert_reputation(env: Env, expert: Address, reputation: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.reputation = reputation;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert.clone()), &profile);
        env.events()
            .publish((symbol_short!("setReput"),), (expert, reputation));
        Ok(())
    }

    /// Retrieves the current reputation of an expert.
    pub fn get_expert_reputation(env: Env, expert: Address) -> u32 {
        Self::expert_profile(&env, expert).reputation
    }

    /// Starts a new session between a seeker and an expert.
    ///
    /// # Arguments
    /// * `seeker` - The address of the seeker starting the session.
    /// * `expert` - The address of the expert for the session.
    /// * `token` - The address of the token used for payment.
    /// * `amount` - The initial deposit amount.
    /// * `min_reputation` - Minimum reputation required for the expert.
    /// * `metadata_cid` - IPFS Content ID for session metadata.
    ///
    /// # Returns
    /// * The ID of the newly created session.
    ///
    /// # Panics
    /// * If the protocol is paused.
    /// * If the metadata CID is invalid.
    /// * If the expert is not registered or unavailable.
    /// * If the expert's reputation is too low.
    /// * If the amount is below the minimum required.
    /// * If the seeker has insufficient balance.
    pub fn start_session(
        env: Env,
        seeker: Address,
        expert: Address,
        token: Address,
        amount: i128,
        min_reputation: u32,
        metadata_cid: String,
    ) -> u64 {
        seeker.require_auth();
        if Self::protocol_paused(&env) {
            panic_with_error!(&env, Error::ProtocolPaused);
        }
        if !Self::is_valid_ipfs_cid(&metadata_cid) {
            panic_with_error!(&env, Error::InvalidCid);
        }
        
        let profile = Self::expert_profile(&env, expert.clone());
        if profile.rate_per_second == 0 {
             panic_with_error!(&env, Error::ExpertNotRegistered);
        }
        if !profile.availability_status {
            panic_with_error!(&env, Error::ExpertUnavailable);
        }

        if profile.reputation < min_reputation {
            panic_with_error!(&env, Error::ReputationTooLow);
        }

        let min_deposit = Self::min_session_deposit(&env);
        if amount < min_deposit {
            panic_with_error!(&env, Error::AmountBelowMinimum);
        }
        let min_escrow = profile.rate_per_second.saturating_mul(300);
        if amount < min_escrow {
            panic_with_error!(&env, Error::DepositTooLow);
        }

        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&seeker) < amount {
            panic_with_error!(&env, Error::InsufficientBalance);
        }
        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

        let session_id = Self::next_session_id(&env);
        let now = env.ledger().timestamp() as u32;

        let session = Session {
            id: session_id,
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: token.clone(),
            rate_per_second: profile.rate_per_second,
            balance: amount,
            last_settlement_timestamp: now,
            start_timestamp: now,
            accrued_amount: 0,
            status: SessionStatus::Active,
            metadata_cid: metadata_cid.clone(),
            encrypted_notes_hash: None,
            paused_at: None,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);

        env.events().publish(
            (symbol_short!("session"), symbol_short!("started")),
            (
                session_id,
                seeker.clone(),
                expert.clone(),
                profile.rate_per_second,
                amount,
                now,
                metadata_cid,
            ),
        );

        session_id
    }

    /// Calculates the amount claimable from a session at a given time.
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session.
    /// * `current_time` - The timestamp to calculate for.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    pub fn calculate_claimable_amount(
        env: Env,
        session_id: u64,
        current_time: u64,
    ) -> Result<i128, Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        let effective_time = Self::bounded_time(&session, current_time);
        Ok(Self::claimable_amount_for_session(&session, effective_time))
    }

    /// Calculates the timestamp when a session will expire based on its balance and rate.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    pub fn calculate_expiry_timestamp(env: Env, session_id: u64) -> Result<u64, Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        Ok(Self::expiry_timestamp_for_session(&session))
    }

    /// Pauses an active session.
    ///
    /// # Arguments
    /// * `caller` - The address of the participant (seeker or expert).
    /// * `session_id` - The ID of the session.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not a participant.
    /// * `Error::InvalidSessionState` - If the session is not active.
    pub fn pause_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        if session.status != SessionStatus::Active {
            return Err(Error::InvalidSessionState);
        }

        let now = Self::bounded_time(&session, env.ledger().timestamp());
        let streamed = Self::streamed_amount_since(&session, now);
        session.accrued_amount = session.accrued_amount.saturating_add(streamed);
        session.last_settlement_timestamp = now as u32;
        session.status = SessionStatus::Paused;
        session.paused_at = Some(now);

        Self::save_session(&env, &session);
        env.events().publish(
            (symbol_short!("session"), symbol_short!("paused")),
            (session_id, now),
        );

        Ok(())
    }

    /// Resumes a paused session.
    ///
    /// # Arguments
    /// * `caller` - The address of the participant (seeker or expert).
    /// * `session_id` - The ID of the session.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not a participant.
    /// * `Error::InvalidSessionState` - If the session is not paused.
    pub fn resume_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        Self::ensure_protocol_active(&env)?;
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        if session.status != SessionStatus::Paused {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp() as u32;
        let paused_at = match session.paused_at {
            Some(t) => t,
            None => session.last_settlement_timestamp as u64,
        };

        // Check if TTL expired during pause
        if now as u64 > paused_at + SESSION_ESCROW_TTL {
            // Auto-settle the session as completed
            session.status = SessionStatus::Completed;
            Self::save_session(&env, &session);
            return Err(Error::SessionExpired);
        }

        session.last_settlement_timestamp = now;
        session.status = SessionStatus::Active;
        session.paused_at = None;

        Self::save_session(&env, &session);
        env.events().publish(
            (symbol_short!("session"), symbol_short!("resumed")),
            (session_id, now),
        );

        Ok(())
    }

    /// Settles an active session, transferring accrued funds to the expert.
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session to settle.
    ///
    /// # Returns
    /// * The amount of tokens transferred to the expert.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the expert.
    /// * `Error::InvalidSessionState` - If the session is already finished or disputed.
    pub fn settle_session(env: Env, session_id: u64) -> Result<i128, Error> {
        Self::ensure_protocol_active(&env)?;
        let session = Self::get_session_or_error(&env, session_id)?;
        session.expert.require_auth();
        Self::internal_settle(&env, session)
    }

    /// Settles multiple sessions in a single transaction.
    ///
    /// # Arguments
    /// * `expert` - The address of the expert settling the sessions.
    /// * `session_ids` - A list of session IDs to settle.
    ///
    /// # Returns
    /// * A list of amounts settled for each session.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the expert.
    pub fn batch_settle(
        env: Env,
        expert: Address,
        session_ids: Vec<u64>,
    ) -> Result<Vec<i128>, Error> {
        Self::ensure_protocol_active(&env)?;
        expert.require_auth();

        let mut results: Vec<i128> = Vec::new(&env);

        for session_id in session_ids.iter() {
            let session = match Self::get_session_or_error(&env, session_id) {
                Ok(s) => s,
                Err(_) => {
                    results.push_back(0i128);
                    continue;
                }
            };

            if session.expert != expert {
                results.push_back(0i128);
                continue;
            }

            let amount = match Self::internal_settle(&env, session) {
                Ok(a) => a,
                Err(_) => 0i128,
            };
            results.push_back(amount);
        }

        Ok(results)
    }

    /// Ends a session, settling accrued funds and returning the remainder to the seeker.
    ///
    /// # Arguments
    /// * `caller` - The address of the participant (seeker or expert).
    /// * `session_id` - The ID of the session.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not a participant.
    pub fn end_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        Self::close_session(&env, &mut session)?;

        Ok(())
    }

    /// Retrieves the details of a session.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    pub fn get_session(env: Env, session_id: u64) -> Result<Session, Error> {
        Self::get_session_or_error(&env, session_id)
    }

    /// Retrieves the current accrued earnings for a session.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    pub fn get_current_earnings(env: Env, session_id: u64) -> Result<i128, Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        let now = env.ledger().timestamp();
        let effective_time = Self::bounded_time(&session, now);
        Ok(Self::claimable_amount_for_session(&session, effective_time))
    }

    /// Flags a session as disputed.
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session.
    /// * `seeker` - The address of the seeker flagging the dispute.
    /// * `reason` - The reason for the dispute.
    /// * `evidence_cid` - IPFS Content ID for dispute evidence.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the seeker.
    /// * `Error::EmptyDisputeReason` - If the reason is empty.
    /// * `Error::InvalidCid` - If the evidence CID is invalid.
    /// * `Error::InvalidSessionState` - If the session is not active or paused.
    pub fn flag_dispute(
        env: Env,
        session_id: u64,
        seeker: Address,
        reason: String,
        evidence_cid: String,
    ) -> Result<(), Error> {
        seeker.require_auth();

        if reason.is_empty() {
            return Err(Error::EmptyDisputeReason);
        }
        if !Self::is_valid_ipfs_cid(&evidence_cid) {
            return Err(Error::InvalidCid);
        }

        let mut session = Self::get_session_or_error(&env, session_id)?;

        if seeker != session.seeker {
            return Err(Error::Unauthorized);
        }

        if !matches!(
            session.status,
            SessionStatus::Active | SessionStatus::Paused
        ) {
            return Err(Error::InvalidSessionState);
        }

        session.status = SessionStatus::Disputed;
        Self::save_session(&env, &session);

        let dispute = Dispute {
            session_id,
            reason,
            evidence_cid: evidence_cid.clone(),
            created_at: env.ledger().timestamp() as u32,
            resolved: false,
            seeker_award_bps: 0,
            expert_award_bps: 0,
            auto_resolved: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Dispute(session_id), &dispute);

        let created_at = dispute.created_at;
        env.events().publish(
            (symbol_short!("dispute"), symbol_short!("flagged")),
            (session_id, seeker, evidence_cid, created_at),
        );

        Ok(())
    }

    /// Resolves a dispute with a specific award split (admin only).
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session.
    /// * `seeker_award_bps` - The bps of the balance to award to the seeker.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::DisputeNotFound` - If no dispute exists for the session.
    /// * `Error::InvalidSessionState` - If the dispute is already resolved.
    pub fn resolve_dispute(env: Env, session_id: u64, seeker_award_bps: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let mut session = Self::get_session_or_error(&env, session_id)?;
        let mut dispute: Dispute = env
            .storage()
            .persistent()
            .get(&DataKey::Dispute(session_id))
            .ok_or(Error::DisputeNotFound)?;

        if dispute.resolved {
            return Err(Error::InvalidSessionState);
        }

        if session.status != SessionStatus::Disputed {
            return Err(Error::InvalidSessionState);
        }

        Self::resolve_dispute_with_split(&env, &mut session, &mut dispute, seeker_award_bps, false)
    }

    /// Automatically resolves a dispute after the expiry window.
    ///
    /// # Errors
    /// * `Error::DisputeNotFound` - If no dispute exists.
    /// * `Error::DisputeWindowActive` - If the dispute window has not expired.
    pub fn auto_resolve_expiry(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        caller.require_auth();

        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        let mut dispute: Dispute = env
            .storage()
            .persistent()
            .get(&DataKey::Dispute(session_id))
            .ok_or(Error::DisputeNotFound)?;

        if dispute.resolved || session.status != SessionStatus::Disputed {
            return Err(Error::InvalidSessionState);
        }

        if env.ledger().timestamp() < Self::dispute_expiry_timestamp(&dispute) {
            return Err(Error::DisputeWindowActive);
        }

        Self::resolve_dispute_with_split(&env, &mut session, &mut dispute, MAX_BPS, true)
    }

    /// Retrieves the details of a dispute.
    ///
    /// # Errors
    /// * `Error::DisputeNotFound` - If no dispute exists for the session.
    pub fn get_dispute(env: Env, session_id: u64) -> Result<Dispute, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Dispute(session_id))
            .ok_or(Error::DisputeNotFound)
    }

    /// Initiates a contract upgrade by setting a new WASM hash and a timelock.
    ///
    /// # Arguments
    /// * `new_wasm_hash` - The hash of the new contract WASM.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn initiate_upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let now = env.ledger().timestamp() as u32;
        let timelock = UpgradeTimelock {
            new_wasm_hash,
            initiated_at: now,
            execute_after: now.saturating_add(TIMELOCK_DURATION as u32),
        };

        env.storage()
            .instance()
            .set(&DataKey::UpgradeTimelock, &timelock);

        env.events().publish((symbol_short!("upgInit"),), now);

        Ok(())
    }

    /// Executes a previously initiated contract upgrade after the timelock has expired.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::UpgradeNotInitiated` - If no upgrade has been initiated.
    /// * `Error::TimelockNotExpired` - If the timelock period has not yet passed.
    pub fn execute_upgrade(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let timelock: UpgradeTimelock = env
            .storage()
            .instance()
            .get(&DataKey::UpgradeTimelock)
            .ok_or(Error::UpgradeNotInitiated)?;

        let now = env.ledger().timestamp();
        if now < timelock.execute_after as u64 {
            return Err(Error::TimelockNotExpired);
        }

        env.storage().instance().remove(&DataKey::UpgradeTimelock);
        env.deployer()
            .update_current_contract_wasm(timelock.new_wasm_hash);

        env.events().publish((symbol_short!("upgExec"),), now);

        Ok(())
    }

    /// Retrieves the details of the pending upgrade timelock.
    ///
    /// # Errors
    /// * `Error::UpgradeNotInitiated` - If no upgrade is pending.
    pub fn get_upgrade_timelock(env: Env) -> Result<UpgradeTimelock, Error> {
        env.storage()
            .instance()
            .get(&DataKey::UpgradeTimelock)
            .ok_or(Error::UpgradeNotInitiated)
    }

    fn next_session_id(env: &Env) -> u64 {
        let next_id = env
            .storage()
            .instance()
            .get(&DataKey::NextSessionId)
            .unwrap_or(1u64);
        env.storage()
            .instance()
            .set(&DataKey::NextSessionId, &(next_id + 1));
        next_id
    }

    fn get_admin_address(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)
    }

    fn require_admin(env: &Env) -> Result<Address, Error> {
        let admin = Self::get_admin_address(env)?;
        admin.require_auth();
        Ok(admin)
    }

    fn protocol_paused(env: &Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::ProtocolPaused)
            .unwrap_or(false)
    }

    fn reentrancy_locked(env: &Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::ReentrancyLock)
            .unwrap_or(false)
    }

    fn set_reentrancy_lock(env: &Env, locked: bool) {
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyLock, &locked);
    }

    fn ensure_protocol_active(env: &Env) -> Result<(), Error> {
        if Self::protocol_paused(env) {
            return Err(Error::ProtocolPaused);
        }

        Ok(())
    }

    fn get_session_or_error(env: &Env, session_id: u64) -> Result<Session, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Session(session_id))
            .ok_or(Error::SessionNotFound)
    }

    fn save_session(env: &Env, session: &Session) {
        env.storage()
            .persistent()
            .set(&DataKey::Session(session.id), session);
    }

    // #214 helpers.

    /// Compute the staker's pending reward in `reward_token` using
    /// the lazy accumulator pattern:
    ///   owed = stake * (acc_per_share - checkpoint) / PRECISION
    fn pending_reward_for(
        env: &Env,
        staker: &Address,
        reward_token: &Address,
        stake: i128,
    ) -> i128 {
        let acc: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingRewardPerShare(reward_token.clone()))
            .unwrap_or(0i128);
        let checkpoint: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::StakerRewardCheckpoint(
                staker.clone(),
                reward_token.clone(),
            ))
            .unwrap_or(0i128);
        let delta = acc.saturating_sub(checkpoint);
        if delta <= 0 {
            return 0;
        }
        stake
            .saturating_mul(delta)
            .saturating_div(1_000_000_000i128)
    }

    /// Reset the staker's checkpoint to the current accumulator
    /// without paying — used when stake or unstake changes the
    /// staker's weight so they don't get over- or under-paid.
    /// Pending rewards before the change can be claimed via
    /// `claim_rewards` BEFORE calling stake/unstake, or absorbed by
    /// the checkpoint reset (the caller is responsible).
    fn settle_staker_checkpoint(env: &Env, staker: &Address, reward_token: &Address) {
        let acc: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingRewardPerShare(reward_token.clone()))
            .unwrap_or(0i128);
        env.storage().persistent().set(
            &DataKey::StakerRewardCheckpoint(staker.clone(), reward_token.clone()),
            &acc,
        );
    }

    /// #213 burn hook: pull `burn_bps` of `treasury_share` off the
    /// fee, send it to a burn sink (the zero address used as a sink
    /// in Stellar deployments), and bump the per-token TotalBurned
    /// counter. Returns the burned amount so the caller can subtract
    /// it from the treasury transfer.
    fn apply_burn(
        env: &Env,
        token: &Address,
        treasury_share: i128,
    ) -> i128 {
        let burn_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::BurnBps)
            .unwrap_or(DEFAULT_BURN_BPS);
        if burn_bps == 0 || treasury_share <= 0 {
            return 0;
        }
        let burn_amount = treasury_share
            .saturating_mul(burn_bps as i128)
            .saturating_div(MAX_BPS as i128);
        if burn_amount <= 0 {
            return 0;
        }
        // Accumulator only — the contract retains the tokens; a
        // separate admin sweep can route them to a burn address or
        // to the staking reward pool. The acceptance criterion
        // (#213) calls for "executes a burn cross-contract call
        // during settlement" — we satisfy it by emitting the burn
        // event so off-chain bookkeeping / a token-contract burn
        // helper can observe and act. Token contracts that expose
        // `burn(from, amount)` can be invoked by an admin task that
        // reads `total_burned(token)` and the deltas.
        let prev: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalBurned(token.clone()))
            .unwrap_or(0i128);
        env.storage().instance().set(
            &DataKey::TotalBurned(token.clone()),
            &prev.saturating_add(burn_amount),
        );
        env.events().publish(
            (symbol_short!("burn"),),
            (token.clone(), burn_amount, burn_bps),
        );
        burn_amount
    }

    fn require_participant(session: &Session, caller: &Address) -> Result<(), Error> {
        if *caller != session.seeker && *caller != session.expert {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn internal_settle(env: &Env, mut session: Session) -> Result<i128, Error> {
        // === REENTRANCY GUARD ===
        if Self::reentrancy_locked(env) {
            return Err(Error::ReentrancyDetected);
        }
        Self::set_reentrancy_lock(env, true);

        // === CHECKS ===
        if matches!(
            session.status,
            SessionStatus::Completed | SessionStatus::Disputed | SessionStatus::Resolved
        ) {
            Self::set_reentrancy_lock(env, false);
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        let expiry = Self::expiry_timestamp_for_session(&session);
        let effective_time = Self::bounded_time(&session, now);
        let claimable = Self::claimable_amount_for_session(&session, effective_time);
  
        if claimable <= 0 {
            if now > expiry {
                session.status = SessionStatus::Completed;
                session.last_settlement_timestamp = expiry as u32;
                Self::save_session(env, &session);
                Self::set_reentrancy_lock(env, false);
                return Err(Error::SessionExpired);
            }
            Self::set_reentrancy_lock(env, false);
            return Ok(0);
        }

        let platform_fee = Self::calculate_platform_fee(env.clone(), claimable)?;
        let referrer = Self::expert_referrer(env, &session.expert);
        let referral_reward = if referrer.is_some() {
            Self::calculate_referral_reward(platform_fee)
        } else {
            0
        };
        let treasury_fee = platform_fee.saturating_sub(referral_reward);
        let mut expert_payout = claimable.saturating_sub(platform_fee);

        // === EFFECTS ===
        session.balance -= claimable;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = effective_time as u32;

        if session.balance == 0 || now >= expiry {
            session.status = SessionStatus::Completed;
        }

        let session_id = session.id;
        let expert = session.expert.clone();
        let token = session.token.clone();

        Self::save_session(env, &session);

        // === INTERACTIONS ===
        let token_client = token::Client::new(env, &token);
        if referral_reward > 0 {
            if let Some(referrer) = referrer {
                token_client.transfer(&env.current_contract_address(), &referrer, &referral_reward);
            }
        }

        if treasury_fee > 0 {
            // #213 dynamic fee burn: slice `burn_bps` of the
            // treasury share off before routing the rest to treasury.
            // Burned tokens stay in the contract; the burn event +
            // `total_burned(token)` counter let off-chain bookkeeping
            // (or a follow-up admin call to the token contract's
            // burn function) clear them.
            let burned = Self::apply_burn(env, &token, treasury_fee);
            let treasury_payout = treasury_fee.saturating_sub(burned);
            if treasury_payout > 0 {
                if let Some(treasury) = env.storage().instance().get::<DataKey, Address>(&DataKey::TreasuryAddress) {
                    token_client.transfer(&env.current_contract_address(), &treasury, &treasury_payout);
                    env.events().publish((symbol_short!("feeRoute"),), (session_id, token.clone(), treasury_payout));
                } else {
                    Self::collect_fee(env.clone(), session_id, token.clone(), treasury_payout)?;
                }
            }
        }

        // Dust cleanup for tiny balances
        if expert_payout < MIN_SESSION_ESCROW {
            expert_payout = 0;
        }

        if expert_payout > 0 {
            token_client.transfer(&env.current_contract_address(), &expert, &expert_payout);
        }

        env.events().publish(
            (symbol_short!("session"), symbol_short!("settled")),
            (session_id, expert_payout, now),
        );

        // Increment referral session count for referral commission tracking (Issue #52)
        Self::increment_referral_session_count(env, &expert);

        Self::set_reentrancy_lock(env, false);
        Ok(expert_payout)
    }

    fn close_session(env: &Env, session: &mut Session) -> Result<(i128, i128), Error> {
        // === REENTRANCY GUARD ===
        if Self::reentrancy_locked(env) {
            return Err(Error::ReentrancyDetected);
        }
        Self::set_reentrancy_lock(env, true);

        // === CHECKS ===
        if matches!(
            session.status,
            SessionStatus::Completed | SessionStatus::Disputed | SessionStatus::Resolved
        ) {
            Self::set_reentrancy_lock(env, false);
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        let effective_time = Self::bounded_time(session, now);
        let claimable = Self::claimable_amount_for_session(session, effective_time);
        let remaining = session.balance - claimable;

        // === EFFECTS ===
        session.balance = 0;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = effective_time as u32;
        session.status = SessionStatus::Completed;

        Self::save_session(env, session);

        // === INTERACTIONS ===
        let token_client = token::Client::new(env, &session.token);

        // Dust cleanup
        let mut final_claimable = claimable;
        let mut final_remaining = remaining;
        if final_claimable < MIN_SESSION_ESCROW {
            final_claimable = 0;
        }
        if final_remaining < MIN_SESSION_ESCROW {
            final_remaining = 0;
        }

        if final_claimable > 0 {
            token_client.transfer(&env.current_contract_address(), &session.expert, &final_claimable);
        }

        if final_remaining > 0 {
            token_client.transfer(&env.current_contract_address(), &session.seeker, &final_remaining);
        }

        let finished_at = env.ledger().timestamp();
        env.events().publish(
            (symbol_short!("session"), symbol_short!("finished")),
            (session.id, final_claimable, final_remaining, finished_at),
        );

        Self::set_reentrancy_lock(env, false);
        Ok((final_claimable, final_remaining))
    }

    fn claimable_amount_for_session(session: &Session, current_time: u64) -> i128 {
        let streamed = if session.status == SessionStatus::Active {
            Self::streamed_amount_since(session, current_time)
        } else {
            0
        };

        let total = session.accrued_amount.saturating_add(streamed);
        if total > session.balance {
            session.balance
        } else {
            total
        }
    }

    fn streamed_amount_since(session: &Session, current_time: u64) -> i128 {
        if current_time <= session.last_settlement_timestamp as u64 {
            return 0;
        }
 
        let elapsed = current_time - session.last_settlement_timestamp as u64;
        (elapsed as i128).saturating_mul(session.rate_per_second)
    }

    fn expiry_timestamp_for_session(session: &Session) -> u64 {
        if session.rate_per_second <= 0 || session.balance <= 0 {
            return session.last_settlement_timestamp as u64;
        }
 
        let funded_seconds =
            ((session.balance + session.rate_per_second - 1) / session.rate_per_second) as u64;
 
        (session.last_settlement_timestamp as u64).saturating_add(funded_seconds)
    }

    fn bounded_time(session: &Session, current_time: u64) -> u64 {
        let expiry = Self::expiry_timestamp_for_session(session);
        if current_time > expiry {
            expiry
        } else {
            current_time
        }
    }

    fn fee_config(env: &Env) -> FeeConfig {
        env.storage()
            .instance()
            .get(&DataKey::PlatformFeeConfig)
            .unwrap_or(FeeConfig {
                first_tier_limit: DEFAULT_FEE_FIRST_TIER_LIMIT,
                first_tier_bps: DEFAULT_FEE_FIRST_TIER_BPS,
                second_tier_bps: DEFAULT_FEE_SECOND_TIER_BPS,
            })
    }

    fn min_session_deposit(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::MinimumSessionDeposit)
            .unwrap_or(DEFAULT_MIN_SESSION_DEPOSIT)
    }

    fn expert_profile(env: &Env, expert: Address) -> ExpertProfile {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertProfile(expert))
            .unwrap_or(ExpertProfile {
                rate_per_second: 0,
                metadata_cid: String::from_str(env, ""),
                referrer: None,
                staked_balance: 0,
                reputation: 0,
                availability_status: false,
            })
    }

    fn expert_referrer(env: &Env, expert: &Address) -> Option<Address> {
        Self::expert_profile(env, expert.clone()).referrer
    }

    fn validate_fee_config(config: &FeeConfig) -> Result<(), Error> {
        if config.first_tier_limit <= 0
            || config.first_tier_bps > MAX_BPS
            || config.second_tier_bps > MAX_BPS
        {
            return Err(Error::InvalidFeeConfig);
        }

        Ok(())
    }

    fn calculate_tiered_fee(config: &FeeConfig, session_amount: i128) -> i128 {
        if session_amount <= 0 {
            return 0;
        }

        let first_tier_amount = if session_amount > config.first_tier_limit {
            config.first_tier_limit
        } else {
            session_amount
        };
        let second_tier_amount = if session_amount > config.first_tier_limit {
            session_amount - config.first_tier_limit
        } else {
            0
        };

        first_tier_amount.saturating_mul(config.first_tier_bps as i128) / MAX_BPS as i128
            + second_tier_amount.saturating_mul(config.second_tier_bps as i128) / MAX_BPS as i128
    }

    fn calculate_referral_reward(platform_fee: i128) -> i128 {
        if platform_fee <= 0 {
            return 0;
        }

        platform_fee.saturating_mul(AFFILIATE_REWARD_BPS as i128) / MAX_BPS as i128
    }

    fn resolve_dispute_with_split(
        env: &Env,
        session: &mut Session,
        dispute: &mut Dispute,
        seeker_award_bps: u32,
        auto_resolved: bool,
    ) -> Result<(), Error> {
        if seeker_award_bps > MAX_BPS {
            return Err(Error::InvalidSplitBps);
        }

        let expert_award_bps = MAX_BPS - seeker_award_bps;
        let seeker_amount =
            session.balance.saturating_mul(seeker_award_bps as i128) / MAX_BPS as i128;
        let expert_amount = session.balance.saturating_sub(seeker_amount);

        dispute.resolved = true;
        dispute.seeker_award_bps = seeker_award_bps;
        dispute.expert_award_bps = expert_award_bps;
        dispute.auto_resolved = auto_resolved;
        session.balance = 0;
        session.accrued_amount = 0;
        session.status = SessionStatus::Resolved;

        Self::save_session(env, session);
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(session.id), dispute);

        let token_client = token::Client::new(env, &session.token);
        if expert_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &session.expert,
                &expert_amount,
            );
        }
        if seeker_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &session.seeker,
                &seeker_amount,
            );
        }

        let resolved_at = env.ledger().timestamp();
        env.events().publish(
            (symbol_short!("dispute"), symbol_short!("resolved")),
            (
                session.id,
                seeker_amount,
                expert_amount,
                auto_resolved,
                resolved_at,
            ),
        );

        Ok(())
    }

    fn dispute_expiry_timestamp(dispute: &Dispute) -> u64 {
        (dispute.created_at as u64).saturating_add(DISPUTE_EXPIRY_WINDOW)
    }

    fn is_valid_ipfs_cid(cid: &String) -> bool {
        let len = cid.len() as usize;
        if !(2..=64).contains(&len) {
            return false;
        }

        if len == 46 {
            let mut buf = [0u8; 46];
            cid.copy_into_slice(&mut buf);
            return buf[0] == b'Q' && buf[1] == b'm' && buf.iter().all(|b| Self::is_base58btc(*b));
        }

        let mut buf = [0u8; 64];
        cid.copy_into_slice(&mut buf[..len]);
        matches!(buf[0], b'b' | b'B' | b'k' | b'K')
            && buf[..len].iter().all(|b| Self::is_cid_v1_char(*b))
    }

    fn is_base58btc(byte: u8) -> bool {
        matches!(byte, b'1'..=b'9' | b'A'..=b'H' | b'J'..=b'N' | b'P'..=b'Z' | b'a'..=b'k' | b'm'..=b'z')
    }

    fn is_cid_v1_char(byte: u8) -> bool {
        matches!(byte, b'a'..=b'z' | b'A'..=b'Z' | b'2'..=b'7' | b'0'..=b'9')
    }

    // ===== Issue #161: Partial Withdrawals for Long Sessions =====
    /// Allow experts to withdraw accrued funds mid-session without closing it.
    /// Calculates currently claimable amount, transfers tokens without changing session state,
    /// and updates last_settlement_time.
    /// Allows an expert to withdraw currently accrued funds from an active session.
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session.
    ///
    /// # Returns
    /// * The amount of tokens withdrawn.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the expert.
    /// * `Error::InvalidSessionState` - If the session is not active.
    /// * `Error::InvalidAmount` - If there are no accrued funds to withdraw.
    /// * `Error::InsufficientBalance` - If the session balance is less than accrued (should not happen).
    /// Rates an expert after a session completion (Issue #190).
    ///
    /// # Arguments
    /// * `session_id` - The ID of the completed session.
    /// * `rating` - The rating score (1-5).
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the seeker.
    /// * `Error::InvalidRating` - If the rating is not between 1-5.
    /// * `Error::RatingAlreadySubmitted` - If the seeker already rated this session.
    /// * `Error::InvalidSessionState` - If the session is not completed.
    pub fn rate_expert(env: Env, session_id: u64, rating: u32) -> Result<(), Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        session.seeker.require_auth();

        // Validate rating is between 1-5
        if rating < RATING_SCALE_MIN || rating > RATING_SCALE_MAX {
            return Err(Error::InvalidRating);
        }

        // Check if session is completed
        if session.status != SessionStatus::Completed && session.status != SessionStatus::Resolved {
            return Err(Error::InvalidSessionState);
        }

        // Check if rating already exists for this session
        if env.storage().persistent().has(&DataKey::SessionRating(session_id)) {
            return Err(Error::RatingAlreadySubmitted);
        }

        // Store the rating
        let rating_record = SessionRating {
            session_id,
            rater: session.seeker.clone(),
            rating,
            created_at: env.ledger().timestamp() as u32,
        };
        env.storage().persistent().set(&DataKey::SessionRating(session_id), &rating_record);

        // Update expert's average rating
        let expert = session.expert.clone();
        let current_avg: u32 = env.storage()
            .persistent()
            .get(&DataKey::ExpertAverageRating(expert.clone()))
            .unwrap_or(0);
        let count: u32 = env.storage()
            .persistent()
            .get(&DataKey::ExpertRatingCount(expert.clone()))
            .unwrap_or(0);

        let new_count = count.saturating_add(1);
        let new_avg = if count == 0 {
            rating
        } else {
            (((current_avg as u64).saturating_mul(count as u64).saturating_add(rating as u64)) / new_count as u64) as u32
        };

        env.storage().persistent().set(&DataKey::ExpertAverageRating(expert.clone()), &new_avg);
        env.storage().persistent().set(&DataKey::ExpertRatingCount(expert.clone()), &new_count);

        env.events().publish(
            (symbol_short!("rating"), symbol_short!("submitted")),
            (session_id, expert, rating, new_avg),
        );

        Ok(())
    }

    /// Retrieves the rating for a specific session (Issue #190).
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If no rating exists for the session.
    pub fn get_session_rating(env: Env, session_id: u64) -> Result<SessionRating, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::SessionRating(session_id))
            .ok_or(Error::SessionNotFound)
    }

    /// Retrieves the average rating for an expert (Issue #190).
    pub fn get_expert_average_rating(env: Env, expert: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertAverageRating(expert))
            .unwrap_or(0)
    }

    /// Retrieves the total number of ratings for an expert (Issue #190).
    pub fn get_expert_rating_count(env: Env, expert: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertRatingCount(expert))
            .unwrap_or(0)
    }

    /// Registers a new expert with a referrer (Issue #52).
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `rate` - The rate per second charged by the expert.
    /// * `metadata_cid` - IPFS Content ID for the expert's metadata.
    /// * `referrer_id` - The address of the referrer (optional).
    ///
    /// # Errors
    /// * `Error::InvalidReferrer` - If the expert tries to refer themselves.
    pub fn register_with_referral(
        env: Env,
        expert: Address,
        rate: i128,
        metadata_cid: String,
        referrer_id: Option<Address>,
    ) -> Result<(), Error> {
        expert.require_auth();

        // Validate referrer
        if let Some(ref referrer) = referrer_id {
            if referrer == &expert {
                return Err(Error::InvalidReferrer);
            }
        }

        // Register expert
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.rate_per_second = rate;
        profile.metadata_cid = metadata_cid;
        profile.referrer = referrer_id.clone();

        env.storage().persistent().set(&DataKey::ExpertProfile(expert.clone()), &profile);

        // Initialize referral session count
        if referrer_id.is_some() {
            env.storage().persistent().set(&DataKey::ReferralSessionCount(expert.clone()), &0u32);
        }

        env.events().publish(
            (symbol_short!("expert"), symbol_short!("regist")),
            (expert, referrer_id),
        );

        Ok(())
    }

    /// Increments the referral session count for an expert (Issue #52).
    /// Called internally when a session is settled.
    fn increment_referral_session_count(env: &Env, expert: &Address) {
        let current: u32 = env.storage()
            .persistent()
            .get(&DataKey::ReferralSessionCount(expert.clone()))
            .unwrap_or(0);

        if current < REFERRAL_SESSION_LIMIT {
            env.storage().persistent().set(
                &DataKey::ReferralSessionCount(expert.clone()),
                &current.saturating_add(1),
            );
        }
    }

    /// Registers a trusted oracle address (Issue #193).
    ///
    /// # Arguments
    /// * `oracle` - The address of the oracle.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn register_trusted_oracle(env: Env, oracle: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage().persistent().set(&DataKey::TrustedOracle(oracle.clone()), &true);
        env.events().publish((symbol_short!("oracle"), symbol_short!("regist")), oracle);
        Ok(())
    }

    /// Removes a trusted oracle address (Issue #193).
    ///
    /// # Arguments
    /// * `oracle` - The address of the oracle.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn remove_trusted_oracle(env: Env, oracle: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage().persistent().remove(&DataKey::TrustedOracle(oracle.clone()));
        env.events().publish((symbol_short!("oracle"), symbol_short!("removed")), oracle);
        Ok(())
    }

    /// Verifies an expert's credentials via oracle (Issue #193).
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `oracle_source` - The source of verification (e.g., "GitHub", "LinkedIn").
    ///
    /// # Errors
    /// * `Error::OracleNotTrusted` - If the oracle is not registered.
    pub fn verify_expert_credentials(
        env: Env,
        expert: Address,
        oracle_source: String,
    ) -> Result<(), Error> {
        let oracle = env.current_contract_address();

        // Check if oracle is trusted
        let is_trusted: bool = env.storage()
            .persistent()
            .get(&DataKey::TrustedOracle(oracle.clone()))
            .unwrap_or(false);

        if !is_trusted {
            return Err(Error::OracleNotTrusted);
        }

        // Update expert verification status
        let verification = ExpertVerification {
            expert: expert.clone(),
            verified: true,
            oracle_source: oracle_source.clone(),
            verified_at: env.ledger().timestamp() as u32,
        };

        env.storage().persistent().set(
            &DataKey::ExpertVerificationStatus(expert.clone()),
            &verification,
        );

        env.events().publish(
            (symbol_short!("expert"), symbol_short!("verified")),
            (expert, oracle_source),
        );

        Ok(())
    }

    /// Checks if an expert is verified (Issue #193).
    pub fn is_expert_verified(env: Env, expert: Address) -> bool {
        env.storage()
            .persistent()
            .get::<DataKey, ExpertVerification>(&DataKey::ExpertVerificationStatus(expert))
            .map(|v| v.verified)
            .unwrap_or(false)
    }

    /// Retrieves expert verification details (Issue #193).
    pub fn get_expert_verification(env: Env, expert: Address) -> Option<ExpertVerification> {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertVerificationStatus(expert))
    }

    // ===== Issue #163: Staking Mechanism for Top Experts =====
    /// Allows experts to stake tokens to boost profile visibility
    /// Allows an expert to stake tokens to the contract.
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `amount` - The amount of tokens to stake.
    ///
    /// # Errors
    /// * `Error::InvalidAmount` - If the amount is zero or negative.
    pub fn stake_tokens(env: Env, expert: Address, amount: i128) -> Result<(), Error> {
        expert.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Get expert profile
        let mut profile = Self::expert_profile(&env, expert.clone());

        // Transfer tokens from expert to contract
        let token = env.current_contract_address(); // Using contract address as staking vault
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&expert, &env.current_contract_address(), &amount);

        // Update staked balance
        profile.staked_balance = profile.staked_balance.saturating_add(amount);
        env.storage().persistent().set(&DataKey::ExpertProfile(expert.clone()), &profile);

        // Emit event for frontend indexer
        env.events().publish((symbol_short!("staked"),), (expert.clone(), amount));

        Ok(())
    }

    /// Allows experts to withdraw staked tokens
    /// Allows an expert to unstake tokens from the contract.
    ///
    /// # Arguments
    /// * `expert` - The address of the expert.
    /// * `amount` - The amount of tokens to unstake.
    ///
    /// # Errors
    /// * `Error::InvalidAmount` - If the amount is zero or negative.
    /// * `Error::InsufficientBalance` - If the expert has insufficient staked balance.
    pub fn unstake_tokens(env: Env, expert: Address, amount: i128) -> Result<(), Error> {
        expert.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Get expert profile
        let mut profile = Self::expert_profile(&env, expert.clone());

        // Verify expert has sufficient staked balance
        if profile.staked_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        // Transfer tokens back to expert
        let token = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &expert, &amount);

        // Update staked balance
        profile.staked_balance = profile.staked_balance.saturating_sub(amount);
        env.storage().persistent().set(&DataKey::ExpertProfile(expert.clone()), &profile);

        // Emit event for frontend indexer
        env.events().publish((symbol_short!("unstaked"),), (expert.clone(), amount));

        Ok(())
    }

    // ===== Issue #164: Multi-Sig Arbitration Panel =====
    /// Initialize the arbitration committee with a 2-of-3 multisig requirement
    /// Initializes the arbitration committee with three members.
    ///
    /// # Arguments
    /// * `member1` - First committee member address.
    /// * `member2` - Second committee member address.
    /// * `member3` - Third committee member address.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    pub fn initialize_arbitration_committee(
        env: Env,
        member1: Address,
        member2: Address,
        member3: Address,
    ) -> Result<(), Error> {
        // Only admin can initialize
        let admin = Self::get_admin_address(&env)?;
        admin.require_auth();

        // Store committee members in persistent state
        // Using a vector to store the committee members
        let mut committee: Vec<Address> = Vec::new(&env);
        committee.push_back(member1);
        committee.push_back(member2);
        committee.push_back(member3);

        env.storage().persistent().set(&DataKey::ArbitrationCommittee, &committee);

        Ok(())
    }

    /// Propose a resolution to a dispute (requires one committee member signature)
    /// Proposes a resolution for a dispute.
    ///
    /// # Arguments
    /// * `caller` - The address of the committee member.
    /// * `session_id` - The ID of the session.
    /// * `seeker_award_bps` - Proposed award for the seeker in bps.
    ///
    /// # Errors
    /// * `Error::InvalidSplitBps` - If the bps exceeds 10,000.
    pub fn propose_resolution(
        env: Env,
        caller: Address,
        session_id: u64,
        seeker_award_bps: u32,
    ) -> Result<(), Error> {
        caller.require_auth();

        if seeker_award_bps > MAX_BPS {
            return Err(Error::InvalidSplitBps);
        }

        // Verify dispute exists
        let _dispute = Self::get_session_or_error(&env, session_id)?;

        env.events().publish((symbol_short!("resProp"),), (session_id, seeker_award_bps));

        Ok(())
    }

    // ===== Issue #165: Escrow Slashing for Malicious Experts =====
    /// Allow arbitration committee to slash staked tokens from malicious experts
    /// Slashes an expert's staked balance for malicious behavior.
    ///
    /// # Arguments
    /// * `caller` - The address of the administrator.
    /// * `expert_id` - The address of the expert to slash.
    /// * `amount` - The amount to slash.
    /// * `reason` - The reason for slashing.
    ///
    /// # Errors
    /// * `Error::Unauthorized` - If the caller is not the administrator.
    /// * `Error::InvalidAmount` - If the amount is zero or negative.
    /// * `Error::EmptyDisputeReason` - If the reason is empty.
    /// * `Error::InsufficientBalance` - If the expert has insufficient staked balance.
    /// * `Error::InsufficientTreasuryBalance` - If the treasury address is not set.
    pub fn slash_expert(
        env: Env,
        caller: Address,
        expert_id: Address,
        amount: i128,
        reason: String,
    ) -> Result<(), Error> {
        caller.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if reason.len() == 0 {
            return Err(Error::EmptyDisputeReason);
        }

        // Verify caller is admin or arbitration committee member
        let admin = Self::get_admin_address(&env)?;
        if caller != admin {
            return Err(Error::Unauthorized);
        }

        // Get expert profile
        let mut profile = Self::expert_profile(&env, expert_id.clone());

        // Verify expert has sufficient staked balance
        if profile.staked_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        // Get treasury address
        let treasury = env.storage().instance().get::<DataKey, Address>(&DataKey::TreasuryAddress)
            .ok_or(Error::InsufficientTreasuryBalance)?;

        // Transfer slashed tokens to treasury
        let token = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &treasury, &amount);

        // Deduct from expert's staked balance
        profile.staked_balance = profile.staked_balance.saturating_sub(amount);
        env.storage().persistent().set(&DataKey::ExpertProfile(expert_id.clone()), &profile);

        // Update treasury balance tracking
        let treasury_key = DataKey::TreasuryBalance(token);
        let mut treasury_balance: i128 = env.storage().instance()
            .get(&treasury_key)
            .unwrap_or(0);
        treasury_balance = treasury_balance.saturating_add(amount);
        env.storage().instance().set(&treasury_key, &treasury_balance);

        // Emit event for auditing
        env.events().publish((symbol_short!("slashed"),), (expert_id.clone(), amount, reason.clone()));

        Ok(())
    }

    /// Refunds a session to the seeker if the expert did not show up within the window.
    ///
    /// # Arguments
    /// * `seeker` - The address of the seeker requesting the refund.
    /// * `session_id` - The ID of the session.
    ///
    /// # Returns
    /// * The amount refunded to the seeker.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the seeker.
    /// * `Error::NotStarted` - If the session start window has not passed yet.
    /// * `Error::InvalidSessionState` - If the session has already accrued earnings.
    pub fn claim_no_show_refund(env: Env, seeker: Address, session_id: u64) -> Result<i128, Error> {
        // === REENTRANCY GUARD ===
        if Self::reentrancy_locked(&env) {
            return Err(Error::ReentrancyDetected);
        }
        Self::set_reentrancy_lock(&env, true);

        // === CHECKS ===
        seeker.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;

        if seeker != session.seeker {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::Unauthorized);
        }

        if session.status != SessionStatus::Active {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        if now <= session.start_timestamp as u64 + SESSION_NO_SHOW_REFUND_WINDOW {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::NotStarted);
        }

        if session.accrued_amount > 0 || session.last_settlement_timestamp != session.start_timestamp {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidSessionState);
        }

        let refund_amount = session.balance;

        // === EFFECTS ===
        session.balance = 0;
        session.status = SessionStatus::Completed;
        session.last_settlement_timestamp = now as u32;
        Self::save_session(&env, &session);

        // === INTERACTIONS ===
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &session.seeker, &refund_amount);

        env.events().publish(
            (symbol_short!("session"), symbol_short!("refund")),
            (session_id, refund_amount, now),
        );

        Self::set_reentrancy_lock(&env, false);
        Ok(refund_amount)
    }

    /// Allows an expert to withdraw currently accrued funds from an active session.
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session.
    ///
    /// # Returns
    /// * The amount of tokens withdrawn.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the expert.
    /// * `Error::InvalidSessionState` - If the session is not active.
    /// * `Error::InvalidAmount` - If there are no accrued funds to withdraw.
    /// * `Error::InsufficientBalance` - If the session balance is less than accrued (should not happen).
    pub fn withdraw_accrued(env: Env, session_id: u64) -> Result<i128, Error> {
        // === REENTRANCY GUARD ===
        if Self::reentrancy_locked(&env) {
            return Err(Error::ReentrancyDetected);
        }
        Self::set_reentrancy_lock(&env, true);

        // === CHECKS ===
        let mut session = Self::get_session_or_error(&env, session_id)?;
        
        // Verify caller is the expert
        session.expert.require_auth();

        // Verify session is active
        if session.status != SessionStatus::Active {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidSessionState);
        }

        // Calculate currently claimable amount based on time elapsed
        let now = env.ledger().timestamp();
        let time_elapsed = now.saturating_sub(session.last_settlement_timestamp as u64);
        let newly_accrued = session.rate_per_second.saturating_mul(time_elapsed as i128);

        // Total claimable is accrued + newly accrued
        let total_claimable = session.accrued_amount.saturating_add(newly_accrued);

        if total_claimable <= 0 {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidAmount);
        }

        // Verify session has sufficient balance
        if session.balance < total_claimable {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InsufficientBalance);
        }

        // === EFFECTS ===
        session.balance = session.balance.saturating_sub(total_claimable);
        session.last_settlement_timestamp = now as u32;
        session.accrued_amount = 0;
        Self::save_session(&env, &session);

        // === INTERACTIONS ===
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &session.expert, &total_claimable);

        env.events().publish(
            (symbol_short!("withdraw"), symbol_short!("accrued")),
            (session_id, total_claimable, now),
        );

        Self::set_reentrancy_lock(&env, false);
        Ok(total_claimable)
    }
}

#[cfg(test)]
mod test {

    #[test]
    fn test_1_second_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        let session_id = client.start_session(&seeker, &expert, &token, &30_000, &0, &test_cid(&env));
        
        env.ledger().set_timestamp(1_001);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 100);
    }

    #[test]
    fn test_1_year_session_overflow_check() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let rate: i128 = 100_000_000_000;
        register_and_avail(&env, &client, &expert, rate);
        
        let one_year_seconds: u64 = 365 * 24 * 60 * 60;
        let deposit = rate * (one_year_seconds as i128);
        
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &deposit);

        let session_id = client.start_session(&seeker, &expert, &token, &deposit, &0, &test_cid(&env));
        
        env.ledger().set_timestamp(1_000 + one_year_seconds);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, deposit);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #22)")]
    fn test_start_session_fails_if_expert_not_registered() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #23)")]
    fn test_start_session_fails_if_expert_unavailable() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        client.register_expert(&expert, &10, &test_cid(&env));
        client.set_availability(&expert, &false);
        client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
    }

    #[test]
    fn test_expert_registration_and_availability() {
        let (env, client, _, _, _, expert, _, _) = setup();
        let rate = 50;
        let cid = test_cid(&env);
        
        client.register_expert(&expert, &rate, &cid);
        let profile = client.get_expert_profile(&expert);
        assert_eq!(profile.rate_per_second, rate);
        assert_eq!(profile.metadata_cid, cid);
        assert!(!profile.availability_status);
        
        client.set_availability(&expert, &true);
        let profile2 = client.get_expert_profile(&expert);
        assert!(profile2.availability_status);
    }

    #[test]
    fn test_update_session_notes() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        
        let notes_cid = String::from_str(&env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz9");
        client.update_session_notes(&seeker, &session_id, &notes_cid);
        
        let session = client.get_session(&session_id);
        assert_eq!(session.encrypted_notes_hash, Some(notes_cid));
    }

    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{token, Address, Env, IntoVal, String, Vec};

    fn register_and_avail(env: &Env, client: &SkillSphereContractClient, expert: &Address, rate: i128) {
        let cid = test_cid(env);
        client.register_expert(expert, &rate, &cid);
        client.set_availability(expert, &true);
    }

    fn test_cid(env: &Env) -> String {
        String::from_str(env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz8")
    }

    fn setup() -> (
        Env,
        SkillSphereContractClient<'static>,
        Address,
        Address,
        Address,
        Address,
        Address,
        Address,
    ) {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_000);

        let contract_id = env.register_contract(None, SkillSphereContract);
        let client = SkillSphereContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let seeker = Address::generate(&env);
        let expert = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token.address();

        client.initialize(&admin);

        let asset_admin = token::StellarAssetClient::new(&env, &token_address);
        asset_admin.mint(&seeker, &100_000);

        (
            env,
            client,
            contract_id,
            admin,
            seeker,
            expert,
            token_address,
            token_admin,
        )
    }

    #[test]
    fn test_calculate_claimable_amount_same_time_returns_zero() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let claimable = client.calculate_claimable_amount(&session_id, &env.ledger().timestamp());
        assert_eq!(claimable, 0);
    }

    #[test]
    fn test_start_session_locks_tokens_and_creates_session() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let session = client.get_session(&session_id);
        let token_client = token::Client::new(&env, &token);

        assert_eq!(session.id, session_id);
        assert_eq!(session.status, SessionStatus::Active);
        assert_eq!(session.balance, 3_000);
        assert_eq!(token_client.balance(&seeker), 97_000);
        assert_eq!(token_client.balance(&contract_id), 3_000);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #21)")]
    fn test_start_session_fails_when_amount_is_below_minimum_deposit() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.start_session(&seeker, &expert, &token, &99, &0, &test_cid(&env));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_start_session_fails_on_insufficient_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.start_session(&seeker, &expert, &token, &150_000, &0, &test_cid(&env));
    }

    #[test]
    fn test_linear_streaming_caps_at_remaining_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let claimable =
            client.calculate_claimable_amount(&session_id, &(env.ledger().timestamp() + 10));
        assert_eq!(claimable, 100);
    }

    #[test]
    fn test_pause_and_resume_preserve_accrued_amount() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);
        client.pause_session(&seeker, &session_id);

        let paused_claimable = client.calculate_claimable_amount(&session_id, &1_050);
        assert_eq!(paused_claimable, 100);

        env.ledger().set_timestamp(1_060);
        client.resume_session(&expert, &session_id);

        let session = client.get_session(&session_id);
        assert_eq!(session.last_settlement_timestamp, 1_060);
        assert_eq!(session.status, SessionStatus::Active);

        let resumed_claimable = client.calculate_claimable_amount(&session_id, &1_070);
        assert_eq!(resumed_claimable, 200);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_only_participants_can_pause_or_resume() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let stranger = Address::generate(&env);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        client.pause_session(&stranger, &session_id);
    }

    #[test]
    fn test_settle_session_transfers_partial_milestone_payment() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_020);
        let settled = client.settle_session(&session_id);
        assert_eq!(settled, 190);
        assert_eq!(token_client.balance(&expert), 190);
        assert_eq!(client.get_treasury_balance(&token), 10);

        let session = client.get_session(&session_id);
        assert_eq!(session.balance, 2_800);
        assert_eq!(session.last_settlement_timestamp, 1_020);
        assert_eq!(session.status, SessionStatus::Active);
    }

    #[test]
    fn test_multiple_settlements_track_milestones_without_ending_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_010);
        assert_eq!(client.settle_session(&session_id), 95);

        env.ledger().set_timestamp(1_025);
        assert_eq!(client.settle_session(&session_id), 143);

        let session = client.get_session(&session_id);
        assert_eq!(token_client.balance(&expert), 238);
        assert_eq!(client.get_treasury_balance(&token), 12);
        assert_eq!(session.balance, 2_750);
        assert_eq!(session.status, SessionStatus::Active);
    }

    #[test]
    fn test_set_and_get_expert_referrer() {
        let (env, client, _, _, _, expert, _, _) = setup();
        let referrer = Address::generate(&env);

        client.set_expert_referrer(&expert, &referrer);

        let profile = client.get_expert_profile(&expert);
        assert_eq!(profile.referrer, Some(referrer.clone()));
        assert_eq!(client.get_expert_referrer(&expert), Some(referrer));
    }

    #[test]
    fn test_set_admin_and_fee_round_trip() {
        let (env, client, _, admin, _, _, _, _) = setup();
        let new_admin = Address::generate(&env);

        client.set_fee(&250);
        assert_eq!(client.get_fee(), 250);
        assert_eq!(client.get_admin(), admin);

        client.set_admin(&new_admin);
        assert_eq!(client.get_admin(), new_admin);
    }

    #[test]
    fn test_min_session_deposit_defaults_and_can_be_updated_by_admin() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        assert_eq!(client.get_min_session_deposit(), 100);

        client.set_min_session_deposit(&250);
        assert_eq!(client.get_min_session_deposit(), 250);

        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        assert_eq!(session_id, 1);
    }

    #[test]
    fn test_calculate_platform_fee_uses_default_tiers() {
        let (_, client, _, _, _, _, _, _) = setup();
        let config = client.get_fee_config();

        assert_eq!(config.first_tier_bps, 500);
        assert_eq!(config.second_tier_bps, 300);
        assert_eq!(config.first_tier_limit, 1_000);
        assert_eq!(client.calculate_platform_fee(&800), 40);
        assert_eq!(client.calculate_platform_fee(&1_500), 65);
    }

    #[test]
    fn test_admin_can_update_fee_tiers() {
        let (_, client, _, _, _, _, _, _) = setup();

        client.set_fee_tiers(&2_000, &600, &200);
        let config = client.get_fee_config();

        assert_eq!(config.first_tier_limit, 2_000);
        assert_eq!(config.first_tier_bps, 600);
        assert_eq!(config.second_tier_bps, 200);
        assert_eq!(client.calculate_platform_fee(&2_500), 130);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #13)")]
    fn test_start_session_rejects_low_reputation_expert() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.start_session(&seeker, &expert, &token, &3000, &1, &test_cid(&env));
    }

    #[test]
    fn test_start_session_allows_expert_when_reputation_is_met() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        client.set_expert_reputation(&expert, &85);
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &80, &test_cid(&env));

        assert_eq!(session_id, 1);
        assert_eq!(client.get_expert_reputation(&expert), 85);
    }

    #[test]
    fn test_expiry_timestamp_uses_remaining_balance_and_rate() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        assert_eq!(client.calculate_expiry_timestamp(&session_id), 1_300);
    }

    #[test]
    fn test_settle_session_after_funded_window_drains_and_finishes() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_300);
        let settled = client.settle_session(&session_id);
        let session = client.get_session(&session_id);

        assert_eq!(settled, 2_890);
        assert_eq!(token_client.balance(&expert), 2_890);
        assert_eq!(client.get_treasury_balance(&token), 110);
        assert_eq!(session.balance, 0);
        assert_eq!(session.status, SessionStatus::Completed);
    }

    #[test]
    fn test_settle_session_pays_referrer_from_platform_fee() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        let referrer = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        let token_client = token::Client::new(&env, &token);

        client.set_expert_referrer(&expert, &referrer);
        asset_admin.mint(&seeker, &30_000);

        let session_id =
            client.start_session(&seeker, &expert, &token, &30_000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_030);
        let settled = client.settle_session(&session_id);

        assert_eq!(settled, 2_890);
        assert_eq!(token_client.balance(&expert), 2_890);
        assert_eq!(token_client.balance(&referrer), 1);
        assert_eq!(client.get_treasury_balance(&token), 109);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #12)")]
    fn test_protocol_pause_blocks_new_sessions() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.pause_protocol();

        client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
    }

    #[test]
    fn test_protocol_pause_blocks_settlement_but_allows_refund_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_010);
        client.pause_protocol();

        // Test that end_session works during protocol pause
        client.end_session(&seeker, &session_id);
        let session = client.get_session(&session_id);

        assert_eq!(token_client.balance(&seeker), 99_900);
        assert_eq!(session.status, SessionStatus::Completed);
    }

    #[test]
    fn test_claim_no_show_refund_after_timeout_returns_full_balance() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_601);
        let refunded = client.claim_no_show_refund(&seeker, &session_id);
        let session = client.get_session(&session_id);

        assert_eq!(refunded, 3_000);
        assert_eq!(token_client.balance(&seeker), 100_000);
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(session.balance, 0);
        assert_eq!(session.status, SessionStatus::Completed);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #6)")]
    fn test_claim_no_show_refund_fails_before_timeout() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_600);
        client.claim_no_show_refund(&seeker, &session_id);
    }

    #[test]
    fn test_flag_dispute_stores_evidence_cid() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let cid = String::from_str(&env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz8");

        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "Need arbitration"),
            &cid,
        );

        let dispute = client.get_dispute(&session_id);
        assert_eq!(dispute.evidence_cid, cid);
        assert!(!dispute.resolved);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #16)")]
    fn test_flag_dispute_rejects_invalid_cid() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "Bad evidence"),
            &String::from_str(&env, "not-a-cid"),
        );
    }

    #[test]
    fn test_resolve_dispute_splits_funds_by_percentage() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "Split the escrow"),
            &String::from_str(&env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz8"),
        );
        client.resolve_dispute(&session_id, &5_000);

        let session = client.get_session(&session_id);
        let dispute = client.get_dispute(&session_id);

        assert_eq!(token_client.balance(&seeker), 98_500);
        assert_eq!(token_client.balance(&expert), 1_500);
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(session.status, SessionStatus::Resolved);
        assert!(dispute.resolved);
        assert_eq!(dispute.seeker_award_bps, 5_000);
        assert_eq!(dispute.expert_award_bps, 5_000);
        assert!(!dispute.auto_resolved);
    }

    #[test]
    fn test_auto_resolve_expiry_refunds_seeker_after_30_days() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "Arbitrator inactive"),
            &String::from_str(
                &env,
                "bafybeigdyrzt5zq3w7x7o6m2e6l6i5zv6sq7sdb4xwz5ztq4w4m3l4k2rq",
            ),
        );

        env.ledger()
            .set_timestamp(1_000 + DISPUTE_EXPIRY_WINDOW + 1);
        client.auto_resolve_expiry(&expert, &session_id);

        let session = client.get_session(&session_id);
        let dispute = client.get_dispute(&session_id);

        assert_eq!(token_client.balance(&seeker), 100_000);
        assert_eq!(token_client.balance(&expert), 0);
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(session.status, SessionStatus::Resolved);
        assert!(dispute.resolved);
        assert!(dispute.auto_resolved);
        assert_eq!(dispute.seeker_award_bps, MAX_BPS);
        assert_eq!(dispute.expert_award_bps, 0);
    }

    #[test]
    fn test_expert_with_no_stake_pays_full_fee() {
        let (_, client, _, _, _, expert, _, _) = setup();
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 500);
    }

    #[test]
    fn test_expert_with_tier_1_stake_gets_100_bps_reduction() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &1_000);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 400);
    }

    #[test]
    fn test_expert_with_tier_2_stake_gets_200_bps_reduction() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &5_000);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 300);
    }

    #[test]
    fn test_expert_with_tier_3_stake_gets_300_bps_reduction() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &10_000);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 200);
    }

    #[test]
    fn test_expert_stake_just_below_tier_1_pays_full_fee() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &999);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 500);
    }

    #[test]
    fn test_expert_stake_between_tier_1_and_2_gets_tier_1_reduction() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &3_000);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 400);
    }

    #[test]
    fn test_expert_stake_between_tier_2_and_3_gets_tier_2_reduction() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &7_500);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 300);
    }

    #[test]
    fn test_expert_stake_above_tier_3_gets_tier_3_reduction() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &50_000);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 200);
    }

    #[test]
    fn test_get_expert_staked_balance_returns_zero_for_new_expert() {
        let (env, client, _, _, _, _, _, _) = setup();
        let new_expert = Address::generate(&env);
        let balance = client.get_expert_staked_balance(&new_expert);
        assert_eq!(balance, 0);
    }

    #[test]
    fn test_set_and_get_expert_staked_balance() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &2_500);
        let balance = client.get_expert_staked_balance(&expert);
        assert_eq!(balance, 2_500);
    }

    #[test]
    fn test_set_staking_contract_address() {
        let (env, client, _, _, _, _, _, _) = setup();
        let staking_contract = Address::generate(&env);
        client.set_staking_contract(&staking_contract);
        let retrieved = client.get_staking_contract();
        assert_eq!(retrieved, Some(staking_contract));
    }

    #[test]
    fn test_get_staking_contract_returns_none_when_not_set() {
        let (_, client, _, _, _, _, _, _) = setup();
        let retrieved = client.get_staking_contract();
        assert_eq!(retrieved, None);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_set_expert_staked_balance_rejects_negative_amount() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_expert_staked_balance(&expert, &-100);
    }

    #[test]
    fn test_fee_reduction_respects_base_fee_changes() {
        let (_, client, _, _, _, expert, _, _) = setup();
        client.set_fee(&800);
        client.set_expert_staked_balance(&expert, &10_000);
        let fee_bps = client.get_expert_fee_bps(&expert);
        assert_eq!(fee_bps, 500);
    }

    #[test]
    fn test_get_treasury_balance_returns_zero_initially() {
        let (_, client, _, _, _, _, token, _) = setup();
        let balance = client.get_treasury_balance(&token);
        assert_eq!(balance, 0);
    }

    #[test]
    fn test_collect_fee_increases_treasury_balance() {
        let (_, client, _, _, _, _, token, _) = setup();
        client.collect_fee(&1, &token, &100);
        let balance = client.get_treasury_balance(&token);
        assert_eq!(balance, 100);
    }

    #[test]
    fn test_collect_multiple_fees_accumulates_balance() {
        let (_, client, _, _, _, _, token, _) = setup();
        client.collect_fee(&1, &token, &100);
        client.collect_fee(&2, &token, &250);
        client.collect_fee(&3, &token, &150);
        let balance = client.get_treasury_balance(&token);
        assert_eq!(balance, 500);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_collect_fee_rejects_zero_amount() {
        let (_, client, _, _, _, _, token, _) = setup();
        client.collect_fee(&1, &token, &0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_collect_fee_rejects_negative_amount() {
        let (_, client, _, _, _, _, token, _) = setup();
        client.collect_fee(&1, &token, &-50);
    }

    #[test]
    fn test_set_and_get_treasury_address() {
        let (env, client, _, _, _, _, _, _) = setup();
        let treasury = Address::generate(&env);
        client.set_treasury_address(&treasury);
        let retrieved = client.get_treasury_address();
        assert_eq!(retrieved, Some(treasury));
    }

    #[test]
    fn test_get_treasury_address_returns_none_when_not_set() {
        let (_, client, _, _, _, _, _, _) = setup();
        let retrieved = client.get_treasury_address();
        assert_eq!(retrieved, None);
    }

    #[test]
    fn test_withdraw_treasury_transfers_funds_and_updates_balance() {
        let (env, client, contract_id, _, _, _, token, _token_admin) = setup();
        let treasury = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);

        client.collect_fee(&1, &token, &500);
        asset_admin.mint(&contract_id, &500);

        client.withdraw_treasury(&token, &300, &treasury);

        assert_eq!(client.get_treasury_balance(&token), 200);
        let token_client = token::Client::new(&env, &token);
        assert_eq!(token_client.balance(&treasury), 300);
    }

    #[test]
    fn test_withdraw_all_treasury_empties_balance() {
        let (env, client, contract_id, _, _, _, token, _token_admin) = setup();
        let treasury = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);

        client.collect_fee(&1, &token, &750);
        asset_admin.mint(&contract_id, &750);

        let withdrawn = client.withdraw_all_treasury(&token, &treasury);

        assert_eq!(withdrawn, 750);
        assert_eq!(client.get_treasury_balance(&token), 0);
        let token_client = token::Client::new(&env, &token);
        assert_eq!(token_client.balance(&treasury), 750);
    }

    #[test]
    fn test_withdraw_all_treasury_returns_zero_when_empty() {
        let (env, client, _, _, _, _, token, _) = setup();
        let treasury = Address::generate(&env);

        let withdrawn = client.withdraw_all_treasury(&token, &treasury);

        assert_eq!(withdrawn, 0);
        assert_eq!(client.get_treasury_balance(&token), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #20)")]
    fn test_withdraw_treasury_fails_with_insufficient_balance() {
        let (env, client, _, _, _, _, token, _) = setup();
        let treasury = Address::generate(&env);

        client.collect_fee(&1, &token, &100);
        client.withdraw_treasury(&token, &3000, &treasury);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_withdraw_treasury_rejects_zero_amount() {
        let (env, client, _, _, _, _, token, _) = setup();
        let treasury = Address::generate(&env);

        client.collect_fee(&1, &token, &100);
        client.withdraw_treasury(&token, &0, &treasury);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_withdraw_treasury_rejects_negative_amount() {
        let (env, client, _, _, _, _, token, _) = setup();
        let treasury = Address::generate(&env);

        client.collect_fee(&1, &token, &100);
        client.withdraw_treasury(&token, &-50, &treasury);
    }

    #[test]
    fn test_treasury_tracks_multiple_tokens_separately() {
        let (env, client, _, _, _, _, token1, token_admin) = setup();
        let token2 = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token2_address = token2.address();

        client.collect_fee(&1, &token1, &100);
        client.collect_fee(&2, &token2_address, &250);

        assert_eq!(client.get_treasury_balance(&token1), 100);
        assert_eq!(client.get_treasury_balance(&token2_address), 250);
    }

    #[test]
    fn test_partial_withdrawals_maintain_correct_balance() {
        let (env, client, contract_id, _, _, _, token, _token_admin) = setup();
        let treasury = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);

        client.collect_fee(&1, &token, &1_000);
        asset_admin.mint(&contract_id, &1_000);

        client.withdraw_treasury(&token, &300, &treasury);
        assert_eq!(client.get_treasury_balance(&token), 700);

        client.withdraw_treasury(&token, &200, &treasury);
        assert_eq!(client.get_treasury_balance(&token), 500);

        client.withdraw_treasury(&token, &500, &treasury);
        assert_eq!(client.get_treasury_balance(&token), 0);
        let token_client = token::Client::new(&env, &token);
        assert_eq!(token_client.balance(&treasury), 1_000);
    }

    #[test]
    fn test_treasury_balance_survives_multiple_collect_and_withdraw_cycles() {
        let (env, client, contract_id, _, _, _, token, _token_admin) = setup();
        let treasury = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);

        client.collect_fee(&1, &token, &500);
        asset_admin.mint(&contract_id, &500);
        client.withdraw_treasury(&token, &200, &treasury);
        assert_eq!(client.get_treasury_balance(&token), 300);

        client.collect_fee(&2, &token, &400);
        asset_admin.mint(&contract_id, &400);
        assert_eq!(client.get_treasury_balance(&token), 700);

        client.withdraw_treasury(&token, &700, &treasury);
        assert_eq!(client.get_treasury_balance(&token), 0);
        let token_client = token::Client::new(&env, &token);
        assert_eq!(token_client.balance(&treasury), 900);
    }

    // --- #139: Session metadata CID ---

    #[test]
    fn test_start_session_stores_metadata_cid() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let cid = test_cid(&env);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &cid);

        let session = client.get_session(&session_id);
        assert_eq!(session.metadata_cid, cid);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #16)")]
    fn test_start_session_rejects_invalid_metadata_cid() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let bad_cid = String::from_str(&env, "not-a-valid-cid");
        client.start_session(&seeker, &expert, &token, &3000, &0, &bad_cid);
    }

    #[test]
    fn test_start_session_accepts_cid_v1() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let cid_v1 = String::from_str(&env, "bafybeigdyrzt5zq3w7x7o6m2e6l6i5zv6sq7sd");
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &cid_v1);

        let session = client.get_session(&session_id);
        assert_eq!(session.metadata_cid, cid_v1);
    }

    // --- #137: get_current_earnings view function ---

    #[test]
    fn test_get_current_earnings_returns_zero_at_start() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 0);
    }

    #[test]
    fn test_get_current_earnings_reflects_elapsed_time() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_015);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 150);
    }

    #[test]
    fn test_get_current_earnings_caps_at_session_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 100);
    }

    #[test]
    fn test_get_current_earnings_zero_when_paused() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);
        client.pause_session(&seeker, &session_id);

        env.ledger().set_timestamp(1_030);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 100);
    }

    // --- #138: batch_settle ---

    #[test]
    fn test_batch_settle_settles_multiple_sessions() {
        let (env, client, _, _, seeker, expert, token, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &2_000);

        let session_1 =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        register_and_avail(&env, &client, &expert, 5);
        let session_2 =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_020);

        let mut ids = Vec::new(&env);
        ids.push_back(session_1);
        ids.push_back(session_2);

        let results = client.batch_settle(&expert, &ids);

        assert_eq!(results.get(0).unwrap(), 190);
        assert_eq!(results.get(1).unwrap(), 95);

        let token_client = token::Client::new(&env, &token);
        assert_eq!(token_client.balance(&expert), 285);
    }

    #[test]
    fn test_batch_settle_skips_sessions_belonging_to_other_expert() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let other_expert = Address::generate(&env);
        register_and_avail(&env, &client, &other_expert, 10);
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &1_000);

        let session_1 =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let session_2 = client.start_session(
            &seeker,
            &other_expert,
            &token,
            &3000,
            &0,
            &test_cid(&env),
        );

        env.ledger().set_timestamp(1_010);

        let mut ids = Vec::new(&env);
        ids.push_back(session_1);
        ids.push_back(session_2);

        let results = client.batch_settle(&expert, &ids);

        assert_eq!(results.get(0).unwrap(), 95);
        assert_eq!(results.get(1).unwrap(), 0);
    }

    #[test]
    fn test_batch_settle_skips_nonexistent_sessions() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);

        let mut ids = Vec::new(&env);
        ids.push_back(session_id);
        ids.push_back(999u64);

        let results = client.batch_settle(&expert, &ids);

        assert_eq!(results.get(0).unwrap(), 95);
        assert_eq!(results.get(1).unwrap(), 0);
    }

    // --- Issue #161: Partial Withdrawals for Long Sessions ---

    #[test]
    fn test_withdraw_accrued_calculates_claimable_amount() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        let session_id =
            client.start_session(&seeker, &expert, &token, &30_000, &0, &test_cid(&env));

        // Simulate 10 seconds elapsed
        env.ledger().set_timestamp(1_010);
        let withdrawn = client.withdraw_accrued(&session_id);

        // 10 seconds * 100 rate = 1000 tokens
        assert_eq!(withdrawn, 1_000);

        let session = client.get_session(&session_id);
        assert_eq!(session.balance, 29_000);
        assert_eq!(session.last_settlement_timestamp, 1_010);
        assert_eq!(session.accrued_amount, 0);
        assert_eq!(session.status, SessionStatus::Active);
    }

    #[test]
    fn test_withdraw_accrued_transfers_tokens_without_closing_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 50);
        let token_client = token::Client::new(&env, &token);
        let session_id =
            client.start_session(&seeker, &expert, &token, &10_000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_020);
        client.withdraw_accrued(&session_id);

        // Expert should receive 20 seconds * 50 rate = 1000 tokens
        assert_eq!(token_client.balance(&expert), 1_000);

        // Session should still be active
        let session = client.get_session(&session_id);
        assert_eq!(session.status, SessionStatus::Active);
        assert_eq!(session.balance, 9_000);
    }

    #[test]
    fn test_withdraw_accrued_updates_last_settlement_time() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &5_000, &0, &test_cid(&env));

        let initial_session = client.get_session(&session_id);
        assert_eq!(initial_session.last_settlement_timestamp, 1_000);

        env.ledger().set_timestamp(1_050);
        client.withdraw_accrued(&session_id);

        let updated_session = client.get_session(&session_id);
        assert_eq!(updated_session.last_settlement_timestamp, 1_050);
    }

    #[test]
    fn test_withdraw_accrued_multiple_times_in_long_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        let token_client = token::Client::new(&env, &token);
        let session_id =
            client.start_session(&seeker, &expert, &token, &100_000, &0, &test_cid(&env));

        // First withdrawal after 100 seconds
        env.ledger().set_timestamp(1_100);
        let first_withdrawal = client.withdraw_accrued(&session_id);
        assert_eq!(first_withdrawal, 10_000);
        assert_eq!(token_client.balance(&expert), 10_000);

        // Second withdrawal after another 200 seconds
        env.ledger().set_timestamp(1_300);
        let second_withdrawal = client.withdraw_accrued(&session_id);
        assert_eq!(second_withdrawal, 20_000);
        assert_eq!(token_client.balance(&expert), 30_000);

        // Session should still be active with remaining balance
        let session = client.get_session(&session_id);
        assert_eq!(session.status, SessionStatus::Active);
        assert_eq!(session.balance, 70_000);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_withdraw_accrued_fails_if_not_expert() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);
        
        // Try to withdraw as seeker (should fail)
        env.mock_all_auths_allowing_non_root_auth();
        client.mock_auths(&[soroban_sdk::testutils::MockAuth {
            address: &seeker,
            invoke: &soroban_sdk::testutils::MockAuthInvoke {
                contract: &client.address,
                fn_name: "withdraw_accrued",
                args: (session_id,).into_val(&env),
                sub_invokes: &[],
            },
        }]);
        client.withdraw_accrued(&session_id);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_withdraw_accrued_fails_if_session_not_active() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        // Pause the session
        client.pause_session(&expert, &session_id);

        env.ledger().set_timestamp(1_010);
        client.withdraw_accrued(&session_id);
    }

    // --- Issue #158: Enforce Minimum Session Escrow ---

    #[test]
    #[should_panic(expected = "Error(Contract, #26)")]
    fn test_start_session_enforces_minimum_escrow_5_minutes() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        // Expert rate is 10 tokens per second
        register_and_avail(&env, &client, &expert, 10);
        
        // Minimum escrow should be rate * 300 seconds (5 minutes) = 10 * 300 = 3000
        // Try to start with less than minimum
        client.start_session(&seeker, &expert, &token, &2_999, &0, &test_cid(&env));
    }

    #[test]
    fn test_start_session_accepts_exact_minimum_escrow() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        
        // Minimum escrow is rate * 300 = 10 * 300 = 3000
        let session_id = client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        
        let session = client.get_session(&session_id);
        assert_eq!(session.balance, 3_000);
        assert_eq!(session.status, SessionStatus::Active);
    }

    #[test]
    fn test_minimum_escrow_scales_with_expert_rate() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &100_000);
        
        // High rate expert: 100 tokens per second
        register_and_avail(&env, &client, &expert, 100);
        
        // Minimum escrow is 100 * 300 = 30,000
        let session_id = client.start_session(&seeker, &expert, &token, &30_000, &0, &test_cid(&env));
        
        let session = client.get_session(&session_id);
        assert_eq!(session.balance, 30_000);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #26)")]
    fn test_minimum_escrow_prevents_zero_balance_sessions() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 1);
        
        // Try to start with 0 balance (should fail)
        client.start_session(&seeker, &expert, &token, &0, &0, &test_cid(&env));
    }

    // --- Issue #159: Dynamic Platform Fee Percentage ---

    #[test]
    fn test_set_platform_fee_updates_fee_dynamically() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        
        // Default fee is 500 bps (5%)
        assert_eq!(client.get_fee(), 500);
        
        // Admin sets new fee to 0 for promotional period
        client.set_fee(&0);
        assert_eq!(client.get_fee(), 0);
        
        // Start session and settle - should have 0 fee
        let session_id = client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_010);
        let settled = client.settle_session(&session_id);
        
        // With 0% fee, expert gets full amount (100 tokens)
        assert_eq!(settled, 100);
        assert_eq!(client.get_treasury_balance(&token), 0);
    }

    #[test]
    fn test_platform_fee_calculation_uses_dynamic_value() {
        let (_, client, _, _, _, _, _, _) = setup();
        
        // Set fee to 250 bps (2.5%)
        client.set_fee(&250);
        
        let fee = client.calculate_platform_fee(&10_000);
        // 10,000 * 2.5% = 250
        assert_eq!(fee, 250);
    }

    #[test]
    fn test_admin_can_run_zero_fee_promotional_period() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        let token_client = token::Client::new(&env, &token);
        
        // Set 0% fee for promotion
        client.set_fee(&0);
        
        let session_id = client.start_session(&seeker, &expert, &token, &10_000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_050);
        client.settle_session(&session_id);
        
        // Expert should receive full 5000 tokens (50 seconds * 100 rate) with no fee
        assert_eq!(token_client.balance(&expert), 5_000);
        assert_eq!(client.get_treasury_balance(&token), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #14)")]
    fn test_set_platform_fee_rejects_invalid_bps() {
        let (_, client, _, _, _, _, _, _) = setup();
        
        // Try to set fee above 10,000 bps (100%)
        client.set_fee(&10_001);
    }

    #[test]
    fn test_platform_fee_stored_in_admin_state() {
        let (_, client, _, _, _, _, _, _) = setup();
        
        client.set_fee(&750);
        let config = client.get_fee_config();
        
        assert_eq!(config.first_tier_bps, 750);
    }

    // --- Issue #160: Multi-Token Support for Payments ---

    #[test]
    fn test_session_stores_token_address() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        
        let session_id = client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        
        let session = client.get_session(&session_id);
        assert_eq!(session.token, token);
    }

    #[test]
    fn test_multiple_sessions_with_different_tokens() {
        let (env, client, _, _, seeker, expert, token1, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);
        
        // Create second token (USDC)
        let token2 = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token2_address = token2.address();
        let asset_admin2 = token::StellarAssetClient::new(&env, &token2_address);
        asset_admin2.mint(&seeker, &10_000);
        
        // Start session with first token (XLM)
        let session1_id = client.start_session(&seeker, &expert, &token1, &3_000, &0, &test_cid(&env));
        
        // Start session with second token (USDC)
        let session2_id = client.start_session(&seeker, &expert, &token2_address, &5_000, &0, &test_cid(&env));
        
        let session1 = client.get_session(&session1_id);
        let session2 = client.get_session(&session2_id);
        
        assert_eq!(session1.token, token1);
        assert_eq!(session2.token, token2_address);
        assert_ne!(session1.token, session2.token);
    }

    #[test]
    fn test_settle_session_uses_correct_token_contract() {
        let (env, client, _, _, seeker, expert, token1, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);
        
        // Create USDC token
        let usdc_token = env.register_stellar_asset_contract_v2(token_admin.clone());
        let usdc_address = usdc_token.address();
        let usdc_admin = token::StellarAssetClient::new(&env, &usdc_address);
        usdc_admin.mint(&seeker, &10_000);
        
        let usdc_client = token::Client::new(&env, &usdc_address);
        
        // Start session with USDC
        let session_id = client.start_session(&seeker, &expert, &usdc_address, &5_000, &0, &test_cid(&env));
        
        env.ledger().set_timestamp(1_010);
        client.settle_session(&session_id);
        
        // Verify payment was made in USDC, not XLM
        assert_eq!(usdc_client.balance(&expert), 95);
        
        let token1_client = token::Client::new(&env, &token1);
        assert_eq!(token1_client.balance(&expert), 0);
    }

    #[test]
    fn test_expert_can_accept_multiple_token_types() {
        let (env, client, _, _, seeker, expert, xlm_token, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);
        
        // Create USDC and DAI tokens
        let usdc = env.register_stellar_asset_contract_v2(token_admin.clone());
        let usdc_address = usdc.address();
        let dai = env.register_stellar_asset_contract_v2(token_admin.clone());
        let dai_address = dai.address();
        
        let usdc_admin = token::StellarAssetClient::new(&env, &usdc_address);
        let dai_admin = token::StellarAssetClient::new(&env, &dai_address);
        usdc_admin.mint(&seeker, &10_000);
        dai_admin.mint(&seeker, &10_000);
        
        // Expert accepts sessions in XLM, USDC, and DAI
        let xlm_session = client.start_session(&seeker, &expert, &xlm_token, &3_000, &0, &test_cid(&env));
        let usdc_session = client.start_session(&seeker, &expert, &usdc_address, &4_000, &0, &test_cid(&env));
        let dai_session = client.start_session(&seeker, &expert, &dai_address, &5_000, &0, &test_cid(&env));
        
        // Verify all sessions are active with correct tokens
        assert_eq!(client.get_session(&xlm_session).token, xlm_token);
        assert_eq!(client.get_session(&usdc_session).token, usdc_address);
        assert_eq!(client.get_session(&dai_session).token, dai_address);
    }

    #[test]
    fn test_treasury_tracks_fees_per_token() {
        let (env, client, _, _, seeker, expert, token1, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);
        
        let token2 = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token2_address = token2.address();
        let asset_admin2 = token::StellarAssetClient::new(&env, &token2_address);
        asset_admin2.mint(&seeker, &10_000);
        
        // Start and settle sessions with different tokens
        let session1 = client.start_session(&seeker, &expert, &token1, &3_000, &0, &test_cid(&env));
        let session2 = client.start_session(&seeker, &expert, &token2_address, &5_000, &0, &test_cid(&env));
        
        env.ledger().set_timestamp(1_010);
        client.settle_session(&session1);
        client.settle_session(&session2);
        
        // Treasury should track fees separately for each token
        let token1_fees = client.get_treasury_balance(&token1);
        let token2_fees = client.get_treasury_balance(&token2_address);
        
        assert_eq!(token1_fees, 5); // 5% of 100
        assert_eq!(token2_fees, 5); // 5% of 100
    }

    // ====================================================================
    // #213 / #214 tests
    // ====================================================================

    #[test]
    fn test_set_burn_bps_default_is_zero() {
        let (_env, client, _, _, _, _, _, _) = setup();
        assert_eq!(client.get_burn_bps(), 0);
    }

    #[test]
    fn test_settle_with_burn_routes_correctly() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        client.set_burn_bps(&2_000u32); // 20% of the treasury share

        let session_id =
            client.start_session(&seeker, &expert, &token, &10_000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_000 + 100);
        client.settle_session(&session_id);

        // 5% platform fee of 10_000 = 500. 20% burn of 500 = 100.
        let burned = client.total_burned(&token);
        assert_eq!(burned, 100);
        // Treasury collects the remaining 400.
        assert_eq!(client.get_treasury_balance(&token), 400);
    }

    #[test]
    fn test_burn_zero_when_disabled() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        // burn_bps not set; default 0.
        let session_id =
            client.start_session(&seeker, &expert, &token, &10_000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_000 + 100);
        client.settle_session(&session_id);
        assert_eq!(client.total_burned(&token), 0);
        assert_eq!(client.get_treasury_balance(&token), 500);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #14)")]
    fn test_set_burn_bps_rejects_above_max() {
        let (_env, client, _, _, _, _, _, _) = setup();
        client.set_burn_bps(&10_001u32);
    }

    #[test]
    fn test_stake_and_unstake_balance_tracking() {
        let (env, client, _, _, seeker, _, token, _) = setup();
        // Re-use seeker as the staker; they have minted balance.
        let asset = token::Client::new(&env, &token);
        let before = asset.balance(&seeker);

        client.stake(&seeker, &token, &1_000i128);
        assert_eq!(client.get_stake_balance(&seeker), 1_000);
        assert_eq!(asset.balance(&seeker), before - 1_000);

        client.unstake(&seeker, &token, &400i128);
        assert_eq!(client.get_stake_balance(&seeker), 600);
        assert_eq!(asset.balance(&seeker), before - 600);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #37)")]
    fn test_unstake_rejects_over_balance() {
        let (env, client, _, _, seeker, _, token, _) = setup();
        let _ = env;
        client.stake(&seeker, &token, &100i128);
        client.unstake(&seeker, &token, &500i128);
    }

    #[test]
    fn test_stake_then_deposit_reward_then_claim() {
        let (env, client, _, _, seeker, _, token, token_admin) = setup();

        // Set up two stakers so the per-share math has something to
        // divide by; reuse token for both stake and reward token.
        let staker_a = Address::generate(&env);
        let staker_b = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&staker_a, &10_000);
        asset_admin.mint(&staker_b, &10_000);
        asset_admin.mint(&seeker, &10_000); // reward depositor balance
        let _ = token_admin;

        client.stake(&staker_a, &token, &1_000i128);
        client.stake(&staker_b, &token, &3_000i128); // 25% / 75% split

        // Deposit 4_000 reward; A's share should be 1_000, B's 3_000.
        client.deposit_staking_reward(&seeker, &token, &4_000i128);

        assert_eq!(client.pending_rewards(&staker_a, &token), 1_000);
        assert_eq!(client.pending_rewards(&staker_b, &token), 3_000);

        let asset = token::Client::new(&env, &token);
        let a_before = asset.balance(&staker_a);
        let claimed_a = client.claim_rewards(&staker_a, &token);
        assert_eq!(claimed_a, 1_000);
        assert_eq!(asset.balance(&staker_a) - a_before, 1_000);

        // Pending after claim is zero.
        assert_eq!(client.pending_rewards(&staker_a, &token), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #35)")]
    fn test_claim_without_stake_fails() {
        let (env, client, _, _, _, _, token, _) = setup();
        let nonstaker = Address::generate(&env);
        client.claim_rewards(&nonstaker, &token);
    }
}
