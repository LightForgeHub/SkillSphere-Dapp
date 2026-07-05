//! Expert cooldown after dispute loss — Issue #240.
//! Expert-initiated session cancellation with partial refund (#238).

use soroban_sdk::{contracttype, symbol_short, token, Address, Env, String, Vec};
use crate::DataKeyExt;

#[contracttype]
#[derive(Clone)]
pub enum DisputeKey {
    AppealBondAmount,
}

use crate::{
    events, DataKey, Error, SessionStatus, SkillSphereContract, MIN_SESSION_ESCROW,
};

/// Stellar closes a ledger roughly every 5 seconds; seven days ≈ 120_960 ledgers.
pub const DEFAULT_EXPERT_COOLDOWN_LEDGERS: u32 = 7 * 24 * 60 * 12;

/// Returns the configured cooldown length in ledgers (admin-set, default 7 days).
pub fn cooldown_ledgers(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&symbol_short!("exp_cd_l"))
        .unwrap_or(DEFAULT_EXPERT_COOLDOWN_LEDGERS)
}

/// Admin-only setter invoked from `lib.rs`.
pub fn set_cooldown_ledgers(env: &Env, ledgers: u32) {
    env.storage()
        .instance()
        .set(&symbol_short!("exp_cd_l"), &ledgers);
}

/// True when the expert still has an active post-loss cooldown.
pub fn is_expert_on_cooldown(env: &Env, expert: &Address) -> bool {
    let key = (symbol_short!("exp_cd_u"), expert.clone());
    if let Some(until_ledger) = env
        .storage()
        .temporary()
        .get::<_, u32>(&key)
    {
        return env.ledger().sequence() < until_ledger;
    }
    false
}

/// Returns the ledger sequence after which the expert may accept sessions again.
pub fn expert_cooldown_until(env: &Env, expert: &Address) -> Option<u32> {
    let key = (symbol_short!("exp_cd_u"), expert.clone());
    env.storage()
        .temporary()
        .get(&key)
}

/// Apply cooldown when the seeker receives a strictly larger award than the expert.
pub fn apply_cooldown_if_expert_lost(
    env: &Env,
    expert: &Address,
    seeker_award_bps: u32,
    expert_award_bps: u32,
) {
    if seeker_award_bps <= expert_award_bps {
        return;
    }

    let ledgers = cooldown_ledgers(env);
    let until = env.ledger().sequence().saturating_add(ledgers);
    let key = (symbol_short!("exp_cd_u"), expert.clone());
    env.storage()
        .temporary()
        .set(&key, &until);
}

