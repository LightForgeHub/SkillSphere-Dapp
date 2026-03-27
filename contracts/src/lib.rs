#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
};

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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextSessionId,
    Session(u64),
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

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextSessionId, &1u64);
    }

    pub fn start_session(
        env: Env,
        seeker: Address,
        expert: Address,
        token: Address,
        rate_per_second: i128,
        amount: i128,
    ) -> Result<u64, Error> {
        seeker.require_auth();

        if rate_per_second <= 0 || amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&seeker) < amount {
            return Err(Error::InsufficientBalance);
        }

        let session_id = Self::next_session_id(&env);
        let now = env.ledger().timestamp();

        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

        let session = Session {
            id: session_id,
            seeker,
            expert,
            token,
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

        Ok(session_id)
    }

    pub fn calculate_claimable_amount(
        env: Env,
        session_id: u64,
        current_time: u64,
    ) -> Result<i128, Error> {
        let session = Self::get_session_or_error(&env, session_id)?;
        Ok(Self::claimable_amount_for_session(&session, current_time))
    }

    pub fn pause_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        if session.status != SessionStatus::Active {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        let streamed = Self::streamed_amount_since(&session, now);
        session.accrued_amount = session.accrued_amount.saturating_add(streamed);
        session.last_settlement_timestamp = now;
        session.status = SessionStatus::Paused;

        Self::save_session(&env, &session);
        env.events().publish((symbol_short!("paused"),), session_id);

        Ok(())
    }

    pub fn resume_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
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
        let mut session = Self::get_session_or_error(&env, session_id)?;
        session.expert.require_auth();

        if matches!(
            session.status,
            SessionStatus::Finished | SessionStatus::Disputed
        ) {
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        let claimable = Self::claimable_amount_for_session(&session, now);

        if claimable <= 0 {
            return Ok(0);
        }

        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &session.expert, &claimable);

        session.balance -= claimable;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = now;

        if session.balance == 0 {
            session.status = SessionStatus::Finished;
        }

        Self::save_session(&env, &session);
        env.events()
            .publish((symbol_short!("settled"),), (session_id, claimable));

        Ok(claimable)
    }

    pub fn end_session(env: Env, caller: Address, session_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        if session.status == SessionStatus::Finished {
            return Err(Error::AlreadyFinished);
        }

        let now = env.ledger().timestamp();
        let claimable = Self::claimable_amount_for_session(&session, now);
        let token_client = token::Client::new(&env, &session.token);

        if claimable > 0 {
            token_client.transfer(&env.current_contract_address(), &session.expert, &claimable);
        }

        let remaining = session.balance - claimable;
        if remaining > 0 {
            token_client.transfer(&env.current_contract_address(), &session.seeker, &remaining);
        }

        session.balance = 0;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = now;
        session.status = SessionStatus::Finished;

        Self::save_session(&env, &session);

        Ok(())
    }

    pub fn get_session(env: Env, session_id: u64) -> Result<Session, Error> {
        Self::get_session_or_error(&env, session_id)
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
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{token, Env};

    fn setup() -> (
        Env,
        SkillSphereContractClient<'static>,
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
            seeker,
            expert,
            token_address,
            token_admin,
        )
    }

    #[test]
    fn test_calculate_claimable_amount_same_time_returns_zero() {
        let (env, client, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500);

        let claimable = client.calculate_claimable_amount(&session_id, &env.ledger().timestamp());
        assert_eq!(claimable, 0);
    }

    #[test]
    fn test_start_session_locks_tokens_and_creates_session() {
        let (env, client, contract_id, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &5, &300);

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
        let (_, client, _, seeker, expert, token, _) = setup();
        client.start_session(&seeker, &expert, &token, &5, &2_000);
    }

    #[test]
    fn test_linear_streaming_caps_at_remaining_balance() {
        let (env, client, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &20, &100);

        let claimable =
            client.calculate_claimable_amount(&session_id, &(env.ledger().timestamp() + 10));
        assert_eq!(claimable, 100);
    }

    #[test]
    fn test_pause_and_resume_preserve_accrued_amount() {
        let (env, client, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500);

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
        let (env, client, _, seeker, expert, token, _) = setup();
        let stranger = Address::generate(&env);
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500);

        client.pause_session(&stranger, &session_id);
    }

    #[test]
    fn test_settle_session_transfers_partial_milestone_payment() {
        let (env, client, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500);
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
        let (env, client, _, seeker, expert, token, _) = setup();
        let session_id = client.start_session(&seeker, &expert, &token, &10, &500);
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
}
