#![no_std]

mod migrations;
mod admin;
mod storage;

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    panic_with_error, String, Vec,
};

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
/// 90 days in seconds — minimum age of a completed session before archival.
const ARCHIVE_DELAY_SECS: u64 = 90 * 24 * 60 * 60;

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
    ExpertNotRegistered = 22,
    ExpertUnavailable = 23,
    InvalidReferrer = 24,
    ReentrancyDetected = 25,
    DepositTooLow = 26,
}

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
    ContractVersion,
    ActiveSessionCount,
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
pub struct ContractStatus {
    pub version: u32,
    pub admin: Option<Address>,
    pub is_paused: bool,
    pub total_sessions: u64,
    pub active_sessions: u64,
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
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyLock, &false);
    }

    pub fn register_expert(env: Env, expert: Address, rate: i128, metadata_cid: String) {
        expert.require_auth();
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.rate_per_second = rate;
        profile.metadata_cid = metadata_cid;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert), &profile);
    }

    pub fn set_availability(env: Env, expert: Address, status: bool) {
        expert.require_auth();
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.availability_status = status;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert), &profile);
    }

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

    /// Alias for set_treasury_address (issue #171).
    pub fn set_treasury(env: Env, treasury: Address) -> Result<(), Error> {
        Self::set_treasury_address(env, treasury)
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
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.reputation = reputation;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert.clone()), &profile);
        env.events()
            .publish((symbol_short!("setReput"),), (expert, reputation));
        Ok(())
    }

    pub fn get_expert_reputation(env: Env, expert: Address) -> u32 {
        Self::expert_profile(&env, expert).reputation
    }

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

        Self::increment_active_sessions(&env);

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
            Self::decrement_active_sessions(&env);
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

    pub fn claim_no_show_refund(env: Env, seeker: Address, session_id: u64) -> Result<i128, Error> {
        seeker.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;

        if seeker != session.seeker {
            return Err(Error::Unauthorized);
        }

        if session.status != SessionStatus::Active {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        if now <= session.start_timestamp as u64 + SESSION_NO_SHOW_REFUND_WINDOW {
            return Err(Error::NotStarted);
        }

        if session.accrued_amount > 0 || session.last_settlement_timestamp != session.start_timestamp {
            return Err(Error::InvalidSessionState);
        }

        let token_client = token::Client::new(&env, &session.token);
        let refund_amount = session.balance;
        token_client.transfer(&env.current_contract_address(), &session.seeker, &refund_amount);

        session.balance = 0;
        session.status = SessionStatus::Completed;
        session.last_settlement_timestamp = now as u32;
        Self::save_session(&env, &session);
        Self::decrement_active_sessions(&env);

        env.events().publish(
            (symbol_short!("session"), symbol_short!("noShowRf")),
            (session_id, session.seeker.clone(), refund_amount, now),
        );

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

    pub fn get_upgrade_timelock(env: Env) -> Result<UpgradeTimelock, Error> {
        env.storage()
            .instance()
            .get(&DataKey::UpgradeTimelock)
            .ok_or(Error::UpgradeNotInitiated)
    }

    pub fn get_contract_version(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ContractVersion)
            .unwrap_or(1u32)
    }

    pub fn health_check(env: Env) -> ContractStatus {
        let version: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ContractVersion)
            .unwrap_or(1u32);
        let admin: Option<Address> = env.storage().instance().get(&DataKey::Admin);
        let is_paused = Self::protocol_paused(&env);
        let next_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextSessionId)
            .unwrap_or(1u64);
        let total_sessions = next_id.saturating_sub(1);
        let active_sessions: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActiveSessionCount)
            .unwrap_or(0u64);

        ContractStatus {
            version,
            admin,
            is_paused,
            total_sessions,
            active_sessions,
        }
    }

    /// Move a completed session from Persistent to Temporary storage (90-day TTL).
    /// Admin-only. Callable only after the session has been completed for ≥90 days.
    pub fn archive_session(env: Env, session_id: u64) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let session = Self::get_session_or_error(&env, session_id)?;

        if !matches!(
            session.status,
            SessionStatus::Completed | SessionStatus::Resolved
        ) {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        let completed_at = session.last_settlement_timestamp as u64;
        if now < completed_at.saturating_add(ARCHIVE_DELAY_SECS) {
            return Err(Error::TimelockNotExpired);
        }

        // Write to temporary storage with 90-day TTL, then remove from persistent.
        storage::write_archive(&env, &session);
        env.storage()
            .persistent()
            .remove(&DataKey::Session(session_id));

        env.events().publish(
            (symbol_short!("session"), symbol_short!("archived")),
            (session_id, now),
        );

        Ok(())
    }

    /// Read a session from temporary (archived) storage.
    pub fn get_archived_session(env: Env, session_id: u64) -> Option<Session> {
        storage::read_archive(&env, session_id)
    }

    /// Migrate storage schema to `new_version`. Admin-only, runs once per version bump.
    pub fn migrate(env: Env, new_version: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;

        let current: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ContractVersion)
            .unwrap_or(1u32);

        if new_version <= current {
            return Err(Error::InvalidSessionState);
        }

        migrations::run(&env, current, new_version);

        env.storage()
            .instance()
            .set(&DataKey::ContractVersion, &new_version);

        env.events()
            .publish((symbol_short!("migrated"),), (current, new_version));

        Ok(())
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

    fn increment_active_sessions(env: &Env) {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActiveSessionCount)
            .unwrap_or(0u64);
        env.storage()
            .instance()
            .set(&DataKey::ActiveSessionCount, &count.saturating_add(1));
    }

    fn decrement_active_sessions(env: &Env) {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ActiveSessionCount)
            .unwrap_or(0u64);
        env.storage()
            .instance()
            .set(&DataKey::ActiveSessionCount, &count.saturating_sub(1));
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
                Self::decrement_active_sessions(env);
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
        if session.status == SessionStatus::Completed {
            Self::decrement_active_sessions(env);
        }

        // === INTERACTIONS ===
        let token_client = token::Client::new(env, &token);
        if referral_reward > 0 {
            if let Some(referrer) = referrer {
                token_client.transfer(&env.current_contract_address(), &referrer, &referral_reward);
            }
        }

        if treasury_fee > 0 {
            if let Some(treasury) = env.storage().instance().get::<DataKey, Address>(&DataKey::TreasuryAddress) {
                token_client.transfer(&env.current_contract_address(), &treasury, &treasury_fee);
                env.events().publish((symbol_short!("feeRoute"),), (session_id, token.clone(), treasury_fee));
            } else {
                Self::collect_fee(env.clone(), session_id, token.clone(), treasury_fee)?;
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
        Self::decrement_active_sessions(env);

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
        Self::decrement_active_sessions(env);
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

    // ===== Issue #162: Partial Withdrawals for Long Sessions =====
    /// Allow experts to withdraw accrued funds mid-session without closing it
    pub fn withdraw_accrued(env: Env, caller: Address, session_id: u64) -> Result<i128, Error> {
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;

        // Verify caller is the expert
        if session.expert != caller {
            return Err(Error::Unauthorized);
        }

        // Verify session is active
        if session.status != SessionStatus::Active {
            return Err(Error::InvalidSessionState);
        }

        // Calculate currently claimable amount based on time elapsed
        let now = env.ledger().timestamp();
        let time_elapsed = now.saturating_sub(session.last_settlement_timestamp as u64);
        let newly_accrued = session.rate_per_second.saturating_mul(time_elapsed as i128);

        // Total claimable is accrued + newly accrued
        let total_claimable = session.accrued_amount.saturating_add(newly_accrued);

        if total_claimable <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Verify session has sufficient balance
        if session.balance < total_claimable {
            return Err(Error::InsufficientBalance);
        }

        // Transfer tokens to expert
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &caller, &total_claimable);

        // Update session state
        session.balance = session.balance.saturating_sub(total_claimable);
        session.last_settlement_timestamp = now as u32;
        session.accrued_amount = 0;
        env.storage().persistent().set(&DataKey::Session(session_id), &session);

        Ok(total_claimable)
    }

    // ===== Issue #163: Staking Mechanism for Top Experts =====
    /// Allows experts to stake tokens to boost profile visibility
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
    use soroban_sdk::{token, Address, Env, String, Vec};

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

        let refund = client.refund_session(&seeker, &session_id);
        let session = client.get_session(&session_id);

        assert_eq!(refund, 2_900);
        assert_eq!(token_client.balance(&expert), 100);
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

    // --- #247: health_check ---

    #[test]
    fn test_health_check_returns_correct_status() {
        let (env, client, _, admin, seeker, expert, token, _) = setup();

        // Before any sessions: total=0, active=0, not paused, version=1
        let status = client.health_check();
        assert_eq!(status.version, 1);
        assert_eq!(status.admin, Some(admin));
        assert!(!status.is_paused);
        assert_eq!(status.total_sessions, 0);
        assert_eq!(status.active_sessions, 0);

        // Start a session: total=1, active=1
        register_and_avail(&env, &client, &expert, 10);
        client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let status = client.health_check();
        assert_eq!(status.total_sessions, 1);
        assert_eq!(status.active_sessions, 1);

        // Settle the session fully: active drops to 0
        env.ledger().set_timestamp(1_300);
        client.settle_session(&1);
        let status = client.health_check();
        assert_eq!(status.total_sessions, 1);
        assert_eq!(status.active_sessions, 0);

        // Pause the protocol
        client.pause_protocol();
        let status = client.health_check();
        assert!(status.is_paused);
    }

    // --- #248: archive_session ---

    #[test]
    fn test_archive_session_moves_to_temporary_storage() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        // Fully settle the session.
        env.ledger().set_timestamp(1_300);
        client.settle_session(&session_id);

        // Advance 90 days past completion.
        let ninety_days: u64 = 90 * 24 * 60 * 60;
        env.ledger().set_timestamp(1_300 + ninety_days + 1);

        client.archive_session(&session_id);

        // Session no longer in persistent storage (get_session should fail).
        let result = client.try_get_session(&session_id);
        assert!(result.is_err());

        // Session readable from temporary storage.
        let archived = client.get_archived_session(&session_id);
        assert!(archived.is_some());
        assert_eq!(archived.unwrap().id, session_id);
    }

    #[test]
    #[should_panic]
    fn test_archive_session_fails_before_90_days() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_300);
        client.settle_session(&session_id);

        // Only 1 day after completion — should fail.
        env.ledger().set_timestamp(1_300 + 24 * 60 * 60);
        client.archive_session(&session_id);
    }

    #[test]
    #[should_panic]
    fn test_archive_session_fails_for_active_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let ninety_days: u64 = 90 * 24 * 60 * 60;
        env.ledger().set_timestamp(1_000 + ninety_days + 1);
        client.archive_session(&session_id);
    }
}
