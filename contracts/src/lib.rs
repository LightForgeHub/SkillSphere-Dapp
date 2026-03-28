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
    DisputeNotFound = 8,
    UpgradeNotInitiated = 9,
    TimelockNotExpired = 10,
    EmptyDisputeReason = 11,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextSessionId,
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
    pub reason: soroban_sdk::String,
    pub ipfs_metadata_hash: soroban_sdk::String,
    pub created_at: u64,
    pub resolved: bool,
    pub resolution: u32, // 0 = unresolved, 1 = SeekerWins, 2 = ExpertWins, 3 = Refund
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeTimelock {
    pub new_wasm_hash: soroban_sdk::BytesN<32>,
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

        // Effects: Update internal state BEFORE token transfer (Checks-Effects-Interactions)
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

        // Interactions: Perform external call (token transfer) after state update
        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

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

        // Effects: Update internal state BEFORE token transfer (Checks-Effects-Interactions)
        session.balance -= claimable;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = now;

        if session.balance == 0 {
            session.status = SessionStatus::Finished;
        }

        Self::save_session(&env, &session);

        // Interactions: Perform external call (token transfer) after state update
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &session.expert, &claimable);

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
        
        // Effects: Update internal state BEFORE token transfers (Checks-Effects-Interactions)
        let remaining = session.balance - claimable;
        session.balance = 0;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = now;
        session.status = SessionStatus::Finished;

        Self::save_session(&env, &session);

        // Interactions: Perform external calls (token transfers) after state update
        let token_client = token::Client::new(&env, &session.token);

        if claimable > 0 {
            token_client.transfer(&env.current_contract_address(), &session.expert, &claimable);
        }

        if remaining > 0 {
            token_client.transfer(&env.current_contract_address(), &session.seeker, &remaining);
        }

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

    // ============ DISPUTE FLAGGING MECHANISM (Issue #122) ============
    /// Initiates a dispute for a session, freezing the balance.
    /// Only seeker can flag a dispute with a reason.
    /// 
    /// # Parameters
    /// - session_id: ID of the session to dispute
    /// - seeker: Address of the seeker (must match session.seeker)
    /// - reason: String explaining dispute reason (required, non-empty)
    /// - ipfs_metadata_hash: IPFS hash containing dispute evidence and details
    ///
    /// # Effects
    /// - Changes session status to Disputed (prevents further settlements)
    /// - Freezes remaining balance until arbitrator resolves
    /// - Stores dispute record with metadata reference
    /// - Emits 'disputed' event
    ///
    /// # Arbitrator Access
    /// Use get_dispute(session_id) to retrieve dispute details and IPFS hash
    pub fn flag_dispute(
        env: Env,
        session_id: u64,
        seeker: Address,
        reason: soroban_sdk::String,
        ipfs_metadata_hash: soroban_sdk::String,
    ) -> Result<(), Error> {
        seeker.require_auth();

        if reason.is_empty() {
            return Err(Error::EmptyDisputeReason);
        }

        let mut session = Self::get_session_or_error(&env, session_id)?;

        // Only seeker can flag dispute
        if seeker != session.seeker {
            return Err(Error::Unauthorized);
        }

        // Can only dispute active or paused sessions
        if !matches!(session.status, SessionStatus::Active | SessionStatus::Paused) {
            return Err(Error::InvalidSessionState);
        }

        // Freeze balance by changing status to Disputed
        session.status = SessionStatus::Disputed;
        Self::save_session(&env, &session);

        // Store dispute details
        let dispute = Dispute {
            session_id,
            reason,
            ipfs_metadata_hash,
            created_at: env.ledger().timestamp(),
            resolved: false,
            resolution: 0, // 0 = unresolved
        };

        env.storage()
            .persistent()
            .set(&DataKey::Dispute(session_id), &dispute);

        env.events()
            .publish((symbol_short!("disputed"),), session_id);

        Ok(())
    }

    /// Resolves a dispute (admin/arbitrator only).
    /// Transfers funds based on resolution decision.
    /// 
    /// # Resolution Options
    /// - SeekerWins (1): Seeker gets full refund, expert gets nothing
    /// - ExpertWins (2): Expert gets full balance, seeker gets nothing  
    /// - Refund (3): Expert gets accrued_amount, seeker gets remaining balance
    ///
    /// # Arbitrator Notes
    /// - Always verify dispute reason and IPFS metadata before resolving
    /// - Check session.accrued_amount to understand expert's earned portion
    /// - Use Refund for partial service delivery scenarios
    /// - Emit 'resolved' event upon successful resolution
    pub fn resolve_dispute(
        env: Env,
        session_id: u64,
        resolution: Resolution,
    ) -> Result<(), Error> {
        let admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)?;
        
        admin.require_auth();

        let mut session = Self::get_session_or_error(&env, session_id)?;
        let mut dispute: Dispute = env.storage()
            .persistent()
            .get(&DataKey::Dispute(session_id))
            .ok_or(Error::DisputeNotFound)?;

        if dispute.resolved {
            return Err(Error::InvalidSessionState);
        }

        if session.status != SessionStatus::Disputed {
            return Err(Error::InvalidSessionState);
        }

        let token_client = token::Client::new(&env, &session.token);

        // Effects: Update state before transfers (Checks-Effects-Interactions pattern)
        dispute.resolved = true;
        dispute.resolution = match resolution {
            Resolution::SeekerWins => 1,
            Resolution::ExpertWins => 2,
            Resolution::Refund => 3,
        };
        session.status = SessionStatus::Finished;

        match resolution {
            Resolution::SeekerWins => {
                // Seeker gets full refund
                if session.balance > 0 {
                    token_client.transfer(
                        &env.current_contract_address(),
                        &session.seeker,
                        &session.balance,
                    );
                }
                session.balance = 0;
            }
            Resolution::ExpertWins => {
                // Expert gets full balance
                if session.balance > 0 {
                    token_client.transfer(
                        &env.current_contract_address(),
                        &session.expert,
                        &session.balance,
                    );
                }
                session.balance = 0;
            }
            Resolution::Refund => {
                // Split: expert gets accrued, seeker gets remaining
                let expert_amount = session.accrued_amount;
                let seeker_amount = session.balance - expert_amount;

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

                session.balance = 0;
                session.accrued_amount = 0;
            }
        }

        // Interactions: Perform transfers after state updates
        Self::save_session(&env, &session);
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(session_id), &dispute);

        env.events()
            .publish((symbol_short!("resolved"),), session_id);

        Ok(())
    }

    /// Get dispute details for a session
    /// 
    /// # Returns
    /// Dispute struct containing:
    /// - session_id: The disputed session
    /// - reason: Dispute reason provided by seeker
    /// - ipfs_metadata_hash: Reference to evidence on IPFS
    /// - created_at: Timestamp when dispute was flagged
    /// - resolved: Whether dispute has been resolved
    /// - resolution: Resolution code (0=unresolved, 1=SeekerWins, 2=ExpertWins, 3=Refund)
    ///
    /// # Arbitrator Usage
    /// Call this to retrieve dispute metadata before making resolution decision
    pub fn get_dispute(env: Env, session_id: u64) -> Result<Dispute, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Dispute(session_id))
            .ok_or(Error::DisputeNotFound)
    }

    // ============ TIMELOCK FOR PROTOCOL UPGRADES (Issue #121) ============
    /// Admin initiates a WASM upgrade with 48-hour timelock
    pub fn initiate_upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) -> Result<(), Error> {
        let admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)?;
        
        admin.require_auth();

        let now = env.ledger().timestamp();
        const TIMELOCK_DURATION: u64 = 48 * 60 * 60; // 48 hours in seconds

        let timelock = UpgradeTimelock {
            new_wasm_hash,
            initiated_at: now,
            execute_after: now + TIMELOCK_DURATION,
        };

        env.storage()
            .instance()
            .set(&DataKey::UpgradeTimelock, &timelock);

        env.events()
            .publish((symbol_short!("upgInit"),), now);

        Ok(())
    }

    /// Execute the upgrade after timelock expires
    pub fn execute_upgrade(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)?;
        
        admin.require_auth();

        let timelock: UpgradeTimelock = env.storage()
            .instance()
            .get(&DataKey::UpgradeTimelock)
            .ok_or(Error::UpgradeNotInitiated)?;

        let now = env.ledger().timestamp();
        if now < timelock.execute_after {
            return Err(Error::TimelockNotExpired);
        }

        // Effects: Update state before interaction
        env.storage().instance().remove(&DataKey::UpgradeTimelock);

        // Interactions: Perform upgrade
        env.deployer()
            .update_current_contract_wasm(timelock.new_wasm_hash);

        env.events()
            .publish((symbol_short!("upgExec"),), now);

        Ok(())
    }

    /// Get current upgrade timelock status
    pub fn get_upgrade_timelock(env: Env) -> Result<UpgradeTimelock, Error> {
        env.storage()
            .instance()
            .get(&DataKey::UpgradeTimelock)
            .ok_or(Error::UpgradeNotInitiated)
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