/// Cancels an active or paused session on behalf of the expert.
///
/// Accrued (claimable) earnings are paid to the expert; the remaining
/// escrow balance is refunded to the seeker.  The cancellation reason
/// CID is stored for transparency and the session status becomes
/// `CancelledByExpert`.
pub fn cancel_session_by_expert(
    env: &Env,
    expert: Address,
    session_id: u64,
    reason_cid: String,
) -> Result<(i128, i128), Error> {
    crate::security::ReentrancyGuard::non_reentrant(env)?;

    expert.require_auth();

    if !SkillSphereContract::is_valid_ipfs_cid(&reason_cid) {
        crate::security::ReentrancyGuard::clear(env);
        return Err(Error::InvalidCid);
    }

    let mut session = SkillSphereContract::get_session_or_error(env, session_id)?;

    if expert != session.expert {
        crate::security::ReentrancyGuard::clear(env);
        return Err(Error::Unauthorized);
    }

    if !matches!(
        session.status,
        SessionStatus::Active | SessionStatus::Paused
    ) {
        crate::security::ReentrancyGuard::clear(env);
        return Err(Error::InvalidSessionState);
    }

    let now = env.ledger().timestamp();
    let effective_time = SkillSphereContract::bounded_time(&session, now);
    let claimable = SkillSphereContract::claimable_amount_for_session(&session, effective_time);
    let remaining = session.balance.saturating_sub(claimable);

    session.balance = 0;
    session.accrued_amount = 0;
    session.last_settlement_timestamp = effective_time as u32;
    session.status = SessionStatus::CancelledByExpert;
    SkillSphereContract::save_session(env, &session);

    let key = (symbol_short!("canc_rsn"), session_id);
    env.storage()
        .persistent()
        .set(&key, &reason_cid);

    let token_client = token::Client::new(env, &session.token);

    let mut expert_payout = claimable;
    let mut seeker_refund = remaining;
    if expert_payout < MIN_SESSION_ESCROW {
        expert_payout = 0;
    }
    if seeker_refund < MIN_SESSION_ESCROW {
        seeker_refund = 0;
    }

    if expert_payout > 0 {
        token_client.transfer(
            &env.current_contract_address(),
            &session.expert,
            &expert_payout,
        );
    }
    if seeker_refund > 0 {
        token_client.transfer(
            &env.current_contract_address(),
            &session.seeker,
            &seeker_refund,
        );
    }

    events::publish_event(
        env,
        events::event_type::session_cancelled(),
        session_id,
        (expert, expert_payout, seeker_refund, reason_cid),
    );

    crate::security::ReentrancyGuard::clear(env);
    Ok((expert_payout, seeker_refund))
}

// ---------------------------------------------------------------------------
// Issue #284 — Jury Selection
// ---------------------------------------------------------------------------

/// Minimum reputation an expert must have to serve as a juror.
pub const MIN_JURY_CANDIDATE_REPUTATION: u32 = 300;
/// Default jury size when no custom size has been configured by admin.
pub const DEFAULT_JURY_SIZE: u32 = 3;

/// On-chain record tracking the jury panel and votes for a disputed session.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct JuryVoteRecord {
    pub jurors: Vec<Address>,
    pub votes_for_seeker: u32,
    pub votes_for_expert: u32,
    pub voted: Vec<Address>,
    pub finalized: bool,
}

/// Select a jury panel from the provided `candidates` list for `dispute_id`.
///
/// Candidates are filtered by minimum reputation, then `jury_size` jurors
/// are chosen via on-chain PRNG.  Pass `jury_size = 0` to use the
/// admin-configured default (see `DataKeyExt::JurySize`).
pub fn select_jury(
    env: &Env,
    dispute_id: u64,
    candidates: Vec<Address>,
    jury_size: u32,
) -> Result<(), Error> {
    if env.storage().persistent().has(&DataKeyExt::JurySession(dispute_id)) {
        return Err(Error::JuryAlreadyVoted);
    }

    let size = if jury_size == 0 {
        env.storage()
            .instance()
            .get(&DataKeyExt::JurySize)
            .unwrap_or(DEFAULT_JURY_SIZE)
    } else {
        jury_size
    };

    // Filter candidates by minimum reputation threshold.
    let mut eligible: Vec<Address> = Vec::new(env);
    let cand_len = candidates.len();
    for i in 0..cand_len {
        let candidate = candidates.get(i).unwrap();
        let profile = SkillSphereContract::expert_profile(env, candidate.clone());
        if profile.reputation >= MIN_JURY_CANDIDATE_REPUTATION {
            eligible.push_back(candidate);
        }
    }

    if eligible.len() < size {
        return Err(Error::InsufficientCandidates);
    }

    // Shuffle eligible candidates in-place using on-chain PRNG, then take the first `size`.
    env.prng().shuffle(&mut eligible);
    let mut jurors: Vec<Address> = Vec::new(env);
    for i in 0..size {
        jurors.push_back(eligible.get(i).unwrap());
    }

    let record = JuryVoteRecord {
        jurors: jurors.clone(),
        votes_for_seeker: 0,
        votes_for_expert: 0,
        voted: Vec::new(env),
        finalized: false,
    };

    env.storage()
        .persistent()
        .set(&DataKeyExt::JurySession(dispute_id), &record);

    events::publish_event(
        env,
        events::event_type::jury_selected(),
        dispute_id,
        (dispute_id, jurors),
    );

    Ok(())
}

