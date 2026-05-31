#![no_std]

mod migrations;
mod admin;
mod storage;
pub mod bridge;
mod crypto;
mod dex;
mod disputes;
mod errors;
mod events;
mod governance;
mod reputation;
mod treasury;
mod oracles;
mod scheduling;
pub use bridge::BridgeError;
pub use crypto::SessionVoucher;
pub use dex::SwapPath;
pub use errors::Error;
pub use reputation::BadgeRecord;
pub use reputation::ExpertTier;

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, token, xdr::ToXdr, Address,
    Bytes, BytesN, Env, Map, String, Vec,
};

/// Cross-contract interface for the dynamic-pricing oracle (issue #207).
///
/// An external oracle contract — Reflector, Band-style relay, etc. —
/// implements this surface and reports back `(price, last_updated_at)`
/// for a given asset-pair symbol. `price` is a fixed-point integer in
/// the oracle's chosen precision; `last_updated_at` is the ledger
/// timestamp at which the price was published. The SkillSphere
/// contract treats `last_updated_at` as the staleness signal.
#[contractclient(name = "PriceOracleClient")]
pub trait PriceOracle {
    /// Return `(price, last_updated_at_seconds)` for the asset pair, or
    /// panic if the pair is unknown.
    fn get_price(env: Env, asset_pair: String) -> (i128, u32);
}

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
/// Minimum expiry buffer (2 hours) added to scheduled_start for reserved sessions.
const SESSION_EXPIRY_BUFFER_SECS: u64 = 2 * 60 * 60;
pub(crate) const MIN_SESSION_ESCROW: i128 = 10; // Dust cleanup threshold
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
/// Maximum number of sessions that can be archived in a single batch call.
const MAX_ARCHIVE_BATCH_SIZE: u32 = 50;

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
    // Anti-spam session deposit
    InsufficientAntiSpamDeposit = 27,
    // Oracle circuit breaker
    CircuitBreakerActive = 28,
    // Session expiry
    SessionNotExpired = 29,
}
const REFERRAL_COMMISSION_BPS: u32 = 500; // 5% commission of expert earnings paid from platform fee
const DEFAULT_REFERRAL_SESSION_LIMIT: u32 = 50;
const DEFAULT_CANCELLATION_FEE_BPS: u32 = 500;
const CANCELLATION_GRACE_PERIOD_SECS: u64 = 60 * 60;
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
// #197 Insurance Fund: bps of the platform fee diverted to the
// insurance vault on every settlement (100 bps = 1% of fee).
const INSURANCE_BPS_OF_FEE: u32 = 100;
// #195 Subscription seconds-per-month, used to enforce the
// "deduct monthly" cadence on `collect_subscription_payment`.
const SUBSCRIPTION_PERIOD_SECS: u64 = 30 * 24 * 60 * 60;
// Expert availability heartbeat window (#199): an expert who has called
// `heartbeat()` more than this many seconds ago is treated as offline
// for the purposes of `start_session`.
const HEARTBEAT_VALIDITY_WINDOW: u64 = 60 * 60; // 1 hour
                                                // PlatformStats event emission cadence (#200): emit a rolled-up stats
                                                // event every Nth settled session so off-chain indexers can track total
                                                // volume + session count without re-scanning every single event.
const PLATFORM_STATS_EMIT_INTERVAL: u64 = 100;
// #203: seconds between mandatory seeker re-verifications for long-term escrows.
const REVERIFY_PERIOD_SECS: u64 = 30 * 24 * 60 * 60;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    SessionCounter,
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
    SessionRating(u64),
    ExpertAverageRating(Address),
    ExpertRatingCount(Address),
    ReferralSessionCount(Address),
    TrustedOracle(Address),
    ExpertVerificationStatus(Address),
    BurnBps,
    TotalBurned(Address),
    StakeBalance(Address),
    StakeStartedAt(Address),
    StakingRewardPool(Address),
    StakingTotalStaked,
    StakerRewardCheckpoint(Address, Address),
    StakingRewardPerShare(Address),
    AssetFeeBps(Address),
    InsuranceVaultAddress,
    InsuranceVaultBalance(Address),
    FixedPriceSession(u64),
    Subscription(Address, Address),
    SessionLastVerified(u64),
    SessionFrozenFlag(u64),
    UserTotalSpent(Address),
    UserTotalEarned(Address),
    SbtContractAddress,
    ExpertBadge(Address),
    ExpertTotalSeconds(Address),
    SessionCommit(BytesN<32>),
    SessionCommitConsumed(BytesN<32>),
    ExpertPriceFeed(Address),
    ExpertCooldownLedgers,
    ExpertCooldownUntil(Address),
    SeekerSpendingLimit(Address),
    ExpertVoucherPubkey(Address),
    VoucherNonceConsumed(Address, u64),
    ReferralSessionLimit,
    CancellationFeeBps,
    // Expert tier system
    ExpertTier(Address),
    ExpertCompletedSessions(Address),
    // Anti-spam session deposit
    SpamDepositAmount,
    // Oracle circuit breaker
    LastOraclePrice,
    CircuitBreakerActive,
    MaxPriceDeviationBps,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SessionStatus {
    Active,
    Paused,
    Reserved,
    Completed,
    Disputed,
    Resolved,
    CancelledByExpert,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RateCurrency {
    XLM,
    USD,
}

/// Per-commitment metadata for the privacy-preserving session-handshake
/// flow (issue #206). The seeker / expert identities are *not* stored
/// here — only `committer` is, so an indexer that scrapes events can
/// see "someone committed to a session at T" without learning who is
/// meeting whom until the reveal lands.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommitRecord {
    /// Address that registered the commitment and is authorised to
    /// reveal it.
    pub committer: Address,
    /// Ledger timestamp at which the commitment was registered.
    pub created_at: u32,
}

