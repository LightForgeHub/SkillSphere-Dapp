use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum Error {
    InsufficientFunds = 1,
    Unauthorized = 2,
    SessionNotActive = 3,
    SessionNotFound = 4,
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
    ReentrantCall = 25,
    DepositTooLow = 26,
    AlreadyInitialized = 27,
    InvalidRating = 28,
    RatingSubmitted = 29,
    OracleNotTrusted = 30,
    InvalidOracleSig = 31,
    OraclePriceUnavailable = 32,
    InvalidSessionState = 33,
    InsufficientBalance = 34,

    // #213 / #214
    StakeNotFound = 35,
    NoRewardsToClaim = 36,

    // #194 / #195 / #196 / #197
    ContractUnset = 42,

    // #198 / #199 / #200
    ExpertOffline = 44,
    DisputeResolved = 45,

    // #202 – Soulbound Skill Badges
    BadgeAlreadyMinted = 46,
    HoursThresholdNotMet = 47,
    SessionFrozen = 48,
    SwapFailed = 49,

    // #240 / #241 / #242
    ExpertOnCooldown = 50,
    SpendingLimitExceeded = 51,
    InvalidVoucher = 56,

    // #257
    TimelockActive = 57,

    // #250 - Dispute cooling-off period
    DisputeCoolingOff = 58,

    // #251 - Dispute escalation to DAO
    DisputeEscalated = 59,

    // #252 - Expert handoff
    HandoffProposalNotFound = 60,
    HandoffExpired = 61,
    InvalidHandoffTarget = 62,

    // #253 - NFT minting
    NftContractNotSet = 63,

    // #276 - Slippage protection
    SlippageExceeded = 64,

    // #277 - Reputation decay / #278 - Session quality score (shared)
    InvalidDimensionRating = 65,

    YieldPoolNotSet = 66,
    InsufficientAntiSpamDeposit = 67,
    CircuitBreakerActive = 68,
    SessionNotExpired = 69,
}