/// Record a juror's vote for the given `dispute_id`.
///
/// Each juror may only vote once.  Voting closes once `finalize_jury_verdict`
/// is called or a majority is reached.
pub fn cast_jury_vote(
    env: &Env,
    juror: Address,
    dispute_id: u64,
    vote_for_seeker: bool,
) -> Result<(), Error> {
    juror.require_auth();

    let mut record: JuryVoteRecord = env
        .storage()
        .persistent()
        .get(&DataKeyExt::JurySession(dispute_id))
        .ok_or(Error::JuryNotSelected)?;

    if record.finalized {
        return Err(Error::JuryVotingClosed);
    }

    // Verify juror is on the panel.
    let juror_len = record.jurors.len();
    let mut is_juror = false;
    for i in 0..juror_len {
        if record.jurors.get(i).unwrap() == juror {
            is_juror = true;
            break;
        }
    }
    if !is_juror {
        return Err(Error::Unauthorized);
    }

    // Reject duplicate votes.
    let voted_len = record.voted.len();
    for i in 0..voted_len {
        if record.voted.get(i).unwrap() == juror {
            return Err(Error::JuryAlreadyVoted);
        }
    }

    if vote_for_seeker {
        record.votes_for_seeker = record.votes_for_seeker.saturating_add(1);
    } else {
        record.votes_for_expert = record.votes_for_expert.saturating_add(1);
    }
    record.voted.push_back(juror.clone());

    env.storage()
        .persistent()
        .set(&DataKeyExt::JurySession(dispute_id), &record);

    events::publish_event(
        env,
        events::event_type::jury_vote_cast(),
        dispute_id,
        (dispute_id, juror, vote_for_seeker),
    );

    Ok(())
}

/// Finalize the jury verdict for `dispute_id`.
///
/// Requires either all jurors have voted, or a majority has been reached.
/// Returns `(seeker_award_bps, expert_award_bps)`.  A winning side receives
/// 9000 bps; ties produce a 5000/5000 split.
pub fn finalize_jury_verdict(env: &Env, dispute_id: u64) -> Result<(u32, u32), Error> {
    let mut record: JuryVoteRecord = env
        .storage()
        .persistent()
        .get(&DataKeyExt::JurySession(dispute_id))
        .ok_or(Error::JuryNotSelected)?;

    if record.finalized {
        return Err(Error::JuryVotingClosed);
    }

    let jury_size = record.jurors.len();
    let majority = jury_size / 2 + 1;
    let all_voted = record.voted.len() >= jury_size;
    let seeker_majority = record.votes_for_seeker >= majority;
    let expert_majority = record.votes_for_expert >= majority;

    if !all_voted && !seeker_majority && !expert_majority {
        return Err(Error::JuryVotingClosed);
    }

    let (seeker_bps, expert_bps) = if record.votes_for_seeker == record.votes_for_expert {
        (5_000u32, 5_000u32)
    } else if record.votes_for_seeker > record.votes_for_expert {
        (9_000u32, 1_000u32)
    } else {
        (1_000u32, 9_000u32)
    };

    record.finalized = true;
    env.storage()
        .persistent()
        .set(&DataKeyExt::JurySession(dispute_id), &record);

    events::publish_event(
        env,
        events::event_type::jury_verdict(),
        dispute_id,
        (dispute_id, seeker_bps, expert_bps),
    );

    Ok((seeker_bps, expert_bps))
}

// ---------------------------------------------------------------------------
// Issue #285 — Appeal Mechanism
// ---------------------------------------------------------------------------

/// Default appeal bond amount: 0 (no bond required until configured).
pub const DEFAULT_APPEAL_BOND_AMOUNT: i128 = 0;

