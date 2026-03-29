#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    String,
};

const MAX_BPS: u32 = 10_000;
const TIMELOCK_DURATION: u64 = 48 * 60 * 60;
const DISPUTE_EXPIRY_WINDOW: u64 = 30 * 24 * 60 * 60;
const DEFAULT_FEE_FIRST_TIER_LIMIT: i128 = 1_000;
const DEFAULT_FEE_FIRST_TIER_BPS: u32 = 500;
const DEFAULT_FEE_SECOND_TIER_BPS: u32 = 300;

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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextSessionId,
    PlatformFeeConfig,
    ProtocolPaused,
    ExpertReputation(Address),
    Session(u64),
    Dispute(u64),
    UpgradeTimelock,
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
    ) -> Result<u64, Error> {
        Self::ensure_protocol_active(&env)?;
        seeker.require_auth();

        if rate_per_second <= 0 || amount <= 0 {
            return Err(Error::InvalidAmount);
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
        };

        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);
        env.events()
            .publish((symbol_short!("started"),), session_id);

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
        env.events().publish((symbol_short!("paused"),), session_id);

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

        session.last_settlement_timestamp = env.ledger().timestamp();
        session.status = SessionStatus::Active;

        Self::save_session(&env, &session);
        env.events()
            .publish((symbol_short!("resumed"),), session_id);

        Ok(())
    }

    pub fn settle_session(env: Env, session_id: u64) -> Result<i128, Error> {
        Self::ensure_protocol_active(&env)?;
        let mut session = Self::get_session_or_error(&env, session_id)?;
        session.expert.require_auth();

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
                Self::save_session(&env, &session);
                return Err(Error::SessionExpired);
            }

            return Ok(0);
        }

        session.balance -= claimable;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = effective_time;

        if session.balance == 0 || now >= expiry {
            session.status = SessionStatus::Finished;
        }

        Self::save_session(&env, &session);

        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &session.expert, &claimable);

        env.events()
            .publish((symbol_short!("settled"),), (session_id, claimable));

        Ok(claimable)
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

        env.events()
            .publish((symbol_short!("disputed"),), (session_id, evidence_cid));

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

        env.events().publish(
            (symbol_short!("finished"),),
            (session.id, claimable, remaining),
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

        env.events().publish(
            (symbol_short!("resolved"),),
            (
                session.id,
                seeker_amount,
                expert_amount,
                dispute.evidence_cid.clone(),
                auto_resolved,
            ),
        );

        Ok(())
    }

    fn dispute_expiry_timestamp(dispute: &Dispute) -> u64 {
        dispute.created_at.saturating_add(DISPUTE_EXPIRY_WINDOW)
    }

    fn is_valid_ipfs_cid(cid: &String) -> bool {
        let len = cid.len() as usize;
        if len < 2 || len > 64 {
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
    use soroban_sdk::{token, Address, Env, String};

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
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);

        let claimable = client.calculate_claimable_amount(&session_id, &env.ledger().timestamp());
        assert_eq!(claimable, 0);
    }

    #[test]
    fn test_start_session_locks_tokens_and_creates_session() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &5, &300, &0);

        let session = client.get_session(&session_id);
        let token_client = token::Client::new(&env, &token);

        assert_eq!(session.id, session_id);
        assert_eq!(session.status, SessionStatus::Active);
        assert_eq!(session.balance, 300);
        assert_eq!(token_client.balance(&seeker), 700);
        assert_eq!(token_client.balance(&contract_id), 300);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_start_session_fails_on_insufficient_balance() {
        let (_, client, _, _, seeker, expert, token, _) = setup();
        client.start_session(&seeker, &expert, &token, &5, &2_000, &0);
    }

    #[test]
    fn test_linear_streaming_caps_at_remaining_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &20, &100, &0);

        let claimable =
            client.calculate_claimable_amount(&session_id, &(env.ledger().timestamp() + 10));
        assert_eq!(claimable, 100);
    }

    #[test]
    fn test_pause_and_resume_preserve_accrued_amount() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);

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
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);

        client.pause_session(&stranger, &session_id);
    }

    #[test]
    fn test_settle_session_transfers_partial_milestone_payment() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_020);
        let settled = client.settle_session(&session_id);
        assert_eq!(settled, 200);
        assert_eq!(token_client.balance(&expert), 200);

        let session = client.get_session(&session_id);
        assert_eq!(session.balance, 300);
        assert_eq!(session.last_settlement_timestamp, 1_020);
        assert_eq!(session.status, SessionStatus::Active);
    }

    #[test]
    fn test_multiple_settlements_track_milestones_without_ending_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_010);
        assert_eq!(client.settle_session(&session_id), 100);

        env.ledger().set_timestamp(1_025);
        assert_eq!(client.settle_session(&session_id), 150);

        let session = client.get_session(&session_id);
        assert_eq!(token_client.balance(&expert), 250);
        assert_eq!(session.balance, 250);
        assert_eq!(session.status, SessionStatus::Active);
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
        let (_, client, _, _, seeker, expert, token, _) = setup();
        client.start_session(&seeker, &expert, &token, &10, &500, &1);
    }

    #[test]
    fn test_start_session_allows_expert_when_reputation_is_met() {
        let (_, client, _, _, seeker, expert, token, _) = setup();

        client.set_expert_reputation(&expert, &85);
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &80);

        assert_eq!(session_id, 1);
        assert_eq!(client.get_expert_reputation(&expert), 85);
    }

    #[test]
    fn test_expiry_timestamp_uses_remaining_balance_and_rate() {
        let (_, client, _, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &101, &0);

        assert_eq!(client.calculate_expiry_timestamp(&session_id), 1_011);
    }

    #[test]
    fn test_settle_session_after_funded_window_drains_and_finishes() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);
        let token_client = token::Client::new(&env, &token);

        env.ledger().set_timestamp(1_060);
        let settled = client.settle_session(&session_id);
        let session = client.get_session(&session_id);

        assert_eq!(settled, 500);
        assert_eq!(token_client.balance(&expert), 500);
        assert_eq!(session.balance, 0);
        assert_eq!(session.status, SessionStatus::Finished);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #12)")]
    fn test_protocol_pause_blocks_new_sessions() {
        let (_, client, _, _, seeker, expert, token, _) = setup();
        client.pause_protocol();

        client.start_session(&seeker, &expert, &token, &10, &500, &0);
    }

    #[test]
    fn test_protocol_pause_blocks_settlement_but_allows_refund_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);
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
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);
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
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);

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
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);
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
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500, &0);
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
}
