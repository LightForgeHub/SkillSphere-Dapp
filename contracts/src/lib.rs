#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    String,
};

const MAX_BPS: u32 = 10_000;
const TIMELOCK_DURATION: u64 = 48 * 60 * 60;

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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextSessionId,
    PlatformFeeBps,
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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, Copy)]
pub enum Resolution {
    SeekerWins = 0,
    ExpertWins = 1,
    Refund = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    pub session_id: u64,
    pub reason: String,
    pub ipfs_metadata_hash: String,
    pub created_at: u64,
    pub resolved: bool,
    pub resolution: u32,
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
        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBps, &0u32);
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

        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBps, &fee_bps);
        env.events().publish((symbol_short!("setFee"),), fee_bps);

        Ok(())
    }

    pub fn get_fee(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformFeeBps)
            .unwrap_or(0u32)
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
            SessionStatus::Finished | SessionStatus::Disputed
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
        ipfs_metadata_hash: String,
    ) -> Result<(), Error> {
        seeker.require_auth();

        if reason.is_empty() {
            return Err(Error::EmptyDisputeReason);
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
            ipfs_metadata_hash,
            created_at: env.ledger().timestamp(),
            resolved: false,
            resolution: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Dispute(session_id), &dispute);

        env.events()
            .publish((symbol_short!("disputed"),), session_id);

        Ok(())
    }

    pub fn resolve_dispute(env: Env, session_id: u64, resolution: Resolution) -> Result<(), Error> {
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

        dispute.resolved = true;
        dispute.resolution = match resolution {
            Resolution::SeekerWins => 1,
            Resolution::ExpertWins => 2,
            Resolution::Refund => 3,
        };
        session.status = SessionStatus::Finished;

        let token_client = token::Client::new(&env, &session.token);
        let mut seeker_amount = 0i128;
        let mut expert_amount = 0i128;

        match resolution {
            Resolution::SeekerWins => {
                seeker_amount = session.balance;
                session.balance = 0;
            }
            Resolution::ExpertWins => {
                expert_amount = session.balance;
                session.balance = 0;
            }
            Resolution::Refund => {
                expert_amount = session.accrued_amount.min(session.balance);
                seeker_amount = session.balance - expert_amount;
                session.balance = 0;
                session.accrued_amount = 0;
            }
        }

        Self::save_session(&env, &session);
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(session_id), &dispute);

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

        env.events()
            .publish((symbol_short!("resolved"),), session_id);

        Ok(())
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
            SessionStatus::Finished | SessionStatus::Disputed
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
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{token, Address, Env};

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
}