/// On-chain record for an appeal filed against a dispute ruling.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AppealRecord {
    pub dispute_id: u64,
    pub appellant: Address,
    pub bond_amount: i128,
    pub bond_token: Address,
    pub filed_at: u64,
    pub resolved: bool,
    pub ruling_bps_seeker: u32,
    pub ruling_bps_expert: u32,
}

/// Returns the currently-configured appeal bond amount.
pub fn appeal_bond_amount(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DisputeKey::AppealBondAmount)
        .unwrap_or(DEFAULT_APPEAL_BOND_AMOUNT)
}

/// Admin-only setter for the appeal bond amount.
pub fn set_appeal_bond_amount(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&DisputeKey::AppealBondAmount, &amount);
}

/// File an appeal against the ruling for `dispute_id`.
///
/// Can only be called while the dispute is still open (not yet resolved by
/// admin).  If a bond is configured, it is collected from `appellant` and
/// held in the contract until `resolve_appeal` is called.
pub fn appeal_dispute(
    env: &Env,
    appellant: Address,
    dispute_id: u64,
    bond_token: Address,
) -> Result<(), Error> {
    appellant.require_auth();

    if env
        .storage()
        .persistent()
        .has(&DataKeyExt::Appeal(dispute_id))
    {
        return Err(Error::AppealAlreadyFiled);
    }

    let bond = appeal_bond_amount(env);
    if bond > 0 {
        let token_client = token::Client::new(env, &bond_token);
        if token_client.balance(&appellant) < bond {
            return Err(Error::AppealBondRequired);
        }
        token_client.transfer(&appellant, &env.current_contract_address(), &bond);
    }

    let record = AppealRecord {
        dispute_id,
        appellant: appellant.clone(),
        bond_amount: bond,
        bond_token,
        filed_at: env.ledger().timestamp(),
        resolved: false,
        ruling_bps_seeker: 0,
        ruling_bps_expert: 0,
    };

    env.storage()
        .persistent()
        .set(&DataKeyExt::Appeal(dispute_id), &record);

    events::publish_event(
        env,
        events::event_type::appeal_filed(),
        dispute_id,
        (dispute_id, appellant, bond),
    );

    Ok(())
}

/// Resolve an appeal with a new ruling (admin-only, called from lib.rs).
///
/// Calls `resolve_dispute_internal` to apply the new split on the underlying
/// session.  The appeal bond is returned to the appellant upon resolution.
pub fn resolve_appeal(
    env: &Env,
    dispute_id: u64,
    seeker_award_bps: u32,
    expert_award_bps: u32,
) -> Result<(), Error> {
    if seeker_award_bps.saturating_add(expert_award_bps) != 10_000 {
        return Err(Error::InvalidSplitBps);
    }

    let mut record: AppealRecord = env
        .storage()
        .persistent()
        .get(&DataKeyExt::Appeal(dispute_id))
        .ok_or(Error::AppealNotFound)?;

    if record.resolved {
        return Err(Error::DisputeResolved);
    }

    record.resolved = true;
    record.ruling_bps_seeker = seeker_award_bps;
    record.ruling_bps_expert = expert_award_bps;
    env.storage()
        .persistent()
        .set(&DataKeyExt::Appeal(dispute_id), &record);

    // Apply the new ruling to the underlying dispute.
    SkillSphereContract::resolve_dispute_internal(env, dispute_id, seeker_award_bps)?;

    // Return bond to appellant now that the appeal has been resolved.
    if record.bond_amount > 0 {
        let token_client = token::Client::new(env, &record.bond_token);
        token_client.transfer(
            &env.current_contract_address(),
            &record.appellant,
            &record.bond_amount,
        );
    }

    events::publish_event(
        env,
        events::event_type::appeal_resolved(),
        dispute_id,
        (dispute_id, seeker_award_bps, expert_award_bps),
    );

    Ok(())
}
