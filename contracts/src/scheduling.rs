//! Session expiry deadline and auto-close — Task 4.
//!
//! Reserved (pending) sessions that are never activated can leave seeker funds
//! locked indefinitely. Every reserved session is assigned an `expires_at`
//! hard-deadline set to `scheduled_start + max(2 hours, duration_cap)`.
//! After this deadline anyone may call `expire_session(session_id)` to trigger
//! a full refund to the seeker, regardless of whether the expert showed up.
//!
//! ## Session struct field
//! - `expires_at: Option<u64>` — unix timestamp (seconds) after which expiry
//!   is permissible. `None` for Active sessions that have no hard deadline.
//!
//! ## Public function added to `SkillSphereContract` (in `lib.rs`)
//! - `expire_session(env, session_id)` — callable by anyone; validates expiry
//!   condition and issues a full seeker refund.

use soroban_sdk::{token, Env};

use crate::{DataKey, Error, Session, SessionStatus};

/// Validates the expiry condition and executes a full seeker refund.
///
/// Rules enforced:
/// 1. `session.expires_at` must be `Some(t)` with `t <= ledger_timestamp`.
/// 2. Session must NOT be `Active` — only unstarted / still-`Reserved` sessions
///    (or `Paused` sessions past their deadline) qualify for hard expiry.
/// 3. Session must not already be `Completed`, `Resolved`, or `CancelledByExpert`.
///
/// Returns the refund amount transferred to the seeker on success.
pub fn do_expire_session(env: &Env, session: Session) -> Result<i128, Error> {
    let now = env.ledger().timestamp();

    // Validate hard expiry deadline exists and has passed.
    let expires_at = session.expires_at.ok_or(Error::InvalidSessionState)?;
    if now < expires_at {
        return Err(Error::SessionNotExpired);
    }

    // Active sessions cannot be force-expired; use end_session instead.
    if session.status == SessionStatus::Active {
        return Err(Error::InvalidSessionState);
    }

    // Terminal states — nothing to refund.
    if matches!(
        session.status,
        SessionStatus::Completed | SessionStatus::Resolved | SessionStatus::CancelledByExpert
    ) {
        return Err(Error::InvalidSessionState);
    }

    let refund_amount = session.balance;
    let session_id = session.id;
    let seeker = session.seeker.clone();
    let token_addr = session.token.clone();

    // Mark session as completed and zero the balance.
    let mut closed = session.clone();
    closed.balance = 0;
    closed.status = SessionStatus::Completed;
    env.storage()
        .persistent()
        .set(&DataKey::Session(session_id), &closed);

    // Transfer full balance back to seeker.
    if refund_amount > 0 {
        let token_client = token::Client::new(env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &seeker, &refund_amount);
    }

    Ok(refund_amount)
}
