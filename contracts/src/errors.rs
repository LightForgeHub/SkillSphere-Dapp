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
    InsuffTreasuryBal = 20,
    AmountBelowMinimum = 21,
    ExpertNotRegistered = 22,
    ExpertUnavailable = 23,
    InvalidReferrer = 24,
    Reentrancy = 25,
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
}
