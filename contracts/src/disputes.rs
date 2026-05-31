//! Expert-initiated session cancellation with partial refund (#238).

use soroban_sdk::{token, Address, Env, String};

use crate::{
    events, DataKey, Error, SessionStatus, SkillSphereContract, MIN_SESSION_ESCROW,
};

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

    env.storage()
        .persistent()
        .set(&DataKey::SessionCancelReason(session_id), &reason_cid);

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

    events::publish_expert_cancel(
        env,
        session_id,
        expert,
        expert_payout,
        seeker_refund,
        reason_cid,
    );

    SkillSphereContract::set_reentrancy_lock(env, false);
    Ok((expert_payout, seeker_refund))
}