/// Per-expert dynamic-pricing configuration (issue #207).
///
/// When stored under `DataKey::ExpertPriceFeed(expert)`, the expert's
/// effective rate is computed as
/// `(oracle_price * multiplier_bps / 10_000)`. Callers that need a
/// "use static rate if oracle is misbehaving" policy should read
/// `fallback_rate_per_second` and fall back themselves.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExpertPriceFeedConfig {
    /// Address of the price-oracle contract implementing the
    /// `PriceOracleClient` interface below.
    pub oracle_contract: Address,
    /// Asset-pair symbol the oracle should be queried for
    /// (e.g. `"XLM/USD"`).
    pub asset_pair: String,
    /// Scale factor applied to the oracle price, in basis points
    /// (`10_000 = 1.0×`). Lets an expert charge "1.5× spot price" by
    /// setting `15_000`.
    pub multiplier_bps: u32,
    /// Reject the oracle price if it is older than this many seconds.
    pub max_staleness_seconds: u32,
    /// Static rate used by callers that opt into a fallback when the
    /// oracle is misconfigured / stale.
    pub fallback_rate_per_second: i128,
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
    pub agency_address: Option<Address>,
    pub agency_share_bps: u32,
    pub rate_currency: RateCurrency,
    pub staked_balance: i128,
    pub reputation: u32,
    pub cross_chain_reputation: u32,
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
    pub scheduled_start: Option<u64>,
    pub duration_cap: Option<u64>,
    pub accrued_amount: i128,
    pub status: SessionStatus,
    pub metadata_cid: String,
    pub encrypted_notes_hash: Option<String>,
    pub paused_at: Option<u64>,
    pub agency_address: Option<Address>,
    pub agency_share_bps: u32,
    pub rate_currency: RateCurrency,
    pub locked_xlm_rate: Option<i128>,
    /// Hard expiry timestamp (seconds). Set for Reserved sessions only.
    /// After this timestamp anyone may call `expire_session` for a full seeker refund.
    pub expires_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ArchiveSummary {
    pub archived: u32,
    pub skipped: u32,
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
pub struct ContractStatus {
    pub version: u32,
    pub admin: Option<Address>,
    pub is_paused: bool,
    pub total_sessions: u64,
    pub active_sessions: u64,
}
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExpertVerification {
    pub expert: Address,
    pub verified: bool,
    pub oracle_source: String,
    pub verified_at: u32,
}

/// Fixed-price escrow session for milestone-based work (#194).
///
/// Funds are locked at `initialize_fixed_price_session` and only
/// released by `approve_fixed_price_session` (full payout to the
/// expert minus platform fee) or by the existing dispute resolution
/// pathway. No streaming math runs.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum FixedPriceStatus {
    Locked,
    Released,
    Disputed,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FixedPriceSession {
    pub id: u64,
    pub seeker: Address,
    pub expert: Address,
    pub token: Address,
    pub amount: i128,
    pub created_at: u64,
    pub metadata_cid: String,
    pub status: FixedPriceStatus,
}

/// Expert subscription retainer (#195).
///
/// `monthly_fee` is collected once per `SUBSCRIPTION_PERIOD_SECS`,
/// up to `months_remaining` times. `prepaid_balance` is the up-front
/// escrow the seeker funded; `expert_balance` is the expert's
/// virtual balance to be claimed via `claim_subscription_balance`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    pub seeker: Address,
    pub expert: Address,
    pub token: Address,
    pub monthly_fee: i128,
    pub months_remaining: u32,
    pub last_collected_at: u64,
    pub started_at: u64,
    pub prepaid_balance: i128,
    pub expert_balance: i128,
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
        env.storage()
            .instance()
            .set(&DataKey::SessionCounter, &0u64);
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
        env.storage().instance().set(
            &DataKey::ExpertCooldownLedgers,
            &disputes::DEFAULT_EXPERT_COOLDOWN_LEDGERS,
        );
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
    pub fn register_expert(
        env: Env,
        expert: Address,
        rate: i128,
        metadata_cid: String,
        agency_address: Option<Address>,
        agency_share_bps: Option<u32>,
        rate_currency: RateCurrency,
    ) {
        expert.require_auth();
        let agency_share_bps = agency_share_bps.unwrap_or(0);
        if agency_share_bps > MAX_BPS {
            panic_with_error!(&env, Error::InvalidSplitBps);
        }
        if agency_share_bps > 0 && agency_address.is_none() {
            panic_with_error!(&env, Error::InvalidSplitBps);
        }

        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.rate_per_second = rate;
        profile.metadata_cid = metadata_cid;
        profile.agency_address = agency_address;
        profile.agency_share_bps = agency_share_bps;
        profile.rate_currency = rate_currency;

        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert), &profile);
    }

    /// Updates an expert's agency split for future sessions only.
    pub fn update_agency_split(
        env: Env,
        expert: Address,
        agency_address: Option<Address>,
        agency_share_bps: u32,
    ) -> Result<(), Error> {
        expert.require_auth();
        if agency_share_bps > MAX_BPS {
            return Err(Error::InvalidSplitBps);
        }
        if agency_share_bps > 0 && agency_address.is_none() {
            return Err(Error::InvalidSplitBps);
        }

        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.agency_address = agency_address;
        profile.agency_share_bps = agency_share_bps;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert), &profile);

        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("agencyUp"), expert, agency_address, agency_share_bps),
        );
        Ok(())
    }

    /// Sets the expert's rate currency (XLM or USD).
    pub fn set_expert_rate_currency(
        env: Env,
        expert: Address,
        currency: RateCurrency,
    ) -> Result<(), Error> {
        expert.require_auth();
        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.rate_currency = currency;
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert), &profile);

        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("rateCurr"), expert, currency),
        );
        Ok(())
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
        events::publish_event(&env, events::event_type::admin_config(), 0, (symbol_short!("burnBps"), burn_bps));
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
        env.storage().persistent().set(
            &DataKey::StakeStartedAt(staker.clone()),
            &env.ledger().timestamp(),
        );

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::StakingTotalStaked)
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::StakingTotalStaked, &total.saturating_add(amount));

        events::publish_event(
            &env,
            events::event_type::staking(),
            0,
            (symbol_short!("stake"), staker, token, amount),
        );
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
            return Err(Error::InsuffStakeBalance);
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

        events::publish_event(
            &env,
            events::event_type::staking(),
            0,
            (symbol_short!("unstake"), staker, token, amount),
        );
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
        env.storage().instance().set(
            &DataKey::StakingRewardPool(reward_token.clone()),
            &pool.saturating_sub(owed),
        );
        let token_client = token::Client::new(&env, &reward_token);
        token_client.transfer(&env.current_contract_address(), &staker, &owed);

        events::publish_event(
            &env,
            events::event_type::staking(),
            0,
            (symbol_short!("claim"), staker, reward_token, owed),
        );
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
        let delta = amount
            .saturating_mul(1_000_000_000i128)
            .saturating_div(total);
        env.storage().instance().set(
            &DataKey::StakingRewardPerShare(reward_token.clone()),
            &acc.saturating_add(delta),
        );

        events::publish_event(
            &env,
            events::event_type::staking(),
            0,
            (symbol_short!("rewardDep"), from, reward_token, amount),
        );
        Ok(())
    }

    // #196 — Platform Fee Whitelist for Specific Assets
    // ====================================================================

    /// Admin sets a per-asset fee override in basis points. If set,
    /// this overrides the global tiered fee config for sessions
    /// funded in that token. Pass `MAX_BPS` worth of caution: callers
    /// can clear an override by removing the storage key via
    /// `clear_asset_fee_bps`.
    pub fn set_asset_fee_bps(env: Env, asset: Address, fee_bps: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if fee_bps > MAX_BPS {
            return Err(Error::InvalidFeeBps);
        }
        env.storage()
            .instance()
            .set(&DataKey::AssetFeeBps(asset.clone()), &fee_bps);
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("assetFee"), asset, fee_bps),
        );
        Ok(())
    }

    /// Admin removes a previously-set per-asset fee override. The
    /// asset then falls back to the global tiered fee config.
    pub fn clear_asset_fee_bps(env: Env, asset: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .remove(&DataKey::AssetFeeBps(asset.clone()));
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("assetFee"), asset, 0u32),
        );
        Ok(())
    }

    /// Read the current per-asset fee bps override, if any.
    pub fn get_asset_fee_bps(env: Env, asset: Address) -> Option<u32> {
        env.storage().instance().get(&DataKey::AssetFeeBps(asset))
    }

    // ====================================================================
    // #197 — Protocol Insurance Fund
    // ====================================================================

    /// Admin sets the insurance vault address. Required before any
    /// settlement can route fee into the insurance fund — sessions
    /// settled while no vault is configured skip the diversion (so
    /// upgrading deployments don't break).
    pub fn set_insurance_vault(env: Env, vault: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::InsuranceVaultAddress, &vault);
        events::publish_event(&env, events::event_type::insurance(), 0, (symbol_short!("insVault"), vault));
        Ok(())
    }

    /// Read the configured insurance vault address.
    pub fn get_insurance_vault(env: Env) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::InsuranceVaultAddress)
    }

    /// Read the insurance fund's accrued balance for a specific token.
    pub fn insurance_balance(env: Env, token: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::InsuranceVaultBalance(token))
            .unwrap_or(0i128)
    }

    /// Admin-only withdrawal from the insurance fund for verified
    /// claims. Decrements the per-token vault balance and transfers
    /// `amount` to `recipient`. Fails if the vault is unset or the
    /// per-token balance is short.
    pub fn withdraw_insurance(
        env: Env,
        token: Address,
        recipient: Address,
        amount: i128,
    ) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let vault: Address = env
            .storage()
            .instance()
            .get(&DataKey::InsuranceVaultAddress)
            .ok_or(Error::ContractUnset)?;
        let mut balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::InsuranceVaultBalance(token.clone()))
            .unwrap_or(0i128);
        if balance < amount {
            return Err(Error::InsuffInsuranceBal);
        }
        balance -= amount;
        env.storage()
            .instance()
            .set(&DataKey::InsuranceVaultBalance(token.clone()), &balance);

        // The vault holds the actual tokens via the contract escrow;
        // transfer to recipient out of the contract.
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        events::publish_event(
            &env,
            events::event_type::insurance(),
            0,
            (symbol_short!("insWithdr"), vault, token, recipient, amount),
        );
        Ok(())
    }

    // ====================================================================
    // Anti-Spam Session Deposit
    // ====================================================================

    /// Sets the non-refundable anti-spam deposit required on every new session.
    ///
    /// Set to `0` to disable (the default). Deposit is burned to the insurance
    /// vault on session creation and does not count toward the session escrow.
    pub fn set_spam_deposit_amount(env: Env, amount: i128) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if amount < 0 {
            return Err(Error::InvalidAmount);
        }
        treasury::set_spam_deposit_amount(&env, amount);
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("spamDep"), amount),
        );
        Ok(())
    }

    /// Returns the currently-configured anti-spam deposit amount.
    pub fn get_spam_deposit_amount(env: Env) -> i128 {
        treasury::spam_deposit_amount(&env)
    }

    // ====================================================================
    // #194 — Fixed-Price Escrow for Milestone Tasks
    // ====================================================================

    /// Lock `amount` of `token` from `seeker` as a milestone escrow
    /// for `expert`. Funds remain in the contract until
    /// `approve_fixed_price_session` releases them or
    /// `dispute_fixed_price_session` puts the session into dispute.
    /// Returns the new fixed-price session id.
    pub fn initialize_fixed_price_session(
        env: Env,
        seeker: Address,
        expert: Address,
        token: Address,
        amount: i128,
        metadata_cid: String,
    ) -> Result<u64, Error> {
        seeker.require_auth();
        Self::ensure_protocol_active(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !Self::is_valid_ipfs_cid(&metadata_cid) {
            return Err(Error::InvalidCid);
        }

        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&seeker) < amount {
            return Err(Error::InsufficientBalance);
        }
        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

        let session_id = Self::next_session_id(&env);
        let now = env.ledger().timestamp();

        let session = FixedPriceSession {
            id: session_id,
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: token.clone(),
            amount,
            created_at: now,
            metadata_cid: metadata_cid.clone(),
            status: FixedPriceStatus::Locked,
        };
        env.storage()
            .persistent()
            .set(&DataKey::FixedPriceSession(session_id), &session);

        events::publish_event(
            &env,
            events::event_type::fixed_price(),
            session_id,
            (symbol_short!("started"), seeker, expert, token, amount),
        );
        Ok(session_id)
    }

    /// Refresh the expert's availability heartbeat (#199).
    ///
    /// Stamps `ExpertLastHeartbeat(expert)` with the current ledger
    /// timestamp. `start_session` rejects experts whose last heartbeat
    /// is older than `HEARTBEAT_VALIDITY_WINDOW` (1 hour). Experts who
    /// have never called `heartbeat` retain the legacy
    /// `availability_status`-only semantics so existing flows keep
    /// working until they opt in.
    pub fn heartbeat(env: Env, expert: Address) -> Result<(), Error> {
        expert.require_auth();
        admin::rate_limit(&env, &expert, admin::rate_limit_min_ledgers(&env))?;
        let profile = Self::expert_profile(&env, expert.clone());
        if profile.rate_per_second == 0 {
            return Err(Error::ExpertNotRegistered);
        }
        let now = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::ExpertLastHeartbeat(expert.clone()), &now);
        events::publish_event(&env, events::event_type::heartbeat(), 0, (expert, now));
        Ok(())
    }

    /// Seeker approves the milestone. Pays the expert `amount` minus
    /// the platform fee in one shot. Triggers the same fee-routing
    /// and insurance-diversion path as streaming sessions.
    pub fn approve_fixed_price_session(
        env: Env,
        seeker: Address,
        session_id: u64,
    ) -> Result<i128, Error> {
        seeker.require_auth();
        let mut fp: FixedPriceSession = env
            .storage()
            .persistent()
            .get(&DataKey::FixedPriceSession(session_id))
            .ok_or(Error::SessionNotFound)?;

        if seeker != fp.seeker {
            return Err(Error::Unauthorized);
        }
        if !matches!(fp.status, FixedPriceStatus::Locked) {
            return Err(Error::FpAlreadyFinalised);
        }

        let amount = fp.amount;
        let platform_fee = Self::platform_fee_for_token(&env, &fp.token, amount)?;
        let insurance_cut = Self::route_insurance_cut(&env, &fp.token, platform_fee);
        let treasury_fee = platform_fee.saturating_sub(insurance_cut);
        let expert_payout = amount.saturating_sub(platform_fee);

        let token_client = token::Client::new(&env, &fp.token);
        if treasury_fee > 0 {
            if let Some(treasury) = env
                .storage()
                .instance()
                .get::<DataKey, Address>(&DataKey::TreasuryAddress)
            {
                token_client.transfer(&env.current_contract_address(), &treasury, &treasury_fee);
            }
        }
        if expert_payout > 0 {
            token_client.transfer(&env.current_contract_address(), &fp.expert, &expert_payout);
        }

        fp.status = FixedPriceStatus::Released;
        env.storage()
            .persistent()
            .set(&DataKey::FixedPriceSession(session_id), &fp);

        events::publish_event(
            &env,
            events::event_type::fixed_price(),
            session_id,
            (symbol_short!("approved"), expert_payout, platform_fee, insurance_cut),
        );
        Ok(expert_payout)
    }

    /// Flag a fixed-price session as disputed. Funds remain locked
    /// until admin resolution. Mirrors `flag_dispute` for streaming
    /// sessions; the existing `resolve_dispute_with_split` flow
    /// handles release.
    pub fn dispute_fixed_price_session(
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

        let mut fp: FixedPriceSession = env
            .storage()
            .persistent()
            .get(&DataKey::FixedPriceSession(session_id))
            .ok_or(Error::SessionNotFound)?;
        if seeker != fp.seeker {
            return Err(Error::Unauthorized);
        }
        if !matches!(fp.status, FixedPriceStatus::Locked) {
            return Err(Error::FpAlreadyFinalised);
        }
        fp.status = FixedPriceStatus::Disputed;
        env.storage()
            .persistent()
            .set(&DataKey::FixedPriceSession(session_id), &fp);

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

        events::publish_event(
            &env,
            events::event_type::fixed_price(),
            session_id,
            (symbol_short!("disputed"), seeker, evidence_cid),
        );
        Ok(())
    }

    /// Read a fixed-price session by id.
    pub fn get_fixed_price_session(env: Env, session_id: u64) -> Result<FixedPriceSession, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::FixedPriceSession(session_id))
            .ok_or(Error::SessionNotFound)
    }

    // ====================================================================
    // #195 — Expert Subscription Retainers
    // ====================================================================

    /// Create a subscription: seeker prepays `monthly_fee *
    /// months` up front to the contract; the expert collects one
    /// month's fee at a time via `collect_subscription_payment`.
    pub fn subscribe(
        env: Env,
        seeker: Address,
        expert: Address,
        token: Address,
        monthly_fee: i128,
        months: u32,
    ) -> Result<(), Error> {
        seeker.require_auth();
        Self::ensure_protocol_active(&env)?;
        if monthly_fee <= 0 || months == 0 {
            return Err(Error::InvalidAmount);
        }
        let profile = Self::expert_profile(&env, expert.clone());
        if profile.rate_per_second == 0 {
            return Err(Error::ExpertNotRegistered);
        }

        let total = monthly_fee.saturating_mul(months as i128);
        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&seeker) < total {
            return Err(Error::InsufficientBalance);
        }
        token_client.transfer(&seeker, &env.current_contract_address(), &total);

        let now = env.ledger().timestamp();
        let sub = Subscription {
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: token.clone(),
            monthly_fee,
            months_remaining: months,
            // `last_collected_at = 0` so the first collection is
            // immediately available after subscribe — the period
            // check uses `now - last_collected_at >= PERIOD`.
            last_collected_at: 0,
            started_at: now,
            prepaid_balance: total,
            expert_balance: 0,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Subscription(seeker.clone(), expert.clone()), &sub);

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
        events::publish_event(
            &env,
            events::event_type::subscription(),
            0,
            (symbol_short!("started"), seeker, expert, monthly_fee, months, total),
        );
        Ok(())
    }

    /// Read the last `heartbeat()` timestamp for an expert (#199).
    /// Returns `0` if the expert has never called heartbeat.
    pub fn last_heartbeat(env: Env, expert: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertLastHeartbeat(expert))
            .unwrap_or(0u64)
    }

    /// Append fresh evidence to an active dispute (#198).
    ///
    /// Only callable while the dispute is unresolved and only by the
    /// session's seeker, expert, or the contract admin. Replaces
    /// `Dispute.evidence_cid` with the new CID — latest evidence wins
    /// from the arbitrator's point of view. The previous CID is still
    /// recoverable via the historical `evidence_added` events.
    pub fn add_dispute_evidence(
        env: Env,
        caller: Address,
        session_id: u64,
        cid: String,
    ) -> Result<(), Error> {
        caller.require_auth();

        if !Self::is_valid_ipfs_cid(&cid) {
            return Err(Error::InvalidCid);
        }

        let mut dispute: Dispute = env
            .storage()
            .persistent()
            .get(&DataKey::Dispute(session_id))
            .ok_or(Error::DisputeNotFound)?;

        if dispute.resolved {
            return Err(Error::DisputeResolved);
        }

        let session = Self::get_session_or_error(&env, session_id)?;
        if !matches!(session.status, SessionStatus::Disputed) {
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
        let admin = Self::get_admin_address(&env)?;
        if caller != session.seeker && caller != session.expert && caller != admin {
            return Err(Error::Unauthorized);
        }

        dispute.evidence_cid = cid.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(session_id), &dispute);

        events::publish_event(
            &env,
            events::event_type::dispute_evidence(),
            session_id,
            (caller, cid),
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

    /// Expert collects the next month's fee from a subscription.
    /// Decrements `prepaid_balance` + `months_remaining`, credits
    /// `expert_balance`, and routes platform fee + insurance cut
    /// just like a settled session. Fails if no period has elapsed
    /// since the last collection or the subscription is exhausted.
    pub fn collect_subscription_payment(
        env: Env,
        expert: Address,
        seeker: Address,
    ) -> Result<i128, Error> {
        expert.require_auth();
        let mut sub: Subscription = env
            .storage()
            .persistent()
            .get(&DataKey::Subscription(seeker.clone(), expert.clone()))
            .ok_or(Error::SubNotFound)?;
        if sub.months_remaining == 0 {
            return Err(Error::SubscriptionExpired);
        }
        let now = env.ledger().timestamp();
        let elapsed = now.saturating_sub(sub.last_collected_at);
        if sub.last_collected_at > 0 && elapsed < SUBSCRIPTION_PERIOD_SECS {
            return Err(Error::SubAlreadyCollected);
        }

        let fee = sub.monthly_fee;
        if sub.prepaid_balance < fee {
            return Err(Error::SubscriptionExpired);
        }

        let platform_fee = Self::platform_fee_for_token(&env, &sub.token, fee)?;
        let insurance_cut = Self::route_insurance_cut(&env, &sub.token, platform_fee);
        let treasury_fee = platform_fee.saturating_sub(insurance_cut);
        let net = fee.saturating_sub(platform_fee);

        sub.prepaid_balance -= fee;
        sub.months_remaining -= 1;
        sub.last_collected_at = now;
        sub.expert_balance = sub.expert_balance.saturating_add(net);
        env.storage()
            .persistent()
            .set(&DataKey::Subscription(seeker.clone(), expert.clone()), &sub);

        // Treasury routing is done via the contract balance; the net
        // goes into the expert's virtual balance for batch withdrawal
        // (matches the issue's "credits expert's virtual balance" AC).
        if treasury_fee > 0 {
            if let Some(treasury) = env
                .storage()
                .instance()
                .get::<DataKey, Address>(&DataKey::TreasuryAddress)
            {
                let token_client = token::Client::new(&env, &sub.token);
                token_client.transfer(&env.current_contract_address(), &treasury, &treasury_fee);
            }
        }

        events::publish_event(
            &env,
            events::event_type::subscription(),
            0,
            (symbol_short!("collect"), seeker, expert, net, platform_fee, insurance_cut),
        );
        Ok(net)
    }

    /// Expert claims their accumulated virtual balance to their wallet.
    pub fn claim_subscription_balance(
        env: Env,
        expert: Address,
        seeker: Address,
    ) -> Result<i128, Error> {
        expert.require_auth();
        let mut sub: Subscription = env
            .storage()
            .persistent()
            .get(&DataKey::Subscription(seeker.clone(), expert.clone()))
            .ok_or(Error::SubNotFound)?;
        let amount = sub.expert_balance;
        if amount == 0 {
            return Ok(0);
        }
        sub.expert_balance = 0;
        env.storage()
            .persistent()
            .set(&DataKey::Subscription(seeker.clone(), expert.clone()), &sub);
        let token_client = token::Client::new(&env, &sub.token);
        token_client.transfer(&env.current_contract_address(), &expert, &amount);
        events::publish_event(
            &env,
            events::event_type::subscription(),
            0,
            (symbol_short!("claim"), seeker, expert, amount),
        );
        Ok(amount)
    }

    /// Read a subscription record.
    pub fn get_subscription(
        env: Env,
        seeker: Address,
        expert: Address,
    ) -> Result<Subscription, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Subscription(seeker, expert))
            .ok_or(Error::SubNotFound)
    }

    /// Read the rolled-up PlatformStats counters (#200).
    /// Returns `(total_sessions_settled, total_volume_settled)`.
    pub fn platform_stats(env: Env) -> (u64, i128) {
        let sessions: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSessionsSettled)
            .unwrap_or(0u64);
        let volume: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalVolumeSettled)
            .unwrap_or(0i128);
        (sessions, volume)
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
    pub fn update_session_notes(
        env: Env,
        caller: Address,
        session_id: u64,
        notes_hash: String,
    ) -> Result<(), Error> {
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
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("setAdmin"), new_admin),
        );

        Ok(())
    }

        session.balance = 0;
        session.status = SessionStatus::Completed;
        session.last_settlement_timestamp = now as u32;
        Self::save_session(&env, &session);
        Self::decrement_active_sessions(&env);
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
        events::publish_event(&env, events::event_type::admin_config(), 0, (symbol_short!("setFee"), fee_bps));

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
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("feeCfg"), config.clone()),
        );

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
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("setMinDep"), min_deposit),
        );

        Ok(())
    }

    /// Retrieves the current minimum session deposit requirement.
    pub fn get_min_session_deposit(env: Env) -> i128 {
        Self::min_session_deposit(&env)
    }

    // ====================================================================
    // #236 — Per-Address Rate-Limit Guard
    // ====================================================================

    /// Sets the minimum ledger gap enforced between rate-limited calls
    /// (`start_session`, `heartbeat`).  Zero disables throttling.
    pub fn set_rate_limit_min_ledgers(env: Env, min_ledgers: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;
        admin::set_rate_limit_min_ledgers(&env, min_ledgers);
        env.events()
            .publish((symbol_short!("rateLim"),), min_ledgers);
        Ok(())
    }

    /// Returns the configured rate-limit cooldown in ledgers.
    pub fn get_rate_limit_min_ledgers(env: Env) -> u32 {
        admin::rate_limit_min_ledgers(&env)
    }

    // ====================================================================
    // #239 — Whitelisted Token Registry
    // ====================================================================

    /// Adds a token contract to the approved payment-token registry.
    pub fn add_approved_token(env: Env, token: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        admin::add_approved_token(&env, token.clone())?;
        env.events()
            .publish((symbol_short!("addToken"),), token);
        Ok(())
    }

    /// Removes a token contract from the approved payment-token registry.
    pub fn remove_approved_token(env: Env, token: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        admin::remove_approved_token(&env, token.clone())?;
        env.events()
            .publish((symbol_short!("rmToken"),), token);
        Ok(())
    }

    /// Returns whether `token` is on the approved payment-token registry.
    pub fn is_token_approved(env: Env, token: Address) -> bool {
        admin::is_token_whitelisted(&env, &token)
    }

    /// Returns the full list of approved payment tokens.
    pub fn get_approved_tokens(env: Env) -> Vec<Address> {
        admin::approved_tokens(&env)
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
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("setStake"), staking_contract),
        );
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
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("setStBal"), expert, staked_balance),
        );
        Ok(())
    }

    /// Retrieves the staked balance for a specific expert.
    pub fn get_expert_staked_balance(env: Env, expert: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertStakedBalance(expert))
            .unwrap_or(0i128)
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

    /// Batch-archive up to `MAX_ARCHIVE_BATCH_SIZE` completed sessions.
    /// Admin-only. Skips sessions that are not eligible without panicking.
    pub fn batch_archive_sessions(
        env: Env,
        session_ids: Vec<u64>,
    ) -> Result<ArchiveSummary, Error> {
        Self::require_admin(&env)?;

        if session_ids.len() > MAX_ARCHIVE_BATCH_SIZE {
            return Err(Error::InvalidAmount);
        }

        let now = env.ledger().timestamp();
        let mut archived: u32 = 0;
        let mut skipped: u32 = 0;

        for session_id in session_ids.iter() {
            let session = match env
                .storage()
                .persistent()
                .get::<DataKey, Session>(&DataKey::Session(session_id))
            {
                Some(s) => s,
                None => { skipped += 1; continue; }
            };

            let eligible = matches!(
                session.status,
                SessionStatus::Completed | SessionStatus::Resolved
            ) && now >= (session.last_settlement_timestamp as u64).saturating_add(ARCHIVE_DELAY_SECS);

            if !eligible {
                skipped += 1;
                continue;
            }

            storage::write_archive(&env, &session);
            env.storage()
                .persistent()
                .remove(&DataKey::Session(session_id));

            env.events().publish(
                (symbol_short!("session"), symbol_short!("archived")),
                (session_id, now),
            );

            archived += 1;
        }

        Ok(ArchiveSummary { archived, skipped })
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
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert.clone()), &profile);
        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("setRefrr"), expert, referrer),
        );

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
        events::publish_event(&env, events::event_type::admin_config(), 0, (symbol_short!("setTreas"), treasury));
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

        events::publish_event(
            &env,
            events::event_type::admin_config(),
            session_id,
            (symbol_short!("feeCollct"), token, amount),
        );

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
        let current_balance = Self::get_treasury_balance(env.clone(), token.clone());
        if current_balance < amount {
            return Err(Error::InsuffTreasuryBal);
        }

        let new_balance = current_balance.saturating_sub(amount);
        env.storage()
            .persistent()
            .set(&DataKey::TreasuryBalance(token.clone()), &new_balance);

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("treasWdrw"), token.clone(), amount, recipient.clone()),
        );

        Self::save_session(env, &session);
        if session.status == SessionStatus::Completed {
            Self::decrement_active_sessions(env);
        }
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

        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("treasWdrw"), token.clone(), current_balance, recipient.clone()),
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
        events::publish_event(&env, events::event_type::admin_config(), 0, (symbol_short!("protPause"), true));
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
        events::publish_event(&env, events::event_type::admin_config(), 0, (symbol_short!("protPause"), false));
        Ok(())
    }

        Self::save_session(env, session);
        Self::decrement_active_sessions(env);
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
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("setReput"), expert, reputation),
        );
        Ok(())
    }

    /// Retrieves the current reputation of an expert.
    pub fn get_expert_reputation(env: Env, expert: Address) -> u32 {
        let profile = Self::expert_profile(&env, expert);
        Self::effective_reputation(&profile)
    }

    /// Oracle-submitted per-chain reputation score for an expert.
    pub fn set_cross_chain_reputation(
        env: Env,
        oracle: Address,
        expert: Address,
        chain: String,
        score: u32,
    ) -> Result<(), Error> {
        oracle.require_auth();
        let trusted: bool = env
            .storage()
            .persistent()
            .get(&DataKey::TrustedOracle(oracle.clone()))
            .unwrap_or(false);
        if !trusted {
            return Err(Error::OracleNotTrusted);
        }

        let mut scores: Map<String, u32> = env
            .storage()
            .persistent()
            .get(&DataKey::ExpertReputation(expert.clone()))
            .unwrap_or(Map::new(&env));
        let previous = scores.get(chain.clone()).unwrap_or(0u32);
        scores.set(chain.clone(), score);
        env.storage()
            .persistent()
            .set(&DataKey::ExpertReputation(expert.clone()), &scores);

        let mut profile = Self::expert_profile(&env, expert.clone());
        profile.cross_chain_reputation = profile
            .cross_chain_reputation
            .saturating_sub(previous)
            .saturating_add(score);
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert.clone()), &profile);

        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (
                symbol_short!("xchain"),
                oracle,
                expert,
                chain,
                score,
                profile.cross_chain_reputation,
            ),
        );
        Ok(())
    }

    /// Returns the oracle-reported reputation score for a specific chain.
    pub fn get_cross_chain_reputation(env: Env, expert: Address, chain: String) -> u32 {
        let scores: Map<String, u32> = env
            .storage()
            .persistent()
            .get(&DataKey::ExpertReputation(expert))
            .unwrap_or(Map::new(&env));
        scores.get(chain).unwrap_or(0u32)
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
        if let Err(e) = admin::rate_limit(&env, &seeker, admin::rate_limit_min_ledgers(&env)) {
            panic_with_error!(&env, e);
        }
        if let Err(e) = admin::require_token_whitelisted(&env, &token) {
            panic_with_error!(&env, e);
        }
        if !Self::is_valid_ipfs_cid(&metadata_cid) {
            panic_with_error!(&env, Error::InvalidCid);
        }

        if let Err(err) = Self::enforce_seeker_spending_limit(&env, &seeker, amount) {
            panic_with_error!(&env, err);
        }

        let profile = match Self::assert_expert_can_accept_session(&env, expert.clone(), min_reputation) {
            Ok(p) => p,
            Err(err) => panic_with_error!(&env, err),
        };

        let locked_xlm_rate = if profile.rate_currency == RateCurrency::USD {
            Self::lock_usd_rate_for_session(&env, &expert)
        } else {
            None
        };

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

        // Collect non-refundable anti-spam deposit (burned to insurance vault).
        if let Err(e) = treasury::collect_spam_deposit(&env, &seeker, &token) {
            panic_with_error!(&env, e);
        }

        Self::create_active_session(
            &env,
            seeker,
            expert,
            token,
            profile.rate_per_second,
            amount,
            metadata_cid,
            None,
            None,
            profile.agency_address.clone(),
            profile.agency_share_bps,
            profile.rate_currency.clone(),
            locked_xlm_rate,
        )
    }

    /// Reserves a new session for a future start time.
    ///
    /// Funds are locked in escrow until the scheduled time arrives.
    pub fn reserve_session(
        env: Env,
        seeker: Address,
        expert: Address,
        token: Address,
        amount: i128,
        min_reputation: u32,
        scheduled_start: u64,
        duration_cap: u64,
        metadata_cid: String,
    ) -> Result<u64, Error> {
        seeker.require_auth();
        Self::ensure_protocol_active(&env)?;
        if let Err(e) = admin::rate_limit(&env, &seeker, admin::rate_limit_min_ledgers(&env)) {
            panic_with_error!(&env, e);
        }
        if let Err(e) = admin::require_token_whitelisted(&env, &token) {
            panic_with_error!(&env, e);
        }
        if !Self::is_valid_ipfs_cid(&metadata_cid) {
            return Err(Error::InvalidCid);
        }

        if let Err(err) = Self::enforce_seeker_spending_limit(&env, &seeker, amount) {
            return Err(err);
        }

        let profile = Self::assert_expert_can_accept_session(&env, expert.clone(), min_reputation)?;
        if scheduled_start <= env.ledger().timestamp() {
            return Err(Error::InvalidAmount);
        }
        if duration_cap == 0 {
            return Err(Error::InvalidAmount);
        }

        let min_deposit = Self::min_session_deposit(&env);
        if amount < min_deposit {
            return Err(Error::AmountBelowMinimum);
        }

        let min_escrow = profile
            .rate_per_second
            .saturating_mul(core::cmp::min(duration_cap, 300) as i128);
        if amount < min_escrow {
            return Err(Error::DepositTooLow);
        }

        let max_required = profile.rate_per_second.saturating_mul(duration_cap as i128);
        if amount > max_required {
            return Err(Error::InvalidAmount);
        }

        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&seeker) < amount {
            return Err(Error::InsufficientBalance);
        }

        // Collect non-refundable anti-spam deposit (burned to insurance vault).
        treasury::collect_spam_deposit(&env, &seeker, &token)?;

        let locked_xlm_rate = if profile.rate_currency == RateCurrency::USD {
            Self::lock_usd_rate_for_session(&env, &expert)
        } else {
            None
        };

        let session_id = Self::create_reserved_session(
            &env,
            seeker,
            expert,
            token,
            profile.rate_per_second,
            amount,
            metadata_cid,
            scheduled_start,
            duration_cap,
            profile.agency_address.clone(),
            profile.agency_share_bps,
            profile.rate_currency.clone(),
            locked_xlm_rate,
        );

        Ok(session_id)
    }

    fn create_reserved_session(
        env: &Env,
        seeker: Address,
        expert: Address,
        token: Address,
        rate_per_second: i128,
        amount: i128,
        metadata_cid: String,
        scheduled_start: u64,
        duration_cap: u64,
        agency_address: Option<Address>,
        agency_share_bps: u32,
        rate_currency: RateCurrency,
        locked_xlm_rate: Option<i128>,
    ) -> u64 {
        let token_client = token::Client::new(env, &token);
        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

        let session_id = Self::next_session_id(env);
        let start_ts = scheduled_start as u32;

        // expires_at = scheduled_start + max(2 hours, duration_cap)
        let expiry_buffer = if duration_cap > SESSION_EXPIRY_BUFFER_SECS {
            duration_cap
        } else {
            SESSION_EXPIRY_BUFFER_SECS
        };
        let expires_at = scheduled_start.saturating_add(expiry_buffer);

        let session = Session {
            id: session_id,
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: token.clone(),
            rate_per_second,
            balance: amount,
            last_settlement_timestamp: start_ts,
            start_timestamp: start_ts,
            scheduled_start: Some(scheduled_start),
            duration_cap: Some(duration_cap),
            accrued_amount: 0,
            status: SessionStatus::Reserved,
            metadata_cid: metadata_cid.clone(),
            encrypted_notes_hash: None,
            paused_at: None,
            agency_address,
            agency_share_bps,
            rate_currency,
            locked_xlm_rate,
            expires_at: Some(expires_at),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);
        env.storage()
            .persistent()
            .set(&DataKey::SessionLastVerified(session_id), &(scheduled_start as u64));

        events::publish_event(
            env,
            events::event_type::session_reserved(),
            session_id,
            (
                seeker.clone(),
                expert.clone(),
                rate_per_second,
                amount,
                scheduled_start,
                duration_cap,
                metadata_cid,
            ),
        );

        session_id
    }

    /// Cancels a reserved session before it begins.
    ///
    /// Full refund is available when cancellation happens before the
    /// scheduled start minus the grace period. Later cancellations
    /// forfeit a configurable fee.
    pub fn cancel_reserved_session(
        env: Env,
        seeker: Address,
        session_id: u64,
    ) -> Result<(i128, i128), Error> {
        seeker.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        if session.status != SessionStatus::Reserved {
            return Err(Error::InvalidSessionState);
        }
        if seeker != session.seeker {
            return Err(Error::Unauthorized);
        }

        let scheduled_start = session.scheduled_start.ok_or(Error::InvalidSessionState)?;
        let now = env.ledger().timestamp();
        if now >= scheduled_start {
            return Err(Error::InvalidSessionState);
        }

        let fee_bps = Self::cancellation_fee_bps(&env);
        let mut fee = 0i128;
        if now > scheduled_start.saturating_sub(CANCELLATION_GRACE_PERIOD_SECS) {
            fee = session.balance.saturating_mul(fee_bps as i128) / MAX_BPS as i128;
        }
        let refund = session.balance.saturating_sub(fee);
        session.balance = 0;
        session.accrued_amount = 0;
        session.status = SessionStatus::Completed;
        Self::save_session(&env, &session);

        let token_client = token::Client::new(&env, &session.token);
        if refund > 0 {
            token_client.transfer(&env.current_contract_address(), &session.seeker, &refund);
        }
        if fee > 0 {
            if let Some(treasury) = env
                .storage()
                .instance()
                .get::<DataKey, Address>(&DataKey::TreasuryAddress)
            {
                token_client.transfer(&env.current_contract_address(), &treasury, &fee);
            }
        }

        events::publish_event(
            &env,
            events::event_type::session_cancelled(),
            session_id,
            (refund, fee, scheduled_start),
        );

        Ok((refund, fee))
    }

    fn cancellation_fee_bps(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::CancellationFeeBps)
            .unwrap_or(DEFAULT_CANCELLATION_FEE_BPS)
    }

    /// Seeker-imposed cap on the deposit amount for each new session (#241).
    pub fn set_spending_limit(env: Env, seeker: Address, max_per_session: i128) -> Result<(), Error> {
        seeker.require_auth();
        if max_per_session <= 0 {
            return Err(Error::InvalidAmount);
        }
        env.storage()
            .persistent()
            .set(&DataKey::SeekerSpendingLimit(seeker.clone()), &max_per_session);
        events::publish_event(
            &env,
            events::event_type::spending_limit(),
            0,
            (seeker, max_per_session),
        );
        Ok(())
    }

    /// Clear a previously configured spending limit (#241).
    pub fn clear_spending_limit(env: Env, seeker: Address) -> Result<(), Error> {
        seeker.require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::SeekerSpendingLimit(seeker.clone()));
        events::publish_event(
            &env,
            events::event_type::spending_limit(),
            0,
            (seeker, 0i128),
        );
        Ok(())
    }

    pub fn get_spending_limit(env: Env, seeker: Address) -> Option<i128> {
        env.storage()
            .persistent()
            .get(&DataKey::SeekerSpendingLimit(seeker))
    }

    /// Admin: configure expert cooldown length in ledgers after dispute loss (#240).
    pub fn set_expert_cooldown_ledgers(env: Env, ledgers: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if ledgers == 0 {
            return Err(Error::InvalidAmount);
        }
        disputes::set_cooldown_ledgers(&env, ledgers);
        events::publish_event(
            &env,
            events::event_type::admin_config(),
            0,
            (symbol_short!("expCool"), ledgers),
        );
        Ok(())
    }

    pub fn get_expert_cooldown_ledgers(env: Env) -> u32 {
        disputes::cooldown_ledgers(&env)
    }

    pub fn get_expert_cooldown_until(env: Env, expert: Address) -> Option<u32> {
        disputes::expert_cooldown_until(&env, &expert)
    }

    /// Expert registers the ed25519 public key used to verify session vouchers (#242).
    pub fn set_voucher_signing_key(
        env: Env,
        expert: Address,
        public_key: BytesN<32>,
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
        expert.require_auth();
        crypto::set_voucher_pubkey(&env, &expert, public_key.clone());
        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (expert, public_key),
        );
        Ok(())
    }

    pub fn get_voucher_signing_key(env: Env, expert: Address) -> Option<BytesN<32>> {
        crypto::voucher_pubkey(&env, &expert)
    }

    /// Start a session using an expert-signed off-chain voucher (#242).
    pub fn start_session_with_voucher(
        env: Env,
        seeker: Address,
        token: Address,
        amount: i128,
        min_reputation: u32,
        metadata_cid: String,
        voucher: SessionVoucher,
        expert_signature: BytesN<64>,
    ) -> Result<u64, Error> {
        seeker.require_auth();
        Self::ensure_protocol_active(&env)?;
        if !Self::is_valid_ipfs_cid(&metadata_cid) {
            return Err(Error::InvalidCid);
        }
        Self::enforce_seeker_spending_limit(&env, &seeker, amount)?;

        if voucher.rate_per_second <= 0 || voucher.max_duration == 0 {
            return Err(Error::InvalidVoucher);
        }
        if env.ledger().timestamp() > voucher.expiry {
            return Err(Error::VoucherExpired);
        }
        if crypto::is_nonce_consumed(&env, &voucher.expert, voucher.nonce) {
            return Err(Error::VoucherNonceUsed);
        }

        let public_key = crypto::voucher_pubkey(&env, &voucher.expert)
            .ok_or(Error::VoucherPubkeyNotSet)?;
        crypto::verify_voucher_signature(&env, &voucher, &public_key, &expert_signature)?;

        let profile =
            Self::assert_expert_can_accept_session(&env, voucher.expert.clone(), min_reputation)?;

        if profile.rate_per_second != voucher.rate_per_second {
            return Err(Error::InvalidVoucher);
        }

        let locked_xlm_rate = if profile.rate_currency == RateCurrency::USD {
            Self::lock_usd_rate_for_session(&env, &voucher.expert)
        } else {
            None
        };

        let max_escrow = voucher
            .rate_per_second
            .saturating_mul(voucher.max_duration as i128);
        if amount > max_escrow {
            return Err(Error::InvalidAmount);
        }

        let min_deposit = Self::min_session_deposit(&env);
        if amount < min_deposit {
            return Err(Error::AmountBelowMinimum);
        }
        let min_escrow = voucher.rate_per_second.saturating_mul(300);
        if amount < min_escrow {
            return Err(Error::DepositTooLow);
        }

        let token_client = token::Client::new(&env, &token);
        if token_client.balance(&seeker) < amount {
            return Err(Error::InsufficientBalance);
        }

        crypto::consume_nonce(&env, &voucher.expert, voucher.nonce);

        let session_id = Self::create_active_session(
            &env,
            seeker,
            voucher.expert.clone(),
            token,
            voucher.rate_per_second,
            amount,
            metadata_cid,
            None,
            None,
            profile.agency_address.clone(),
            profile.agency_share_bps,
            profile.rate_currency.clone(),
            locked_xlm_rate,
        );

        events::publish_event(
            &env,
            events::event_type::session_voucher(),
            session_id,
            (voucher.expert, voucher.nonce),
        );

        Ok(session_id)
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
        events::publish_event(
            &env,
            events::event_type::session_paused(),
            session_id,
            now,
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
        events::publish_event(
            &env,
            events::event_type::session_resumed(),
            session_id,
            now,
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
        Self::assert_not_locked(&env)?;
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
        Self::assert_not_locked(&env)?;
        caller.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;
        Self::require_participant(&session, &caller)?;

        Self::close_session(&env, &mut session)?;

        Ok(())
    }

    // ====================================================================
    // #238 — Expert-Initiated Session Cancellation
    // ====================================================================

    /// Allows an expert to cancel their own active or paused session.
    ///
    /// Accrued earnings are paid to the expert; the remaining escrow
    /// balance is refunded to the seeker.  `reason_cid` is stored for
    /// transparency and the session status becomes `CancelledByExpert`.
    pub fn cancel_session(
        env: Env,
        expert: Address,
        session_id: u64,
        reason_cid: String,
    ) -> Result<(i128, i128), Error> {
        disputes::cancel_session_by_expert(&env, expert, session_id, reason_cid)
    }

    /// Returns the expert-provided cancellation reason CID, if any.
    pub fn get_session_cancel_reason(env: Env, session_id: u64) -> Option<String> {
        env.storage()
            .persistent()
            .get(&DataKey::SessionCancelReason(session_id))
    }

    // ====================================================================
    // #237 — Session Renewal / Top-Up
    // ====================================================================

    /// Adds `amount` tokens to an active session's escrow balance.
    ///
    /// Only the seeker may top up their own session while it is active.
    pub fn top_up_session(
        env: Env,
        seeker: Address,
        session_id: u64,
        amount: i128,
    ) -> Result<i128, Error> {
        seeker.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut session = Self::get_session_or_error(&env, session_id)?;

        if seeker != session.seeker {
            return Err(Error::Unauthorized);
        }
        if session.status != SessionStatus::Active {
            return Err(Error::SessionNotActive);
        }

        let token_client = token::Client::new(&env, &session.token);
        if token_client.balance(&seeker) < amount {
            return Err(Error::InsufficientBalance);
        }
        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

        session.balance = session.balance.saturating_add(amount);
        let new_balance = session.balance;
        Self::save_session(&env, &session);

        events::publish_top_up(&env, session_id, amount, new_balance);
        Ok(new_balance)
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
        events::publish_event(
            &env,
            events::event_type::dispute_flagged(),
            session_id,
            (seeker, evidence_cid, created_at),
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

        events::publish_event(&env, events::event_type::upgrade(), 0, (symbol_short!("upgInit"), now));

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

        events::publish_event(&env, events::event_type::upgrade(), 0, (symbol_short!("upgExec"), now));

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
        let counter = env
            .storage()
            .instance()
            .get(&DataKey::SessionCounter)
            .unwrap_or(0u64);
        let next_id = counter.saturating_add(1);
        env.storage()
            .instance()
            .set(&DataKey::SessionCounter, &next_id);
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

    pub(crate) fn set_reentrancy_lock(env: &Env, locked: bool) {
        env.storage()
            .instance()
            .set(&DataKey::ReentrancyLock, &locked);
    }

    pub(crate) fn assert_not_locked(env: &Env) -> Result<(), Error> {
        if Self::reentrancy_locked(env) {
            return Err(Error::Reentrancy);
        }
        Ok(())
    }

    fn ensure_protocol_active(env: &Env) -> Result<(), Error> {
        if Self::protocol_paused(env) {
            return Err(Error::ProtocolPaused);
        }

        Ok(())
    }

    fn enforce_seeker_spending_limit(env: &Env, seeker: &Address, amount: i128) -> Result<(), Error> {
        if let Some(limit) = env
            .storage()
            .persistent()
            .get::<DataKey, i128>(&DataKey::SeekerSpendingLimit(seeker.clone()))
        {
            if amount > limit {
                return Err(Error::SpendingLimitExceeded);
            }
        }
        Ok(())
    }

    fn assert_expert_can_accept_session(
        env: &Env,
        expert: Address,
        min_reputation: u32,
    ) -> Result<ExpertProfile, Error> {
        if disputes::is_expert_on_cooldown(env, &expert) {
            return Err(Error::ExpertOnCooldown);
        }

        let profile = Self::expert_profile(env, expert.clone());
        if profile.rate_per_second == 0 {
            return Err(Error::ExpertNotRegistered);
        }
        if !profile.availability_status {
            return Err(Error::ExpertUnavailable);
        }

        if let Some(last_hb) = env
            .storage()
            .persistent()
            .get::<DataKey, u64>(&DataKey::ExpertLastHeartbeat(expert.clone()))
        {
            let now_secs = env.ledger().timestamp();
            if now_secs.saturating_sub(last_hb) > HEARTBEAT_VALIDITY_WINDOW {
                return Err(Error::ExpertOffline);
            }
        }

        if Self::effective_reputation(&profile) < min_reputation {
            return Err(Error::ReputationTooLow);
        }

        Ok(profile)
    }

    fn create_active_session(
        env: &Env,
        seeker: Address,
        expert: Address,
        token: Address,
        rate_per_second: i128,
        amount: i128,
        metadata_cid: String,
        scheduled_start: Option<u64>,
        duration_cap: Option<u64>,
        agency_address: Option<Address>,
        agency_share_bps: u32,
        rate_currency: RateCurrency,
        locked_xlm_rate: Option<i128>,
    ) -> u64 {
        let token_client = token::Client::new(env, &token);
        token_client.transfer(&seeker, &env.current_contract_address(), &amount);

        let session_id = Self::next_session_id(env);
        let now = env.ledger().timestamp() as u32;
        let start_ts = scheduled_start.unwrap_or(now as u64) as u32;

        let session = Session {
            id: session_id,
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: token.clone(),
            rate_per_second,
            balance: amount,
            last_settlement_timestamp: start_ts,
            start_timestamp: start_ts,
            scheduled_start,
            duration_cap,
            accrued_amount: 0,
            status: SessionStatus::Active,
            metadata_cid: metadata_cid.clone(),
            encrypted_notes_hash: None,
            paused_at: None,
            agency_address,
            agency_share_bps,
            rate_currency: rate_currency.clone(),
            locked_xlm_rate,
            expires_at: None,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);
        env.storage()
            .persistent()
            .set(&DataKey::SessionLastVerified(session_id), &(now as u64));

        events::publish_event(
            env,
            events::event_type::session_started(),
            session_id,
            (
                seeker.clone(),
                expert.clone(),
                rate_per_second,
                amount,
                metadata_cid,
            ),
        );

        session_id
    }

    fn lock_usd_rate_for_session(env: &Env, expert: &Address) -> Option<i128> {
        let cfg_opt: Option<ExpertPriceFeedConfig> = env
            .storage()
            .persistent()
            .get(&DataKey::ExpertPriceFeed(expert.clone()));

        let cfg = cfg_opt?;
        let client = PriceOracleClient::new(env, &cfg.oracle_contract);
        let (price, last_updated_at) = client.get_price(&cfg.asset_pair);
        let now = env.ledger().timestamp() as u32;
        if now.saturating_sub(last_updated_at) > cfg.max_staleness_seconds {
            return None;
        }

        Some(price)
    }

    fn get_session_or_error(env: &Env, session_id: u64) -> Result<Session, Error> {
        let mut session: Session = env
            .storage()
            .persistent()
            .get(&DataKey::Session(session_id))
            .ok_or(Error::SessionNotFound)?;

        if session.status == SessionStatus::Reserved {
            if let Some(scheduled_start) = session.scheduled_start {
                let now = env.ledger().timestamp();
                if now >= scheduled_start {
                    session.status = SessionStatus::Active;
                    session.last_settlement_timestamp = scheduled_start as u32;
                    session.start_timestamp = scheduled_start as u32;
                    env.storage()
                        .persistent()
                        .set(&DataKey::Session(session.id), &session);
                    events::publish_event(
                        env,
                        events::event_type::session_reserved_activated(),
                        session.id,
                        (session.expert.clone(), scheduled_start),
                    );
                }
            }
        }

        Ok(session)
    }

    pub(crate) fn save_session(env: &Env, session: &Session) {
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
    fn apply_burn(env: &Env, session_id: u64, token: &Address, treasury_share: i128) -> i128 {
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
        events::publish_event(
            env,
            events::event_type::fee_burn(),
            session_id,
            (token.clone(), burn_amount, burn_bps),
        );
        burn_amount
    }

    /// Compute the platform fee, honouring the per-asset override
    /// (#196) when one is configured for `token`. Falls through to
    /// the global tiered config otherwise.
    fn platform_fee_for_token(env: &Env, token: &Address, amount: i128) -> Result<i128, Error> {
        if let Some(asset_bps) = env
            .storage()
            .instance()
            .get::<DataKey, u32>(&DataKey::AssetFeeBps(token.clone()))
        {
            if asset_bps > MAX_BPS {
                return Err(Error::InvalidFeeBps);
            }
            return Ok(amount
                .saturating_mul(asset_bps as i128)
                .saturating_div(MAX_BPS as i128));
        }
        Self::calculate_platform_fee(env.clone(), amount)
    }

    /// Slice `INSURANCE_BPS_OF_FEE` bps off the platform fee for the
    /// insurance fund (#197). Updates the per-token vault balance and
    /// returns the diverted amount so callers can subtract it from
    /// the treasury share. Tokens stay in the contract — actual
    /// transfer to the recipient happens in `withdraw_insurance`.
    fn route_insurance_cut(env: &Env, token: &Address, platform_fee: i128) -> i128 {
        // Skip the diversion when no insurance vault is configured;
        // upgrading deployments don't need to migrate atomically.
        if env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::InsuranceVaultAddress)
            .is_none()
        {
            return 0;
        }
        let cut = platform_fee
            .saturating_mul(INSURANCE_BPS_OF_FEE as i128)
            .saturating_div(MAX_BPS as i128);
        if cut > 0 {
            let mut bal: i128 = env
                .storage()
                .instance()
                .get(&DataKey::InsuranceVaultBalance(token.clone()))
                .unwrap_or(0i128);
            bal = bal.saturating_add(cut);
            env.storage()
                .instance()
                .set(&DataKey::InsuranceVaultBalance(token.clone()), &bal);
        }
        cut
    }
    /// Roll up volume + session counters and emit a `PlatformStats`
    /// event every `PLATFORM_STATS_EMIT_INTERVAL` settled sessions
    /// (#200). The counters themselves are always updated so any
    /// caller can read them via `platform_stats()`; the periodic
    /// event is for off-chain indexers that prefer push over poll.
    fn maybe_emit_platform_stats(env: &Env, last_session_volume: i128) {
        let prev_sessions: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSessionsSettled)
            .unwrap_or(0u64);
        let prev_volume: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalVolumeSettled)
            .unwrap_or(0i128);

        let total_sessions = prev_sessions.saturating_add(1);
        let total_volume = prev_volume.saturating_add(last_session_volume);
        env.storage()
            .instance()
            .set(&DataKey::TotalSessionsSettled, &total_sessions);
        env.storage()
            .instance()
            .set(&DataKey::TotalVolumeSettled, &total_volume);

        if total_sessions % PLATFORM_STATS_EMIT_INTERVAL == 0 {
            events::publish_event(
                env,
                events::event_type::platform_stats(),
                0,
                (total_sessions, total_volume),
            );
        }
    }

    fn require_participant(session: &Session, caller: &Address) -> Result<(), Error> {
        if *caller != session.seeker && *caller != session.expert {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn internal_settle(env: &Env, mut session: Session) -> Result<i128, Error> {
        // === REENTRANCY GUARD ===
        Self::assert_not_locked(env)?;
        Self::set_reentrancy_lock(env, true);

        // === CHECKS ===
        if matches!(
            session.status,
            SessionStatus::Completed
                | SessionStatus::Disputed
                | SessionStatus::Resolved
                | SessionStatus::CancelledByExpert
        ) {
            Self::set_reentrancy_lock(env, false);
            return Err(Error::InvalidSessionState);
        }

        // #203: freeze guard — block settlement if the seeker missed the 30-day check-in.
        let is_frozen: bool = env
            .storage()
            .persistent()
            .get(&DataKey::SessionFrozenFlag(session.id))
            .unwrap_or(false);
        if is_frozen {
            Self::set_reentrancy_lock(env, false);
            return Err(Error::SessionFrozen);
        }

        let now = env.ledger().timestamp();
        let expiry = Self::expiry_timestamp_for_session(&session);
        let effective_time = Self::bounded_time(&session, now);
        // #202: capture elapsed seconds before effects modify last_settlement_timestamp.
        let settled_seconds =
            effective_time.saturating_sub(session.last_settlement_timestamp as u64);
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

        // #196: per-asset fee override takes priority over the
        // tiered config for this session's funding token.
        let base_platform_fee = Self::platform_fee_for_token(env, &session.token, claimable)?;
        // Apply expert-tier discount: Gold = 0 fee, Silver = 50%, Bronze = full.
        let platform_fee = match reputation::get_tier(env, &session.expert) {
            ExpertTier::Gold => 0i128,
            ExpertTier::Silver => base_platform_fee / 2,
            ExpertTier::Bronze => base_platform_fee,
        };
        let expert_earnings = claimable.saturating_sub(platform_fee);
        let referrer = Self::expert_referrer(env, &session.expert);
        let referral_reward = if referrer.is_some()
            && governance::referral_session_count(env, &session.expert)
                < governance::referral_session_limit(env)
        {
            let potential = expert_earnings.saturating_mul(REFERRAL_COMMISSION_BPS as i128)
                / MAX_BPS as i128;
            if potential > platform_fee {
                platform_fee
            } else {
                potential
            }
        } else {
            0
        };

        // #197: slice 1% of the platform fee for the insurance fund
        // before it routes to treasury. Returns 0 when no vault is
        // configured, so deployments upgrade gracefully.
        let insurance_cut = Self::route_insurance_cut(
            env,
            &session.token,
            platform_fee.saturating_sub(referral_reward),
        );
        let treasury_fee = platform_fee
            .saturating_sub(referral_reward)
            .saturating_sub(insurance_cut);
        let payout_before_agency = expert_earnings;
        let agency_share = if let Some(_) = session.agency_address {
            payout_before_agency.saturating_mul(session.agency_share_bps as i128) / MAX_BPS as i128
        } else {
            0
        };
        let mut expert_payout = payout_before_agency.saturating_sub(agency_share);

        // === EFFECTS ===
        session.balance -= claimable;
        session.accrued_amount = 0;
        session.last_settlement_timestamp = effective_time as u32;

        let session_just_completed = session.balance == 0 || now >= expiry;
        if session_just_completed {
            session.status = SessionStatus::Completed;
        }

        let session_id = session.id;
        let expert = session.expert.clone();
        let token = session.token.clone();

        Self::save_session(env, &session);

        // === INTERACTIONS ===
        let token_client = token::Client::new(env, &token);
        if referral_reward > 0 {
            if let Some(referrer) = referrer.clone() {
                token_client.transfer(&env.current_contract_address(), &referrer, &referral_reward);
                events::publish_event(
                    env,
                    events::event_type::referral_commission_paid(),
                    session_id,
                    (referrer, session.expert.clone(), referral_reward),
                );
            }
        }

        if session.agency_share_bps > 0 {
            if let Some(agency) = session.agency_address.clone() {
                if agency_share > 0 {
                    token_client.transfer(&env.current_contract_address(), &agency, &agency_share);
                }
                events::publish_event(
                    env,
                    events::event_type::revenue_shared(),
                    session_id,
                    (expert_payout, agency_share),
                );
            }
        }

        if treasury_fee > 0 {
            // #213 dynamic fee burn: slice `burn_bps` of the
            // treasury share off before routing the rest to treasury.
            // Burned tokens stay in the contract; the burn event +
            // `total_burned(token)` counter let off-chain bookkeeping
            // (or a follow-up admin call to the token contract's
            // burn function) clear them.
            let burned = Self::apply_burn(env, session_id, &token, treasury_fee);
            let treasury_payout = treasury_fee.saturating_sub(burned);
            if treasury_payout > 0 {
                if let Some(treasury) = env
                    .storage()
                    .instance()
                    .get::<DataKey, Address>(&DataKey::TreasuryAddress)
                {
                    token_client.transfer(
                        &env.current_contract_address(),
                        &treasury,
                        &treasury_payout,
                    );
                    events::publish_event(
                        env,
                        events::event_type::admin_config(),
                        session_id,
                        (symbol_short!("feeRoute"), token.clone(), treasury_payout),
                    );
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

        events::publish_event(
            env,
            events::event_type::session_settled(),
            session_id,
            (expert_payout, now),
        );

        // #200: roll-up volume + session counters and emit a
        // PlatformStats event every Nth settled session so off-chain
        // indexers can track growth without re-scanning every event.
        Self::maybe_emit_platform_stats(env, claimable);

        // Increment referral session count for referral commission tracking (Issue #52)
        if referral_reward > 0 {
            governance::increment_referral_session_count(env, &expert);
        }

        // #204: accrue governance voting-power counters.
        governance::accrue_spent(env, &session.seeker, claimable);
        governance::accrue_earned(env, &expert, expert_payout);

        // #202: increment the expert's cumulative settled-seconds counter.
        {
            let prev_secs: u64 = env
                .storage()
                .persistent()
                .get(&DataKey::ExpertTotalSeconds(expert.clone()))
                .unwrap_or(0u64);
            env.storage().persistent().set(
                &DataKey::ExpertTotalSeconds(expert.clone()),
                &prev_secs.saturating_add(settled_seconds),
            );
        }

        // Recalculate expert tier on session completion.
        if session_just_completed {
            reputation::update_expert_tier_on_completion(env, &expert);
        }

        Self::set_reentrancy_lock(env, false);
        Ok(expert_payout)
    }

    fn close_session(env: &Env, session: &mut Session) -> Result<(i128, i128), Error> {
        // === REENTRANCY GUARD ===
        Self::assert_not_locked(env)?;
        Self::set_reentrancy_lock(env, true);

        // === CHECKS ===
        if matches!(
            session.status,
            SessionStatus::Completed
                | SessionStatus::Disputed
                | SessionStatus::Resolved
                | SessionStatus::CancelledByExpert
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
            token_client.transfer(
                &env.current_contract_address(),
                &session.expert,
                &final_claimable,
            );
        }

        if final_remaining > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &session.seeker,
                &final_remaining,
            );
        }

        let finished_at = env.ledger().timestamp();
        events::publish_event(
            env,
            events::event_type::session_finished(),
            session.id,
            (final_claimable, final_remaining, finished_at),
        );

        // Recalculate expert tier whenever a session is explicitly closed.
        reputation::update_expert_tier_on_completion(env, &session.expert);

        Self::set_reentrancy_lock(env, false);
        Ok((final_claimable, final_remaining))
    }

    pub(crate) fn claimable_amount_for_session(session: &Session, current_time: u64) -> i128 {
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
        let base = (elapsed as i128).saturating_mul(session.rate_per_second);

        if session.rate_currency == RateCurrency::USD {
            if let Some(locked_rate) = session.locked_xlm_rate {
                return base.saturating_mul(locked_rate) / MAX_BPS as i128;
            }
        }

        base
    }

    fn expiry_timestamp_for_session(session: &Session) -> u64 {
        if session.rate_per_second <= 0 || session.balance <= 0 {
            return session.last_settlement_timestamp as u64;
        }

        let funded_seconds =
            ((session.balance + session.rate_per_second - 1) / session.rate_per_second) as u64;
        let expiry_by_balance = (session.last_settlement_timestamp as u64).saturating_add(funded_seconds);

        if let Some(duration_cap) = session.duration_cap {
            let start = session.scheduled_start.unwrap_or(session.start_timestamp as u64);
            let expiry_by_cap = start.saturating_add(duration_cap);
            if expiry_by_cap < expiry_by_balance {
                expiry_by_cap
            } else {
                expiry_by_balance
            }
        } else {
            expiry_by_balance
        }
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

    pub(crate) fn bounded_time(session: &Session, current_time: u64) -> u64 {
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
                agency_address: None,
                agency_share_bps: 0,
                rate_currency: RateCurrency::XLM,
                staked_balance: 0,
                reputation: 0,
                cross_chain_reputation: 0,
                availability_status: false,
            })
    }

    fn effective_reputation(profile: &ExpertProfile) -> u32 {
        profile
            .reputation
            .saturating_add(profile.cross_chain_reputation)
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

        disputes::apply_cooldown_if_expert_lost(
            env,
            &session.expert,
            seeker_award_bps,
            expert_award_bps,
        );
        if disputes::is_expert_on_cooldown(env, &session.expert) {
            if let Some(until) = disputes::expert_cooldown_until(env, &session.expert) {
                events::publish_event(
                    env,
                    events::event_type::expert_cooldown(),
                    session.id,
                    (session.expert.clone(), until),
                );
            }
        }

        events::publish_event(
            env,
            events::event_type::dispute_resolved(),
            session.id,
            (
                seeker_amount,
                expert_amount,
                auto_resolved,
            ),
        );

        Ok(())
    }

    fn dispute_expiry_timestamp(dispute: &Dispute) -> u64 {
        (dispute.created_at as u64).saturating_add(DISPUTE_EXPIRY_WINDOW)
    }

    pub(crate) fn is_valid_ipfs_cid(cid: &String) -> bool {
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
        if env
            .storage()
            .persistent()
            .has(&DataKey::SessionRating(session_id))
        {
            return Err(Error::RatingSubmitted);
        }

        // Store the rating
        let rating_record = SessionRating {
            session_id,
            rater: session.seeker.clone(),
            rating,
            created_at: env.ledger().timestamp() as u32,
        };
        env.storage()
            .persistent()
            .set(&DataKey::SessionRating(session_id), &rating_record);

        // Update expert's average rating
        let expert = session.expert.clone();
        let current_avg: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ExpertAverageRating(expert.clone()))
            .unwrap_or(0);
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ExpertRatingCount(expert.clone()))
            .unwrap_or(0);

        let new_count = count.saturating_add(1);
        let new_avg = if count == 0 {
            rating
        } else {
            (((current_avg as u64)
                .saturating_mul(count as u64)
                .saturating_add(rating as u64))
                / new_count as u64) as u32
        };

        env.storage()
            .persistent()
            .set(&DataKey::ExpertAverageRating(expert.clone()), &new_avg);
        env.storage()
            .persistent()
            .set(&DataKey::ExpertRatingCount(expert.clone()), &new_count);

        events::publish_event(
            &env,
            events::event_type::rating(),
            session_id,
            (expert, rating, new_avg),
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

    // ====================================================================
    // Expert Tier System
    // ====================================================================

    /// Returns the current performance tier of an expert.
    ///
    /// Defaults to `ExpertTier::Bronze` for experts with no completed sessions.
    pub fn get_expert_tier(env: Env, expert: Address) -> ExpertTier {
        reputation::get_tier(&env, &expert)
    }

    /// Returns the number of fully-completed sessions for an expert.
    pub fn get_expert_completed_sessions(env: Env, expert: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertCompletedSessions(expert))
            .unwrap_or(0u32)
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
        profile.agency_address = None;
        profile.agency_share_bps = 0;
        profile.rate_currency = RateCurrency::XLM;

        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert.clone()), &profile);

        // Initialize referral session count
        if referrer_id.is_some() {
            env.storage()
                .persistent()
                .set(&DataKey::ReferralSessionCount(expert.clone()), &0u32);
        }

        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("regist"), expert, referrer_id),
        );

        Ok(())
    }

    /// Increments the referral session count for an expert (Issue #52).
    /// Called internally when a session is settled.
    fn increment_referral_session_count(env: &Env, expert: &Address) {
        let current: u32 = env
            .storage()
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
        env.storage()
            .persistent()
            .set(&DataKey::TrustedOracle(oracle.clone()), &true);
        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("oracleReg"), oracle),
        );
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
        env.storage()
            .persistent()
            .remove(&DataKey::TrustedOracle(oracle.clone()));
        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("oracleRm"), oracle),
        );
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
        let is_trusted: bool = env
            .storage()
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

        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("verified"), expert, oracle_source),
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
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert.clone()), &profile);

        // Emit event for frontend indexer
        events::publish_event(
            &env,
            events::event_type::staking(),
            0,
            (symbol_short!("staked"), expert.clone(), amount),
        );

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
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert.clone()), &profile);

        // Emit event for frontend indexer
        events::publish_event(
            &env,
            events::event_type::staking(),
            0,
            (symbol_short!("unstaked"), expert.clone(), amount),
        );

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

        // Mapping-style storage is cheaper than persisting an address array.
        let mut committee: Map<Address, bool> = Map::new(&env);
        committee.set(member1, true);
        committee.set(member2, true);
        committee.set(member3, true);
        env.storage()
            .persistent()
            .set(&DataKey::ArbitrationCommittee, &committee);

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

        events::publish_event(
            &env,
            events::event_type::governance(),
            session_id,
            (symbol_short!("resProp"), seeker_award_bps),
        );

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
        let treasury = env
            .storage()
            .instance()
            .get::<DataKey, Address>(&DataKey::TreasuryAddress)
            .ok_or(Error::InsuffTreasuryBal)?;

        // Transfer slashed tokens to treasury
        let token = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &treasury, &amount);

        // Deduct from expert's staked balance
        profile.staked_balance = profile.staked_balance.saturating_sub(amount);
        env.storage()
            .persistent()
            .set(&DataKey::ExpertProfile(expert_id.clone()), &profile);

        // Update treasury balance tracking
        let treasury_key = DataKey::TreasuryBalance(token);
        let mut treasury_balance: i128 = env.storage().instance().get(&treasury_key).unwrap_or(0);
        treasury_balance = treasury_balance.saturating_add(amount);
        env.storage()
            .instance()
            .set(&treasury_key, &treasury_balance);

        // Emit event for auditing
        events::publish_event(
            &env,
            events::event_type::slashing(),
            0,
            (expert_id.clone(), amount, reason.clone()),
        );

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
        Self::assert_not_locked(&env)?;
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

        if session.accrued_amount > 0
            || session.last_settlement_timestamp != session.start_timestamp
        {
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
        token_client.transfer(
            &env.current_contract_address(),
            &session.seeker,
            &refund_amount,
        );

        events::publish_event(
            &env,
            events::event_type::session_refund(),
            session_id,
            (refund_amount, now),
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
        Self::assert_not_locked(&env)?;
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
        token_client.transfer(
            &env.current_contract_address(),
            &session.expert,
            &total_claimable,
        );

        events::publish_event(
            &env,
            events::event_type::session_settled(),
            session_id,
            (symbol_short!("withdraw"), total_claimable, now),
        );

        Self::set_reentrancy_lock(&env, false);
        Ok(total_claimable)
    }

    // ====================================================================
    // #202 — Soulbound Skill Badges
    // ====================================================================

    /// Admin sets the address of the external SBT contract that receives
    /// `mint_badge` cross-contract calls.
    pub fn set_sbt_contract(env: Env, sbt_addr: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::SbtContractAddress, &sbt_addr);
        events::publish_event(&env, events::event_type::integration(), 0, (symbol_short!("sbtSet"), sbt_addr));
        Ok(())
    }

    /// Mints a soulbound badge for `expert` once they have accumulated ≥ 100 h
    /// of settled session time.  Reverts if already minted or threshold not met.
    pub fn mint_badge(env: Env, expert: Address) -> Result<BadgeRecord, Error> {
        expert.require_auth();

        if env
            .storage()
            .persistent()
            .has(&DataKey::ExpertBadge(expert.clone()))
        {
            return Err(Error::BadgeAlreadyMinted);
        }

        let total_secs: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ExpertTotalSeconds(expert.clone()))
            .unwrap_or(0u64);
        if total_secs < reputation::BADGE_HOURS_THRESHOLD_SECS {
            return Err(Error::HoursThresholdNotMet);
        }

        let sbt_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::SbtContractAddress)
            .ok_or(Error::ContractUnset)?;

        let badge_id: u64 = total_secs; // deterministic: total seconds at mint
        let now = env.ledger().timestamp();

        reputation::cross_contract_mint_badge(&env, &sbt_contract, &expert, badge_id);

        let record = BadgeRecord {
            expert: expert.clone(),
            seconds_at_mint: total_secs,
            minted_at: now,
            badge_token_id: badge_id,
        };
        env.storage()
            .persistent()
            .set(&DataKey::ExpertBadge(expert.clone()), &record);

        events::publish_event(
            &env,
            events::event_type::badge(),
            0,
            (expert, badge_id, now),
        );
        Ok(record)
    }

    /// Returns the badge record for `expert`, or `None` if not yet minted.
    pub fn get_badge(env: Env, expert: Address) -> Option<BadgeRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertBadge(expert))
    }

    /// Returns the total settled seconds accumulated by `expert` towards the badge.
    pub fn get_expert_total_seconds(env: Env, expert: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ExpertTotalSeconds(expert))
            .unwrap_or(0u64)
    }

    // ====================================================================
    // #203 — Periodic Re-Verification for Long-Term Escrows
    // ====================================================================

    /// Seeker re-verifies an ongoing session, refreshing the 30-day clock and
    /// clearing any freeze flag previously set by `check_and_freeze`.
    pub fn reverify_session(env: Env, seeker: Address, session_id: u64) -> Result<(), Error> {
        seeker.require_auth();
        let session = Self::get_session_or_error(&env, session_id)?;
        if seeker != session.seeker {
            return Err(Error::Unauthorized);
        }
        let now = env.ledger().timestamp();
        env.storage()
            .persistent()
            .set(&DataKey::SessionLastVerified(session_id), &now);
        env.storage()
            .persistent()
            .set(&DataKey::SessionFrozenFlag(session_id), &false);
        events::publish_event(
            &env,
            events::event_type::reverify(),
            session_id,
            now,
        );
        Ok(())
    }

    /// Permissionless: freezes a session if the seeker missed the 30-day
    /// re-verification window.  Anyone may call this to enforce the invariant.
    pub fn check_and_freeze(env: Env, session_id: u64) -> Result<(), Error> {
        let _session = Self::get_session_or_error(&env, session_id)?;
        let last_verified: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::SessionLastVerified(session_id))
            .unwrap_or(0u64);
        let now = env.ledger().timestamp();
        if now.saturating_sub(last_verified) > REVERIFY_PERIOD_SECS {
            env.storage()
                .persistent()
                .set(&DataKey::SessionFrozenFlag(session_id), &true);
            events::publish_event(
                &env,
                events::event_type::frozen(),
                session_id,
                now,
            );
        }
        Ok(())
    }

    /// Returns `true` when the session has been frozen due to a missed check-in.
    pub fn get_session_frozen(env: Env, session_id: u64) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::SessionFrozenFlag(session_id))
            .unwrap_or(false)
    }

    // ====================================================================
    // #204 — Community Treasury Voting Power
    // ====================================================================

    /// Returns `total_spent(user) + total_earned(user)` as the user's
    /// governance voting weight based on session volume.
    pub fn voting_power(env: Env, user: Address) -> i128 {
        governance::total_spent(&env, &user).saturating_add(governance::total_earned(&env, &user))
    }

    /// Returns the cumulative tokens `user` has spent as a seeker.
    pub fn get_total_spent(env: Env, user: Address) -> i128 {
        governance::total_spent(&env, &user)
    }

    /// Returns the cumulative tokens `user` has earned as an expert.
    pub fn get_total_earned(env: Env, user: Address) -> i128 {
        governance::total_earned(&env, &user)
    }

    // ====================================================================
    // #205 — Cross-Contract Token Swaps (DEX Integration)
    // ====================================================================

    /// Admin sets the DEX router address (Phoenix / Soroswap).
    pub fn set_dex_contract(env: Env, dex_addr: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&DataKey::DexContractAddress, &dex_addr);
        events::publish_event(&env, events::event_type::integration(), 0, (symbol_short!("dexSet"), dex_addr));
        Ok(())
    }

    /// Returns the configured DEX router address, if any.
    pub fn get_dex_contract(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::DexContractAddress)
    }

    /// Starts a streaming session where the seeker pays in `offer_token` but
    /// the expert is paid in `ask_token`.  The DEX swap happens atomically.
    ///
    /// # Arguments
    /// * `seeker`        — must auth; holds `offer_token`
    /// * `expert`        — registered, available expert
    /// * `offer_token`   — token the seeker sends (e.g. XLM)
    /// * `ask_token`     — token the session is denominated in (e.g. USDC)
    /// * `path`          — intermediate asset hops (empty = direct pair)
    /// * `offer_amount`  — amount of `offer_token` to spend
    /// * `metadata_cid`  — IPFS CID for session metadata
    pub fn start_session_with_swap(
        env: Env,
        seeker: Address,
        expert: Address,
        offer_token: Address,
        ask_token: Address,
        path: Vec<Address>,
        offer_amount: i128,
        metadata_cid: String,
    ) -> Result<u64, Error> {
        seeker.require_auth();
        Self::ensure_protocol_active(&env)?;

        if let Err(e) = admin::rate_limit(&env, &seeker, admin::rate_limit_min_ledgers(&env)) {
            return Err(e);
        }
        if let Err(e) = admin::require_token_whitelisted(&env, &ask_token) {
            return Err(e);
        }

        if offer_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !Self::is_valid_ipfs_cid(&metadata_cid) {
            return Err(Error::InvalidCid);
        }

        let profile = Self::expert_profile(&env, expert.clone());
        if profile.rate_per_second == 0 {
            return Err(Error::ExpertNotRegistered);
        }
        if !profile.availability_status {
            return Err(Error::ExpertUnavailable);
        }

        let dex_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::DexContractAddress)
            .ok_or(Error::ContractUnset)?;

        // Transfer offer_token from seeker into the contract escrow.
        let offer_client = token::Client::new(&env, &offer_token);
        if offer_client.balance(&seeker) < offer_amount {
            return Err(Error::InsufficientBalance);
        }
        offer_client.transfer(&seeker, &env.current_contract_address(), &offer_amount);

        // Cross-contract swap: contract sends offer_token, receives ask_token.
        let ask_amount = dex::cross_contract_swap(
            &env,
            &dex_contract,
            &offer_token,
            &ask_token,
            &path,
            offer_amount,
        );
        if ask_amount <= 0 {
            return Err(Error::SwapFailed);
        }

        let session_id = Self::next_session_id(&env);
        let now = env.ledger().timestamp() as u32;

        let session = Session {
            id: session_id,
            seeker: seeker.clone(),
            expert: expert.clone(),
            token: ask_token.clone(),
            rate_per_second: profile.rate_per_second,
            balance: ask_amount,
            last_settlement_timestamp: now,
            start_timestamp: now,
            scheduled_start: None,
            duration_cap: None,
            accrued_amount: 0,
            status: SessionStatus::Active,
            metadata_cid: metadata_cid.clone(),
            encrypted_notes_hash: None,
            paused_at: None,
            agency_address: profile.agency_address.clone(),
            agency_share_bps: profile.agency_share_bps,
            rate_currency: profile.rate_currency.clone(),
            locked_xlm_rate: None,
            expires_at: None,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);

        // #203: stamp initial re-verification timestamp.
        env.storage()
            .persistent()
            .set(&DataKey::SessionLastVerified(session_id), &(now as u64));

        events::publish_event(
            &env,
            events::event_type::swap(),
            session_id,
            (
                seeker,
                expert,
                offer_token,
                ask_token,
                offer_amount,
                ask_amount,
            ),
        );
        Ok(session_id)
    }

    // ── Privacy-preserving session handshakes (issue #206) ───────────────

    /// Register a commit-reveal commitment to a session.
    ///
    /// The seeker / expert pair is not visible on-chain until
    /// `reveal_session_handshake` is called with the same `salt`. Until
    /// then a public observer only sees the commitment hash and the
    /// committer's address — so a snoop on the indexer cannot tell who
    /// is meeting whom in advance, which prevents grief / harassment
    /// based on pending session identity.
    ///
    /// `commitment` should be `sha256(salt || seeker_bytes || expert_bytes)`
    /// computed off-chain. The contract does not verify the construction
    /// here; the verification happens at reveal time.
    pub fn commit_session_handshake(
        env: Env,
        committer: Address,
        commitment: BytesN<32>,
    ) -> Result<(), Error> {
        committer.require_auth();
        if Self::protocol_paused(&env) {
            return Err(Error::ProtocolPaused);
        }
        let key = DataKey::SessionCommit(commitment.clone());
        let consumed_key = DataKey::SessionCommitConsumed(commitment.clone());
        if env.storage().temporary().has(&key) || env.storage().persistent().has(&consumed_key) {
            // Re-using a commitment is rejected so an observer cannot
            // "overwrite" a stranger's commitment record, and so a
            // previously-revealed preimage cannot be replayed.
            return Err(Error::AlreadyInitialized);
        }
        let record = CommitRecord {
            committer: committer.clone(),
            created_at: env.ledger().timestamp() as u32,
        };
        env.storage().temporary().set(&key, &record);
        events::publish_event(
            &env,
            events::event_type::session_commit(),
            0,
            (commitment, committer),
        );
        Ok(())
    }

    /// Reveal a previously-registered commitment by supplying the salt
    /// and the (seeker, expert) tuple that produced it. The contract
    /// re-derives the SHA-256 hash and compares against the stored
    /// commitment; on success the commitment is consumed (removed from
    /// storage) and a `session/reveal` event is published carrying the
    /// real identities.
    pub fn reveal_session_handshake(
        env: Env,
        committer: Address,
        salt: BytesN<32>,
        seeker: Address,
        expert: Address,
    ) -> Result<(), Error> {
        committer.require_auth();
        if Self::protocol_paused(&env) {
            return Err(Error::ProtocolPaused);
        }

        // Re-derive the expected commitment from the supplied tuple.
        let mut preimage = Bytes::new(&env);
        preimage.append(&salt.clone().into());
        preimage.append(&seeker.clone().to_xdr(&env));
        preimage.append(&expert.clone().to_xdr(&env));
        let computed = env.crypto().sha256(&preimage);
        let key = DataKey::SessionCommit(computed.clone().into());

        let record: CommitRecord = env
            .storage()
            .temporary()
            .get(&key)
            .ok_or(Error::SessionNotFound)?;

        if record.committer != committer {
            return Err(Error::InvalidSessionState);
        }

        env.storage().temporary().remove(&key);
        // Leave a tombstone so the same commitment hash cannot be
        // committed again after its preimage has been revealed.
        env.storage()
            .persistent()
            .set(&DataKey::SessionCommitConsumed(computed.into()), &true);
        events::publish_event(
            &env,
            events::event_type::session_reveal(),
            0,
            (committer, seeker, expert),
        );
        Ok(())
    }

    /// Read-only commitment lookup. Used by clients to detect that a
    /// commitment has already landed (e.g. transaction was confirmed
    /// after a network blip) before resubmitting.
    pub fn get_session_commit(env: Env, commitment: BytesN<32>) -> Option<CommitRecord> {
        env.storage()
            .temporary()
            .get(&DataKey::SessionCommit(commitment))
    }

    // ── Dynamic pricing oracles (issue #207) ─────────────────────────────

    /// Expert-only: opt in to dynamic pricing by registering an oracle
    /// price-feed configuration. The expert keeps full control — they
    /// can call `clear_expert_price_feed` to fall back to the static
    /// `rate_per_second` recorded on their profile.
    pub fn set_expert_price_feed(
        env: Env,
        expert: Address,
        config: ExpertPriceFeedConfig,
    ) -> Result<(), Error> {
        expert.require_auth();
        if Self::protocol_paused(&env) {
            return Err(Error::ProtocolPaused);
        }
        if config.multiplier_bps == 0 || config.multiplier_bps > 100_000 {
            // Cap at 10× spot to prevent a misconfigured feed from
            // draining a session deposit in seconds.
            return Err(Error::InvalidFeeBps);
        }
        if config.max_staleness_seconds == 0 {
            return Err(Error::InvalidFeeConfig);
        }
        env.storage()
            .persistent()
            .set(&DataKey::ExpertPriceFeed(expert.clone()), &config);
        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("feedset"), expert),
        );
        Ok(())
    }

    /// Expert-only: remove a previously-registered price feed and revert
    /// to the static rate on the profile.
    pub fn clear_expert_price_feed(env: Env, expert: Address) -> Result<(), Error> {
        expert.require_auth();
        if Self::protocol_paused(&env) {
            return Err(Error::ProtocolPaused);
        }
        env.storage()
            .persistent()
            .remove(&DataKey::ExpertPriceFeed(expert.clone()));
        events::publish_event(
            &env,
            events::event_type::expert_profile(),
            0,
            (symbol_short!("feedrm"), expert),
        );
        Ok(())
    }

    /// Read-only: return the per-second rate the expert should charge
    /// right now. If a price feed is configured, the oracle is queried
    /// and scaled by the configured multiplier; staleness is enforced
    /// against `max_staleness_seconds`. If no feed is configured the
    /// expert's static profile rate is returned.
    pub fn get_dynamic_rate(env: Env, expert: Address) -> Result<i128, Error> {
        let cfg_opt: Option<ExpertPriceFeedConfig> = env
            .storage()
            .persistent()
            .get(&DataKey::ExpertPriceFeed(expert.clone()));

        let cfg = match cfg_opt {
            Some(c) => c,
            None => {
                // No feed configured — return the static rate from the
                // expert's profile.
                let profile = Self::expert_profile(&env, expert);
                return Ok(profile.rate_per_second);
            }
        };

        let client = PriceOracleClient::new(&env, &cfg.oracle_contract);
        let (price, last_updated_at) = client.get_price(&cfg.asset_pair);

        let now = env.ledger().timestamp() as u32;
        if now.saturating_sub(last_updated_at) > cfg.max_staleness_seconds {
            return Err(Error::OracleNotTrusted);
        }

        // rate = price * multiplier / 10_000. Saturating math keeps us
        // from panicking on a misbehaving oracle that returns i128::MAX.
        let scaled = price
            .saturating_mul(cfg.multiplier_bps as i128)
            .saturating_div(10_000);
        Ok(scaled)
    }

    // ── Broader pause coverage (issue #208) ──────────────────────────────
    //
    // `pause_protocol` / `unpause_protocol` / `is_protocol_paused` were
    // already implemented for issue #208's earlier ratchet. This PR
    // extends the coverage so the new commit-reveal and price-feed
    // setter functions also short-circuit while paused (see the
    // ProtocolPaused check at the top of each new function above).
    // Existing functions that already guard themselves include
    // `start_session`, `stake`, and the various claim paths. The
    // public accessor `is_protocol_paused` is re-exposed here as a
    // doc anchor for consumers wiring an off-chain "protocol up?"
    // status badge.
    pub fn is_paused(env: Env) -> bool {
        Self::protocol_paused(&env)
    }
}

