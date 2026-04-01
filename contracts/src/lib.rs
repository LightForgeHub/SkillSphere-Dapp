#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    String, Vec,
};

const MAX_BPS: u32 = 10_000;
const TIMELOCK_DURATION: u64 = 48 * 60 * 60;
const DISPUTE_EXPIRY_WINDOW: u64 = 30 * 24 * 60 * 60;
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

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    SessionNotFound = 2,
    InvalidSessionState = 3,
    InsufficientBalance = 4,
    InvalidAmount = 5,
    NotStarted = 6,
    AlreadyFinished = 7,
    DisputeNotFound = 8,
    UpgradeNotInitiated = 9,
    TimelockNotExpired = 10,
    EmptyDisputeReason = 11,
    ProtocolPaused = 12,
    ReputationTooLow = 13,
    InvalidFeeBps = 14,
    SessionExpired = 15,
    InvalidCid = 16,
    InvalidSplitBps = 17,
    DisputeWindowActive = 18,
    InvalidFeeConfig = 19,
    InsufficientTreasuryBalance = 20,
    AmountBelowMinimum = 21,
    InvalidReferrer = 22,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextSessionId,
    PlatformFeeConfig,
    MinimumSessionDeposit,
    ProtocolPaused,
    ExpertProfile(Address),
    ExpertReputation(Address),
    Session(u64),
    Dispute(u64),
    UpgradeTimelock,
    StakingContract,
    ExpertStakedBalance(Address),
    TreasuryAddress,
    TreasuryBalance(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SessionStatus {
    Active,
    Paused,
    Finished,
    Disputed,
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    pub session_id: u64,
    pub reason: String,
    pub evidence_cid: String,
    pub created_at: u64,
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
    pub referrer: Option<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeTimelock {
    pub new_wasm_hash: BytesN<32>,
    pub initiated_at: u64,
    pub execute_after: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Session {
    pub id: u64,
    pub seeker: Address,
    pub expert: Address,
    pub token: Address,
    pub rate_per_second: i128,
    pub start_timestamp: u64,
    pub last_settlement_timestamp: u64,
    pub status: SessionStatus,
    pub balance: i128,
    pub accrued_amount: i128,
    pub metadata_cid: String,
}

#[contract]
pub struct SkillSphereContract;

#[contractimpl]
impl SkillSphereContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
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
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        new_admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.events()
            .publish((symbol_short!("setAdmin"),), new_admin);

        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        Self::get_admin_address(&env)
    }

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

    pub fn get_fee(env: Env) -> u32 {
        Self::fee_config(&env).first_tier_bps
    }

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

    pub fn get_fee_config(env: Env) -> FeeConfig {
        Self::fee_config(&env)
    }

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

    pub fn get_min_session_deposit(env: Env) -> i128 {
        Self::min_session_deposit(&env)
    }

    pub fn set_staking_contract(env: Env, staking_contract: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::StakingContract, &staking_contract);
        env.events()
            .publish((symbol_short!("setStake"),), staking_contract);
        Ok(())
    }

    pub fn get_staking_contract(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::StakingContract)
    }

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

    pub fn get_expert_staked_balance(env: Env, expert: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertStakedBalance(expert))
            .unwrap_or(0i128)
    }

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

    pub fn set_expert_referrer(env: Env, expert: Address, referrer: Address) -> Result<(), Error> {
        expert.require_auth();

        if expert == referrer {
            return Err(Error::InvalidReferrer);
        }

        env.storage().persistent().set(
            &DataKey::ExpertProfile(expert.clone()),
            &ExpertProfile {
                referrer: Some(referrer.clone()),
            },
        );
        env.events()
            .publish((symbol_short!("setRefrr"),), (expert, referrer));

        Ok(())
    }

    pub fn get_expert_profile(env: Env, expert: Address) -> ExpertProfile {
        Self::expert_profile(&env, expert)
    }

    pub fn get_expert_referrer(env: Env, expert: Address) -> Option<Address> {
        Self::expert_profile(&env, expert).referrer
    }

    pub fn set_treasury_address(env: Env, treasury: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::TreasuryAddress, &treasury);
        env.events().publish((symbol_short!("setTreas"),), treasury);
        Ok(())
    }

    pub fn get_treasury_address(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::TreasuryAddress)
    }

    pub fn get_treasury_balance(env: Env, token: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TreasuryBalance(token))
            .unwrap_or(0i128)
    }

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

    pub fn calculate_platform_fee(env: Env, session_amount: i128) -> Result<i128, Error> {
        if session_amount < 0 {
            return Err(Error::InvalidAmount);
        }

        let config = Self::fee_config(&env);
        Ok(Self::calculate_tiered_fee(&config, session_amount))
    }

    pub fn pause_protocol(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::ProtocolPaused, &true);
        env.events().publish((symbol_short!("protPause"),), true);
        Ok(())
    }

    pub fn unpause_protocol(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::ProtocolPaused, &false);
        env.events().publish((symbol_short!("protPause"),), false);
        Ok(())
    }

    pub fn is_protocol_paused(env: Env) -> bool {
        Self::protocol_paused(&env)
    }

    pub fn set_expert_reputation(env: Env, expert: Address, reputation: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertReputation(expert.clone()), &reputation);
        env.events()
            .publish((symbol_short!("setReput"),), (expert, reputation));
        Ok(())
    }

    pub fn get_expert_reputation(env: Env, expert: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertReputation(expert))
            .unwrap_or(0u32)
    }

    pub fn start_session(
        env: Env,
        seeker: Address,
        expert: Address,
        token: Address,
        rate_per_second: i128,
        amount: i128,
        min_reputation: u32,
        metadata_cid: String,
    ) -> Result<u64, Error> {
        Self::ensure_protocol_active(&env)?;
        seeker.require_auth();

        if rate_per_second <= 0 || amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if amount < Self::min_session_deposit(&env) {
            return Err(Error::AmountBelowMinimum);
        }
        if !Self::is_valid_ipfs_cid(&metadata_cid) {
            return Err(Error::InvalidCid);
        }

        if Self::get_expert_reputation(env.clone(), expert.clone()) < min_reputation {
            return Err(Error::ReputationTooLow);
        }

        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&seeker) < amount {
            return Err(Error::InsufficientBalance);
        }

        let session_id = Self::next_session_id(&env);
        let now = env.ledger().timestamp();

        let session = Session {
            id: session_id,
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: token.clone(),
            rate_per_second,
            start_timestamp: now,
            last_settlement_timestamp: now,
            status: SessionStatus::Active,
            balance: amount,
            accrued_amount: 0,
            metadata_cid: metadata_cid.clone(),
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
                rate_per_second,
                amount,
                now,
                metadata_cid,
            ),
        );

        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

        Ok(session_id)
    }

    pub fn calculate_claimable_amount(
        env: Env,
        session_id: u64,
        current_time: u64,
    ) -> Result<i128, Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        let effective_time = Self::bounded_time(&session, current_time);
        Ok(Self::claimable_amount_for_session(&session, effective_time))
    }

    pub fn calculate_expiry_timestamp(env: Env, session_id: u64) -> Result<u64, Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        Ok(Self::expiry_timestamp_for_session(&session))
    }

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
        session.last_settlement_timestamp = now;
        session.status = SessionStatus::Paused;

        Self::save_session(&env, &session);
        env.events().publish(
            (symbol_short!("session"), symbol_short!("paused")),
            (session_id, now),
        );

        Ok(())
    }

    pub fn resume_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        Self::ensure_protocol_active(&env)?;
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        if session.status != SessionStatus::Paused {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        session.last_settlement_timestamp = now;
        session.status = SessionStatus::Active;

        Self::save_session(&env, &session);
        env.events().publish(
            (symbol_short!("session"), symbol_short!("resumed")),
            (session_id, now),
        );

        Ok(())
    }

    pub fn settle_session(env: Env, session_id: u64) -> Result<i128, Error> {
        Self::ensure_protocol_active(&env)?;
        let session = Self::get_session_or_error(&env, session_id)?;
        session.expert.require_auth();
        Self::internal_settle(&env, session)
    }

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

    pub fn refund_session(env: Env, seeker: Address, session_id: u64) -> Result<i128, Error> {
        seeker.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;

        if seeker != session.seeker {
            return Err(Error::Unauthorized);
        }

        let (_, refund_amount) = Self::close_session(&env, &mut session)?;
        Ok(refund_amount)
    }

    pub fn end_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        Self::close_session(&env, &mut session)?;

        Ok(())
    }

    pub fn get_session(env: Env, session_id: u64) -> Result<Session, Error> {
        Self::get_session_or_error(&env, session_id)
    }

    pub fn get_current_earnings(env: Env, session_id: u64) -> Result<i128, Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        let now = env.ledger().timestamp();
        let effective_time = Self::bounded_time(&session, now);
        Ok(Self::claimable_amount_for_session(&session, effective_time))
    }

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
            created_at: env.ledger().timestamp(),
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

    pub fn get_dispute(env: Env, session_id: u64) -> Result<Dispute, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Dispute(session_id))
            .ok_or(Error::DisputeNotFound)
    }

    pub fn initiate_upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let now = env.ledger().timestamp();
        let timelock = UpgradeTimelock {
            new_wasm_hash,
            initiated_at: now,
            execute_after: now + TIMELOCK_DURATION,
        };

        env.storage()
            .instance()
            .set(&DataKey::UpgradeTimelock, &timelock);

        env.events().publish((symbol_short!("upgInit"),), now);

        Ok(())
    }

    pub fn execute_upgrade(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let timelock: UpgradeTimelock = env
            .storage()
            .instance()
            .get(&DataKey::UpgradeTimelock)
            .ok_or(Error::UpgradeNotInitiated)?;

        let now = env.ledger().timestamp();
        if now < timelock.execute_after {
            return Err(Error::TimelockNotExpired);
        }

        env.storage().instance().remove(&DataKey::UpgradeTimelock);
        env.deployer()
            .update_current_contract_wasm(timelock.new_wasm_hash);

        env.events().publish((symbol_short!("upgExec"),), now);

        Ok(())
    }

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

    fn require_participant(session: &Session, caller: &Address) -> Result<(), Error> {
        if *caller != session.seeker && *caller != session.expert {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn internal_settle(env: &Env, mut session: Session) -> Result<i128, Error> {
        if matches!(
            session.status,
            SessionStatus::Finished | SessionStatus::Disputed | SessionStatus::Resolved
        ) {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        let expiry = Self::expiry_timestamp_for_session(&session);
        let effective_time = Self::bounded_time(&session, now);
        let claimable = Self::claimable_amount_for_session(&session, effective_time);

        if claimable <= 0 {
            if now > expiry {
                session.status = SessionStatus::Finished;
                session.last_settlement_timestamp = expiry;
                Self::save_session(env, &session);
                return Err(Error::SessionExpired);
            }
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
        let expert_payout = claimable.saturating_sub(platform_fee);

        session.balance -= claimable;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = effective_time;

        if session.balance == 0 || now >= expiry {
            session.status = SessionStatus::Finished;
        }

        let session_id = session.id;
        let expert = session.expert.clone();
        let token = session.token.clone();

        Self::save_session(env, &session);

        let token_client = token::Client::new(env, &token);
        if referral_reward > 0 {
            if let Some(referrer) = referrer {
                token_client.transfer(&env.current_contract_address(), &referrer, &referral_reward);
            }
        }

        if treasury_fee > 0 {
            Self::collect_fee(env.clone(), session_id, token.clone(), treasury_fee)?;
        }

        token_client.transfer(&env.current_contract_address(), &expert, &expert_payout);

        env.events().publish(
            (symbol_short!("session"), symbol_short!("settled")),
            (session_id, expert_payout, now),
        );

        Ok(expert_payout)
    }

    fn close_session(env: &Env, session: &mut Session) -> Result<(i128, i128), Error> {
        if matches!(
            session.status,
            SessionStatus::Finished | SessionStatus::Disputed | SessionStatus::Resolved
        ) {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        let effective_time = Self::bounded_time(session, now);
        let claimable = Self::claimable_amount_for_session(session, effective_time);
        let remaining = session.balance - claimable;

        session.balance = 0;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = effective_time;
        session.status = SessionStatus::Finished;

        Self::save_session(env, session);

        let token_client = token::Client::new(env, &session.token);

        if claimable > 0 {
            token_client.transfer(&env.current_contract_address(), &session.expert, &claimable);
        }

        if remaining > 0 {
            token_client.transfer(&env.current_contract_address(), &session.seeker, &remaining);
        }

        let finished_at = env.ledger().timestamp();
        env.events().publish(
            (symbol_short!("session"), symbol_short!("finished")),
            (session.id, claimable, remaining, finished_at),
        );

        Ok((claimable, remaining))
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
        if current_time <= session.last_settlement_timestamp {
            return 0;
        }

        let elapsed = current_time - session.last_settlement_timestamp;
        (elapsed as i128).saturating_mul(session.rate_per_second)
    }

    fn expiry_timestamp_for_session(session: &Session) -> u64 {
        if session.rate_per_second <= 0 || session.balance <= 0 {
            return session.last_settlement_timestamp;
        }

        let funded_seconds =
            ((session.balance + session.rate_per_second - 1) / session.rate_per_second) as u64;

        session
            .last_settlement_timestamp
            .saturating_add(funded_seconds)
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
            .unwrap_or(ExpertProfile { referrer: None })
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
        dispute.created_at.saturating_add(DISPUTE_EXPIRY_WINDOW)
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
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{token, Address, Env, String, Vec};

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
        asset_admin.mint(&seeker, &1_000);

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
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

        let claimable = client.calculate_claimable_amount(&session_id, &env.ledger().timestamp());
        assert_eq!(claimable, 0);
    }

    #[test]
    fn test_start_session_locks_tokens_and_creates_session() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &5, &300, &0, &test_cid(&env));

        let session = client.get_session(&session_id);
        let token_client = token::Client::new(&env, &token);

        assert_eq!(session.id, session_id);
        assert_eq!(session.status, SessionStatus::Active);
        assert_eq!(session.balance, 300);
        assert_eq!(token_client.balance(&seeker), 700);
        assert_eq!(token_client.balance(&contract_id), 300);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #21)")]
    fn test_start_session_fails_when_amount_is_below_minimum_deposit() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        client.start_session(&seeker, &expert, &token, &5, &99, &0, &test_cid(&env));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_start_session_fails_on_insufficient_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        client.start_session(&seeker, &expert, &token, &5, &2_000, &0, &test_cid(&env));
    }

    #[test]
    fn test_linear_streaming_caps_at_remaining_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &20, &100, &0, &test_cid(&env));

        let claimable =
            client.calculate_claimable_amount(&session_id, &(env.ledger().timestamp() + 10));
        assert_eq!(claimable, 100);
    }

    #[test]
    fn test_pause_and_resume_preserve_accrued_amount() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

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
        let stranger = Address::generate(&env);
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

        client.pause_session(&stranger, &session_id);
    }

    #[test]
    fn test_settle_session_transfers_partial_milestone_payment() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_020);
        let settled = client.settle_session(&session_id);
        assert_eq!(settled, 190);
        assert_eq!(token_client.balance(&expert), 190);
        assert_eq!(client.get_treasury_balance(&token), 10);

        let session = client.get_session(&session_id);
        assert_eq!(session.balance, 300);
        assert_eq!(session.last_settlement_timestamp, 1_020);
        assert_eq!(session.status, SessionStatus::Active);
    }

    #[test]
    fn test_multiple_settlements_track_milestones_without_ending_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_010);
        assert_eq!(client.settle_session(&session_id), 95);

        env.ledger().set_timestamp(1_025);
        assert_eq!(client.settle_session(&session_id), 143);

        let session = client.get_session(&session_id);
        assert_eq!(token_client.balance(&expert), 238);
        assert_eq!(client.get_treasury_balance(&token), 12);
        assert_eq!(session.balance, 250);
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

        assert_eq!(client.get_min_session_deposit(), 100);

        client.set_min_session_deposit(&250);
        assert_eq!(client.get_min_session_deposit(), 250);

        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &250, &0, &test_cid(&env));
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
        client.start_session(&seeker, &expert, &token, &10, &500, &1, &test_cid(&env));
    }

    #[test]
    fn test_start_session_allows_expert_when_reputation_is_met() {
        let (env, client, _, _, seeker, expert, token, _) = setup();

        client.set_expert_reputation(&expert, &85);
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &80, &test_cid(&env));

        assert_eq!(session_id, 1);
        assert_eq!(client.get_expert_reputation(&expert), 85);
    }

    #[test]
    fn test_expiry_timestamp_uses_remaining_balance_and_rate() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &101, &0, &test_cid(&env));

        assert_eq!(client.calculate_expiry_timestamp(&session_id), 1_011);
    }

    #[test]
    fn test_settle_session_after_funded_window_drains_and_finishes() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_060);
        let settled = client.settle_session(&session_id);
        let session = client.get_session(&session_id);

        assert_eq!(settled, 475);
        assert_eq!(token_client.balance(&expert), 475);
        assert_eq!(client.get_treasury_balance(&token), 25);
        assert_eq!(session.balance, 0);
        assert_eq!(session.status, SessionStatus::Finished);
    }

    #[test]
    fn test_settle_session_pays_referrer_from_platform_fee() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let referrer = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        let token_client = token::Client::new(&env, &token);

        client.set_expert_referrer(&expert, &referrer);
        asset_admin.mint(&seeker, &4_000);

        let session_id =
            client.start_session(&seeker, &expert, &token, &100, &4_000, &0, &test_cid(&env));

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
        client.pause_protocol();

        client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
    }

    #[test]
    fn test_protocol_pause_blocks_settlement_but_allows_refund_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_010);
        client.pause_protocol();

        let refund = client.refund_session(&seeker, &session_id);
        let session = client.get_session(&session_id);

        assert_eq!(refund, 400);
        assert_eq!(token_client.balance(&expert), 100);
        assert_eq!(token_client.balance(&seeker), 900);
        assert_eq!(session.status, SessionStatus::Finished);
    }

    #[test]
    fn test_flag_dispute_stores_evidence_cid() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
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
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

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
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
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

        assert_eq!(token_client.balance(&seeker), 750);
        assert_eq!(token_client.balance(&expert), 250);
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
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
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

        assert_eq!(token_client.balance(&seeker), 1_000);
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
        client.withdraw_treasury(&token, &500, &treasury);
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
        let cid = test_cid(&env);
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0, &cid);

        let session = client.get_session(&session_id);
        assert_eq!(session.metadata_cid, cid);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #16)")]
    fn test_start_session_rejects_invalid_metadata_cid() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let bad_cid = String::from_str(&env, "not-a-valid-cid");
        client.start_session(&seeker, &expert, &token, &10, &500, &0, &bad_cid);
    }

    #[test]
    fn test_start_session_accepts_cid_v1() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let cid_v1 = String::from_str(&env, "bafybeigdyrzt5zq3w7x7o6m2e6l6i5zv6sq7sd");
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0, &cid_v1);

        let session = client.get_session(&session_id);
        assert_eq!(session.metadata_cid, cid_v1);
    }

    // --- #137: get_current_earnings view function ---

    #[test]
    fn test_get_current_earnings_returns_zero_at_start() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 0);
    }

    #[test]
    fn test_get_current_earnings_reflects_elapsed_time() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_015);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 150);
    }

    #[test]
    fn test_get_current_earnings_caps_at_session_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &100, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_100);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 100);
    }

    #[test]
    fn test_get_current_earnings_zero_when_paused() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

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
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &2_000);

        let session_1 =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
        let session_2 =
            client.start_session(&seeker, &expert, &token, &5, &300, &0, &test_cid(&env));

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
        let other_expert = Address::generate(&env);
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &1_000);

        let session_1 =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));
        let session_2 = client.start_session(
            &seeker,
            &other_expert,
            &token,
            &10,
            &500,
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
        let session_id =
            client.start_session(&seeker, &expert, &token, &10, &500, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);

        let mut ids = Vec::new(&env);
        ids.push_back(session_id);
        ids.push_back(999u64);

        let results = client.batch_settle(&expert, &ids);

        assert_eq!(results.get(0).unwrap(), 95);
        assert_eq!(results.get(1).unwrap(), 0);
    }
}
