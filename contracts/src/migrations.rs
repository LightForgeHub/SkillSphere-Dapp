//! Schema migration helpers for SkillSphere contract upgrades.
//!
//! Each version bump gets a dedicated `migrate_vN_to_vM` function.
//! `run()` is the single dispatch entry called by `SkillSphereContract::migrate`.

use soroban_sdk::{contracttype, Address, Env, String};

use crate::{DataKey, Session, SessionStatus};

// ---------------------------------------------------------------------------
// V1 schema – the original Session layout (no `encrypted_notes_hash` / `paused_at`)
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionV1 {
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
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/// Called by `SkillSphereContract::migrate` with the current and target versions.
/// Add new arms here as the schema evolves.
pub fn run(env: &Env, from: u32, to: u32) {
    if from == 1 && to == 2 {
        migrate_v1_to_v2(env);
    }
    // future: if from == 2 && to == 3 { migrate_v2_to_v3(env); }
}

// ---------------------------------------------------------------------------
// v1 → v2: add `encrypted_notes_hash` (None) and `paused_at` (None) fields
// ---------------------------------------------------------------------------

fn migrate_v1_to_v2(env: &Env) {
    let next_id: u64 = env
        .storage()
        .instance()
        .get(&DataKey::NextSessionId)
        .unwrap_or(1u64);

    for id in 1..next_id {
        let key = DataKey::Session(id);

        // Try to read as the new format first; if it already has the new
        // fields we skip it.  If that fails, attempt the old V1 layout.
        if env.storage().persistent().has(&key) {
            // Attempt V1 deserialization.  If the stored value is already V2
            // this will fail silently and we leave it untouched.
            if let Some(v1) = env
                .storage()
                .persistent()
                .get::<DataKey, SessionV1>(&key)
            {
                let v2 = Session {
                    id: v1.id,
                    seeker: v1.seeker,
                    expert: v1.expert,
                    token: v1.token,
                    rate_per_second: v1.rate_per_second,
                    balance: v1.balance,
                    last_settlement_timestamp: v1.last_settlement_timestamp,
                    start_timestamp: v1.start_timestamp,
                    accrued_amount: v1.accrued_amount,
                    status: v1.status,
                    metadata_cid: v1.metadata_cid,
                    encrypted_notes_hash: None,
                    paused_at: None,
                };
                env.storage().persistent().set(&key, &v2);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Env, String,
    };

    use crate::{DataKey, SkillSphereContract, SkillSphereContractClient};

    fn test_cid(env: &Env) -> String {
        String::from_str(env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz8")
    }

    /// Simulate a V1 session stored under the old schema, then run the
    /// migration and verify the V2 fields are populated correctly.
    #[test]
    fn test_migrate_v1_to_v2() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_000);

        let contract_id = env.register_contract(None, SkillSphereContract);
        let client = SkillSphereContractClient::new(&env, &contract_id);

        let admin = soroban_sdk::Address::generate(&env);
        client.initialize(&admin);

        // Write a raw V1 session directly into persistent storage.
        let seeker = soroban_sdk::Address::generate(&env);
        let expert = soroban_sdk::Address::generate(&env);
        let token = soroban_sdk::Address::generate(&env);

        let v1 = SessionV1 {
            id: 1,
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: token.clone(),
            rate_per_second: 10,
            balance: 3_000,
            last_settlement_timestamp: 1_000,
            start_timestamp: 1_000,
            accrued_amount: 0,
            status: SessionStatus::Active,
            metadata_cid: test_cid(&env),
        };

        env.as_contract(&contract_id, || {
            env.storage()
                .instance()
                .set(&DataKey::NextSessionId, &2u64);
            env.storage()
                .persistent()
                .set(&DataKey::Session(1), &v1);
        });

        // Run the migration v1 → v2.
        client.migrate(&2);

        // Verify the session now deserialises as the V2 Session struct.
        let session = client.get_session(&1);
        assert_eq!(session.id, 1);
        assert_eq!(session.seeker, seeker);
        assert_eq!(session.expert, expert);
        assert_eq!(session.balance, 3_000);
        assert_eq!(session.encrypted_notes_hash, None);
        assert_eq!(session.paused_at, None);

        // Version should now be 2.
        assert_eq!(client.get_contract_version(), 2);
    }

    /// Calling migrate with the same or lower version must be rejected.
    #[test]
    #[should_panic]
    fn test_migrate_same_version_is_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_000);

        let contract_id = env.register_contract(None, SkillSphereContract);
        let client = SkillSphereContractClient::new(&env, &contract_id);

        let admin = soroban_sdk::Address::generate(&env);
        client.initialize(&admin);

        // Version starts at 1; trying to migrate to 1 must fail.
        client.migrate(&1);
    }
}