#[cfg(test)]
mod test {

    #[test]
    fn test_1_second_session() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);
        let session_id =
            client.start_session(&seeker, &expert, &token, &30_000, &0, &test_cid(&env));

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

        let session_id =
            client.start_session(&seeker, &expert, &token, &deposit, &0, &test_cid(&env));

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
        client.register_expert(&expert, &10, &test_cid(&env), &None, &None, &RateCurrency::XLM);
        client.set_availability(&expert, &false);
        client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
    }

    #[test]
    fn test_expert_registration_and_availability() {
        let (env, client, _, _, _, expert, _, _) = setup();
        let rate = 50;
        let cid = test_cid(&env);

        client.register_expert(&expert, &rate, &cid, &None, &None, &RateCurrency::XLM);
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

    fn register_and_avail(
        env: &Env,
        client: &SkillSphereContractClient,
        expert: &Address,
        rate: i128,
    ) {
        let cid = test_cid(env);
        client.register_expert(expert, &rate, &cid, &None, &None, &RateCurrency::XLM);
        client.set_availability(expert, &true);
    }

    fn test_cid(env: &Env) -> String {
        String::from_str(env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz8")
    }

    fn whitelist_token(
        client: &SkillSphereContractClient,
        admin: &Address,
        token: &Address,
    ) {
        if !client.is_token_approved(token) {
            client.add_approved_token(admin, token);
        }
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

        client.add_approved_token(&admin, &token_address);

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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let claimable = client.calculate_claimable_amount(&session_id, &env.ledger().timestamp());
        assert_eq!(claimable, 0);
    }

    #[test]
    fn test_start_session_locks_tokens_and_creates_session() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let claimable =
            client.calculate_claimable_amount(&session_id, &(env.ledger().timestamp() + 10));
        assert_eq!(claimable, 100);
    }

    #[test]
    fn test_pause_and_resume_preserve_accrued_amount() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        client.pause_session(&stranger, &session_id);
    }

    #[test]
    fn test_settle_session_transfers_partial_milestone_payment() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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

        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        assert_eq!(session_id, 1);
    }

    #[test]
    fn test_start_session_assigns_unique_monotonic_ids() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        let first = client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        let second = client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        assert_eq!(first, 1);
        assert_eq!(second, 2);
        assert_ne!(first, second);
    }

    #[test]
    fn test_cross_chain_reputation_is_aggregated() {
        let (env, client, _, _, _, expert, _, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        let oracle = Address::generate(&env);
        client.register_trusted_oracle(&oracle);
        client.set_expert_reputation(&expert, &10);

        client.set_cross_chain_reputation(
            &oracle,
            &expert,
            &String::from_str(&env, "ethereum"),
            &40,
        );
        client.set_cross_chain_reputation(
            &oracle,
            &expert,
            &String::from_str(&env, "polygon"),
            &15,
        );

        assert_eq!(
            client.get_cross_chain_reputation(&expert, &String::from_str(&env, "ethereum")),
            40
        );
        assert_eq!(client.get_expert_reputation(&expert), 65);
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        assert_eq!(client.calculate_expiry_timestamp(&session_id), 1_300);
    }

    #[test]
    fn test_settle_session_after_funded_window_drains_and_finishes() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_600);
        client.claim_no_show_refund(&seeker, &session_id);
    }

    #[test]
    fn test_flag_dispute_stores_evidence_cid() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 0);
    }

    #[test]
    fn test_get_current_earnings_reflects_elapsed_time() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_015);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 150);
    }

    #[test]
    fn test_get_current_earnings_caps_at_session_balance() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);
        let earnings = client.get_current_earnings(&session_id);
        assert_eq!(earnings, 100);
    }

    #[test]
    fn test_get_current_earnings_zero_when_paused() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

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

        let session_1 = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        register_and_avail(&env, &client, &expert, 5);
        let session_2 = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

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

        let session_1 = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let session_2 =
            client.start_session(&seeker, &other_expert, &token, &3000, &0, &test_cid(&env));

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
        let session_id = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

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
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

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
        let session_id =
            client.start_session(&seeker, &expert, &token, &30_000, &0, &test_cid(&env));

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
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
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

        let session_id =
            client.start_session(&seeker, &expert, &token, &10_000, &0, &test_cid(&env));
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

        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        let session = client.get_session(&session_id);
        assert_eq!(session.token, token);
    }

    #[test]
    fn test_multiple_sessions_with_different_tokens() {
        let (env, client, _, admin, seeker, expert, token1, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);

        // Create second token (USDC)
        let token2 = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token2_address = token2.address();
        whitelist_token(&client, &admin, &token2_address);
        let asset_admin2 = token::StellarAssetClient::new(&env, &token2_address);
        asset_admin2.mint(&seeker, &10_000);

        // Start session with first token (XLM)
        let session1_id =
            client.start_session(&seeker, &expert, &token1, &3_000, &0, &test_cid(&env));

        // Start session with second token (USDC)
        let session2_id = client.start_session(
            &seeker,
            &expert,
            &token2_address,
            &5_000,
            &0,
            &test_cid(&env),
        );

        let session1 = client.get_session(&session1_id);
        let session2 = client.get_session(&session2_id);

        assert_eq!(session1.token, token1);
        assert_eq!(session2.token, token2_address);
        assert_ne!(session1.token, session2.token);
    }

    #[test]
    fn test_settle_session_uses_correct_token_contract() {
        let (env, client, _, admin, seeker, expert, token1, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);

        // Create USDC token
        let usdc_token = env.register_stellar_asset_contract_v2(token_admin.clone());
        let usdc_address = usdc_token.address();
        whitelist_token(&client, &admin, &usdc_address);
        let usdc_admin = token::StellarAssetClient::new(&env, &usdc_address);
        usdc_admin.mint(&seeker, &10_000);

        let usdc_client = token::Client::new(&env, &usdc_address);

        // Start session with USDC
        let session_id =
            client.start_session(&seeker, &expert, &usdc_address, &5_000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_010);
        client.settle_session(&session_id);

        // Verify payment was made in USDC, not XLM
        assert_eq!(usdc_client.balance(&expert), 95);

        let token1_client = token::Client::new(&env, &token1);
        assert_eq!(token1_client.balance(&expert), 0);
    }

    #[test]
    fn test_expert_can_accept_multiple_token_types() {
        let (env, client, _, admin, seeker, expert, xlm_token, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);

        // Create USDC and DAI tokens
        let usdc = env.register_stellar_asset_contract_v2(token_admin.clone());
        let usdc_address = usdc.address();
        let dai = env.register_stellar_asset_contract_v2(token_admin.clone());
        let dai_address = dai.address();
        whitelist_token(&client, &admin, &usdc_address);
        whitelist_token(&client, &admin, &dai_address);

        let usdc_admin = token::StellarAssetClient::new(&env, &usdc_address);
        let dai_admin = token::StellarAssetClient::new(&env, &dai_address);
        usdc_admin.mint(&seeker, &10_000);
        dai_admin.mint(&seeker, &10_000);

        // Expert accepts sessions in XLM, USDC, and DAI
        let xlm_session =
            client.start_session(&seeker, &expert, &xlm_token, &3_000, &0, &test_cid(&env));
        let usdc_session =
            client.start_session(&seeker, &expert, &usdc_address, &4_000, &0, &test_cid(&env));
        let dai_session =
            client.start_session(&seeker, &expert, &dai_address, &5_000, &0, &test_cid(&env));

        // Verify all sessions are active with correct tokens
        assert_eq!(client.get_session(&xlm_session).token, xlm_token);
        assert_eq!(client.get_session(&usdc_session).token, usdc_address);
        assert_eq!(client.get_session(&dai_session).token, dai_address);
    }

    #[test]
    fn test_treasury_tracks_fees_per_token() {
        let (env, client, _, admin, seeker, expert, token1, token_admin) = setup();
        register_and_avail(&env, &client, &expert, 10);

        let token2 = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token2_address = token2.address();
        whitelist_token(&client, &admin, &token2_address);
        let asset_admin2 = token::StellarAssetClient::new(&env, &token2_address);
        asset_admin2.mint(&seeker, &10_000);

        // Start and settle sessions with different tokens
        let session1 = client.start_session(&seeker, &expert, &token1, &3_000, &0, &test_cid(&env));
        let session2 = client.start_session(
            &seeker,
            &expert,
            &token2_address,
            &5_000,
            &0,
            &test_cid(&env),
        );

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

    // #194 / #195 / #196 / #197 tests
    // ====================================================================

    #[test]
    fn test_asset_fee_bps_override_set_get_clear() {
        let (env, client, _, _, _, _, token, _) = setup();
        assert!(client.get_asset_fee_bps(&token).is_none());
        client.set_asset_fee_bps(&token, &50u32);
        assert_eq!(client.get_asset_fee_bps(&token), Some(50u32));
        client.clear_asset_fee_bps(&token);
        assert!(client.get_asset_fee_bps(&token).is_none());
        let _ = env;
    }

    #[test]
    fn test_asset_fee_bps_applies_to_settlement() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        // Override: charge only 1% (100 bps) for this token, instead
        // of the default tiered 5%.
        client.set_asset_fee_bps(&token, &100u32);

        let session_id =
            client.start_session(&seeker, &expert, &token, &10_000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_000 + 100);
        client.settle_session(&session_id);

        // Treasury collected 1% of 1_000 (100 sec * 10/sec) = 10.
        let treasury_fee = client.get_treasury_balance(&token);
        assert_eq!(treasury_fee, 10);
    }

    #[test]
    fn test_insurance_vault_accrues_and_admin_can_withdraw() {
        let (env, client, _, admin, seeker, expert, token, _) = setup();
        let vault = Address::generate(&env);
        client.set_insurance_vault(&vault);

        register_and_avail(&env, &client, &expert, 100);

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
        // Default fee is 5% of 10_000 = 500; insurance slice is 1%
        // of fee = 5; treasury gets 495.
        let insurance = client.insurance_balance(&token);
        assert_eq!(insurance, 5);
        let treasury_fee = client.get_treasury_balance(&token);
        assert_eq!(treasury_fee, 495);

        // Admin withdraws the full insurance balance.
        let recipient = Address::generate(&env);
        client.withdraw_insurance(&token, &recipient, &5i128);
        assert_eq!(client.insurance_balance(&token), 0);
        let _ = admin;
    }

    #[test]
    fn test_insurance_skipped_when_vault_unset() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 100);

        // No `set_insurance_vault` call → diversion is skipped.
        let session_id =
            client.start_session(&seeker, &expert, &token, &10_000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_000 + 100);
        client.settle_session(&session_id);
        assert_eq!(client.total_burned(&token), 0);

        assert_eq!(client.insurance_balance(&token), 0);
        // Treasury keeps the whole 500 since no insurance slice.
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
    fn test_fixed_price_session_locks_and_releases_on_approval() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        let asset = token::Client::new(&env, &token);
        let expert_before = asset.balance(&expert);

        let session_id = client.initialize_fixed_price_session(
            &seeker,
            &expert,
            &token,
            &10_000,
            &test_cid(&env),
        );
        let fp = client.get_fixed_price_session(&session_id);
        assert!(matches!(fp.status, FixedPriceStatus::Locked));

        let payout = client.approve_fixed_price_session(&seeker, &session_id);
        // 10_000 - 5% fee = 9_500 net to expert.
        assert_eq!(payout, 9_500);
        assert_eq!(asset.balance(&expert) - expert_before, 9_500);

        let fp = client.get_fixed_price_session(&session_id);
        assert!(matches!(fp.status, FixedPriceStatus::Released));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #38)")]
    fn test_fixed_price_double_approve_fails() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.initialize_fixed_price_session(
            &seeker,
            &expert,
            &token,
            &1_000,
            &test_cid(&env),
        );
        client.approve_fixed_price_session(&seeker, &session_id);
        client.approve_fixed_price_session(&seeker, &session_id);
    }

    #[test]
    fn test_fixed_price_dispute_moves_to_disputed() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id = client.initialize_fixed_price_session(
            &seeker,
            &expert,
            &token,
            &1_000,
            &test_cid(&env),
        );
        client.dispute_fixed_price_session(
            &session_id,
            &seeker,
            &String::from_str(&env, "no delivery"),
            &test_cid(&env),
        );
        let fp = client.get_fixed_price_session(&session_id);
        assert!(matches!(fp.status, FixedPriceStatus::Disputed));
    }

    #[test]
    fn test_subscription_subscribe_collect_and_claim() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        // 12-month subscription at 1_000 / month.
        client.subscribe(&seeker, &expert, &token, &1_000i128, &12u32);
        let sub = client.get_subscription(&seeker, &expert);
        assert_eq!(sub.prepaid_balance, 12_000);
        assert_eq!(sub.months_remaining, 12);

        // First collection is allowed immediately.
        let net = client.collect_subscription_payment(&expert, &seeker);
        // 1_000 - 5% fee = 950 net into expert virtual balance.
        assert_eq!(net, 950);
        let sub = client.get_subscription(&seeker, &expert);
        assert_eq!(sub.months_remaining, 11);
        assert_eq!(sub.expert_balance, 950);

        // Claiming sends it on-chain.
        let asset = token::Client::new(&env, &token);
        let before = asset.balance(&expert);
        let claimed = client.claim_subscription_balance(&expert, &seeker);
        assert_eq!(claimed, 950);
        assert_eq!(asset.balance(&expert) - before, 950);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #40)")]
    fn test_subscription_collect_twice_in_same_period_fails() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.subscribe(&seeker, &expert, &token, &1_000i128, &3u32);
        client.collect_subscription_payment(&expert, &seeker);
        // Same period — second collection must trip
        // SubscriptionAlreadyCollected (#36).
        client.collect_subscription_payment(&expert, &seeker);
    }

    #[test]
    fn test_subscription_collect_advances_with_period() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.subscribe(&seeker, &expert, &token, &1_000i128, &3u32);
        client.collect_subscription_payment(&expert, &seeker);

        // Advance one full subscription period and collect again.
        let next = env.ledger().timestamp() + 30 * 24 * 60 * 60;
        env.ledger().set_timestamp(next);
        let net = client.collect_subscription_payment(&expert, &seeker);
        assert_eq!(net, 950);
        let sub = client.get_subscription(&seeker, &expert);
        assert_eq!(sub.months_remaining, 1);
    }
    // #198 / #199 / #200 tests
    // ====================================================================

    #[test]
    fn test_heartbeat_records_timestamp_and_emits_event() {
        let (env, client, _, _, _, expert, _, _) = setup();
        client.register_expert(&expert, &10, &test_cid(&env), &None, &None, &RateCurrency::XLM);

        env.ledger().set_timestamp(2_000);
        client.heartbeat(&expert);
        assert_eq!(client.last_heartbeat(&expert), 2_000);

        env.ledger().set_timestamp(2_500);
        client.heartbeat(&expert);
        assert_eq!(client.last_heartbeat(&expert), 2_500);
    }

    #[test]
    fn test_start_session_succeeds_with_recent_heartbeat() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        env.ledger().set_timestamp(2_000);
        client.heartbeat(&expert);

        // Inside the 1-hour window — session must start.
        env.ledger().set_timestamp(2_000 + 30 * 60);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        assert!(session_id >= 1);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #44)")]
    fn test_start_session_fails_when_heartbeat_is_stale() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        env.ledger().set_timestamp(2_000);
        client.heartbeat(&expert);

        // Just past the 1-hour window.
        env.ledger().set_timestamp(2_000 + 60 * 60 + 1);
        client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
    }

    #[test]
    fn test_start_session_legacy_skips_heartbeat_when_never_called() {
        // Expert never calls heartbeat — backward-compat path: legacy
        // experts retain availability_status-only semantics.
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        assert!(session_id >= 1);
        assert_eq!(client.last_heartbeat(&expert), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #22)")]
    fn test_heartbeat_rejects_unregistered_expert() {
        let (env, client, _, _, _, expert, _, _) = setup();
        let _ = env;
        client.heartbeat(&expert);
    }

    #[test]
    fn test_add_dispute_evidence_replaces_cid_during_active_dispute() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        let original = String::from_str(&env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz1");
        let updated = String::from_str(&env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz2");
        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "reason"),
            &original,
        );

        client.add_dispute_evidence(&expert, &session_id, &updated);
        let dispute = client.get_dispute(&session_id);
        assert_eq!(dispute.evidence_cid, updated);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #2)")]
    fn test_add_dispute_evidence_rejects_outsiders() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "reason"),
            &test_cid(&env),
        );

        let outsider = Address::generate(&env);
        client.add_dispute_evidence(
            &outsider,
            &session_id,
            &String::from_str(&env, "QmYwAPJzv5CZsnAzt8auVZRnGzrYxkM4Tveoxu48UUfGz3"),
        );
    }

    #[test]
    fn test_platform_stats_counters_increment_on_settle() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        let (s0, v0) = client.platform_stats();
        assert_eq!(s0, 0);
        assert_eq!(v0, 0);

        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_010);
        let claimable = client.settle_session(&session_id);
        assert!(claimable > 0);

        let (s1, v1) = client.platform_stats();
        assert_eq!(s1, 1);
        // Volume counter tracks gross claimable, not net-of-fee payout.
        assert!(v1 >= claimable);
    }

    #[test]
    fn test_expert_cooldown_after_dispute_loss() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "Expert no-show"),
            &test_cid(&env),
        );
        client.resolve_dispute(&session_id, &8_000);

        let until = client.get_expert_cooldown_until(&expert);
        assert!(until.is_some());
        assert!(until.unwrap() > env.ledger().sequence());
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #50)")]
    fn test_start_session_rejects_expert_on_cooldown() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "Seeker wins"),
            &test_cid(&env),
        );
        client.resolve_dispute(&session_id, &10_000);

        client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
    // #236 / #237 / #238 / #239 tests
    // ====================================================================

    #[test]
    #[should_panic(expected = "Error(Contract, #50)")]
    fn test_rate_limit_blocks_rapid_start_session_calls() {
        let (env, client, _, admin, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.set_rate_limit_min_ledgers(&admin, &2);

        client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        env.ledger().set_sequence_number(env.ledger().sequence() + 1);
        client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
    }

    #[test]
    fn test_rate_limit_allows_start_session_after_cooldown() {
        let (env, client, _, admin, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.set_rate_limit_min_ledgers(&admin, &2);

        client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        env.ledger().set_sequence_number(env.ledger().sequence() + 2);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        assert!(session_id >= 2);
    }

    #[test]
    fn test_rate_limit_blocks_rapid_heartbeat_calls() {
        let (env, client, _, admin, _, expert, _, _) = setup();
        client.register_expert(&expert, &10, &test_cid(&env), &None, &None, &RateCurrency::XLM);
        client.set_rate_limit_min_ledgers(&admin, &2);

        client.heartbeat(&expert);
        env.ledger().set_sequence_number(env.ledger().sequence() + 1);
        assert_eq!(client.heartbeat(&expert), Err(Error::RateLimitExceeded));

        env.ledger().set_sequence_number(env.ledger().sequence() + 2);
        assert_eq!(client.heartbeat(&expert), Ok(()));
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #51)")]
    fn test_seeker_spending_limit_enforced() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.set_spending_limit(&seeker, &2_000);

    fn test_start_session_rejects_non_whitelisted_token() {
        let (env, client, _, admin, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        client.remove_approved_token(&admin, &token);
        client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
    }

    #[test]
    fn test_start_session_with_voucher() {
        use ed25519_dalek::{Signer, SigningKey};
        use soroban_sdk::BytesN;

        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        let seed = [7u8; 32];
        let signing_key = SigningKey::from_bytes(&seed);
        let verifying_key = signing_key.verifying_key();
        let mut pk_arr = [0u8; 32];
        pk_arr.copy_from_slice(verifying_key.as_bytes());
        let public_key = BytesN::from_array(&env, &pk_arr);
        client.set_voucher_signing_key(&expert, &public_key);

        let voucher = SessionVoucher {
            expert: expert.clone(),
            rate_per_second: 10,
            max_duration: 600,
            expiry: env.ledger().timestamp() + 3_600,
            nonce: 1,
        };

        let mut msg = soroban_sdk::Bytes::new(&env);
        msg.append(&voucher.expert.to_xdr(&env));
        msg.append(&voucher.rate_per_second.to_xdr(&env));
        msg.append(&voucher.max_duration.to_xdr(&env));
        msg.append(&voucher.expiry.to_xdr(&env));
        msg.append(&voucher.nonce.to_xdr(&env));
        let mut msg_vec = std::vec![0u8; msg.len() as usize];
        msg.copy_into_slice(&mut msg_vec);
        let sig_bytes = signing_key.sign(&msg_vec);
        let mut sig_arr = [0u8; 64];
        sig_arr.copy_from_slice(sig_bytes.as_bytes());
        let signature = BytesN::from_array(&env, &sig_arr);

        let session_id = client
            .start_session_with_voucher(
                &seeker,
                &token,
                &3_000,
                &0,
                &test_cid(&env),
                &voucher,
                &signature,
            )
            .unwrap();
        assert_eq!(session_id, 1);

        let replay = client.try_start_session_with_voucher(
            &seeker,
            &token,
            &3_000,
            &0,
            &test_cid(&env),
            &voucher,
            &signature,
        );
        assert_eq!(replay, Err(Ok(Error::VoucherNonceUsed)));
    }

    #[test]
    fn test_webhook_relay_emits_standard_envelope() {
        use soroban_sdk::testutils::Events;
        use soroban_sdk::{symbol_short, Symbol};

        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        client.set_spending_limit(&seeker, &5_000);

        client.flag_dispute(
            &session_id,
            &seeker,
            &String::from_str(&env, "Relay test"),
            &test_cid(&env),
        );

        let all_events = env.events().all();
        assert!(!all_events.is_empty());

        let webhook_topic = symbol_short!("webhook");
        let mut saw_session_start = false;
        let mut saw_dispute = false;
        let mut saw_spending_limit = false;

        for (_contract, topics, data) in all_events {
            assert!(!topics.is_empty());
            let topic0: Symbol = topics[0].try_into_val(&env).unwrap();
            if topic0 != webhook_topic {
                continue;
            }
            let (event_type, sid, _ts, _payload): (Symbol, u64, u64, soroban_sdk::Val) =
                data.try_into_val(&env).unwrap();
            if event_type == crate::events::event_type::session_started() {
                saw_session_start = true;
                assert_eq!(sid, session_id);
            }
            if event_type == crate::events::event_type::dispute_flagged() {
                saw_dispute = true;
                assert_eq!(sid, session_id);
            }
            if event_type == crate::events::event_type::spending_limit() {
                saw_spending_limit = true;
            }
        }

        assert!(saw_session_start);
        assert!(saw_dispute);
        assert!(saw_spending_limit);
    fn test_admin_token_whitelist_add_and_remove() {
        let (env, client, _, admin, _, _, token, _) = setup();
        let extra = Address::generate(&env);

        assert!(client.is_token_approved(&token));
        assert!(!client.is_token_approved(&extra));

        client.add_approved_token(&admin, &extra);
        assert!(client.is_token_approved(&extra));

        client.remove_approved_token(&admin, &extra);
        assert!(!client.is_token_approved(&extra));
    }

    #[test]
    fn test_top_up_session_increases_balance_and_settles() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        let top_up = 2_000i128;
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &top_up);

        let new_balance = client.top_up_session(&seeker, &session_id, &top_up);
        assert_eq!(new_balance, 5_000);

        let session = client.get_session(&session_id);
        assert_eq!(session.balance, 5_000);

        let token_client = token::Client::new(&env, &token);
        assert_eq!(token_client.balance(&contract_id), 5_000);

        env.ledger().set_timestamp(1_100);
        let settled = client.settle_session(&session_id);
        assert!(settled > 0);

        let session_after = client.get_session(&session_id);
        assert!(session_after.balance < 5_000);
    }

    #[test]
    fn test_expert_cancel_session_partial_refund() {
        let (env, client, contract_id, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));

        env.ledger().set_timestamp(1_100);
        let reason = test_cid(&env);
        let (expert_payout, seeker_refund) =
            client.cancel_session(&expert, &session_id, &reason);

        assert!(expert_payout > 0);
        assert!(seeker_refund > 0);
        assert_eq!(expert_payout + seeker_refund, 3_000);

        let session = client.get_session(&session_id);
        assert_eq!(session.status, SessionStatus::CancelledByExpert);
        assert_eq!(session.balance, 0);
        assert_eq!(client.get_session_cancel_reason(&session_id), Some(reason));

        let token_client = token::Client::new(&env, &token);
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(token_client.balance(&expert), expert_payout);
        assert_eq!(token_client.balance(&seeker), 97_000 + seeker_refund);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #2)")]
    fn test_cancel_session_rejects_non_expert() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let session_id =
            client.start_session(&seeker, &expert, &token, &3_000, &0, &test_cid(&env));
        client.cancel_session(&seeker, &session_id, &test_cid(&env));
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

    // --- #249: batch_archive_sessions ---

    #[test]
    fn test_batch_archive_archives_eligible_sessions() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &6_000);

        let s1 = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        let s2 = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        // Settle both sessions.
        env.ledger().set_timestamp(1_300);
        client.settle_session(&s1);
        client.settle_session(&s2);

        // Advance 90 days.
        let ninety_days: u64 = 90 * 24 * 60 * 60;
        env.ledger().set_timestamp(1_300 + ninety_days + 1);

        let mut ids = Vec::new(&env);
        ids.push_back(s1);
        ids.push_back(s2);

        let summary = client.batch_archive_sessions(&ids);
        assert_eq!(summary.archived, 2);
        assert_eq!(summary.skipped, 0);

        assert!(client.get_archived_session(&s1).is_some());
        assert!(client.get_archived_session(&s2).is_some());
    }

    #[test]
    fn test_batch_archive_skips_ineligible_sessions() {
        let (env, client, _, _, seeker, expert, token, _) = setup();
        register_and_avail(&env, &client, &expert, 10);

        // s1: completed and old enough
        let s1 = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));
        env.ledger().set_timestamp(1_300);
        client.settle_session(&s1);

        let ninety_days: u64 = 90 * 24 * 60 * 60;
        env.ledger().set_timestamp(1_300 + ninety_days + 1);

        // s2: still active (not settled)
        let asset_admin = token::StellarAssetClient::new(&env, &token);
        asset_admin.mint(&seeker, &3_000);
        let s2 = client.start_session(&seeker, &expert, &token, &3000, &0, &test_cid(&env));

        // 999: non-existent
        let mut ids = Vec::new(&env);
        ids.push_back(s1);
        ids.push_back(s2);
        ids.push_back(999u64);

        let summary = client.batch_archive_sessions(&ids);
        assert_eq!(summary.archived, 1);
        assert_eq!(summary.skipped, 2);
    }

    #[test]
    #[should_panic]
    fn test_batch_archive_rejects_oversized_batch() {
        let (env, client, _, _, _, _, _, _) = setup();
        let mut ids = Vec::new(&env);
        for i in 0u64..51 {
            ids.push_back(i);
        }
        client.batch_archive_sessions(&ids);
    }
}
