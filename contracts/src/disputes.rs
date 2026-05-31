//! Expert cooldown after dispute loss — Issue #240.
//! Expert-initiated session cancellation with partial refund (#238).

use soroban_sdk::{symbol_short, token, Address, Env, String};

use crate::{
    events, Error, SessionStatus, SkillSphereContract, MIN_SESSION_ESCROW,
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
    SkillSphereContract::assert_not_locked(env)?;
    SkillSphereContract::set_reentrancy_lock(env, true);

    expert.require_auth();

    if !SkillSphereContract::is_valid_ipfs_cid(&reason_cid) {
        SkillSphereContract::set_reentrancy_lock(env, false);
        return Err(Error::InvalidCid);
    }

    let mut session = SkillSphereContract::get_session_or_error(env, session_id)?;

    if expert != session.expert {
        SkillSphereContract::set_reentrancy_lock(env, false);
        return Err(Error::Unauthorized);
    }

    if !matches!(
        session.status,
        SessionStatus::Active | SessionStatus::Paused
    ) {
        SkillSphereContract::set_reentrancy_lock(env, false);
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

    SkillSphereContract::set_reentrancy_lock(env, false);
    Ok((expert_payout, seeker_refund))
}
