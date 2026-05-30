//! Centralised event publishing helpers for session lifecycle events.

use soroban_sdk::{symbol_short, Env};

/// Emitted when a seeker tops up an active session escrow (#237).
pub fn publish_top_up(env: &Env, session_id: u64, amount: i128, new_balance: i128) {
    env.events().publish(
        (symbol_short!("session"), symbol_short!("topup")),
        (session_id, amount, new_balance),
    );
}

/// Emitted when an expert cancels their session (#238).
pub fn publish_expert_cancel(
    env: &Env,
    session_id: u64,
    expert: soroban_sdk::Address,
    expert_payout: i128,
    seeker_refund: i128,
    reason_cid: soroban_sdk::String,
) {
    env.events().publish(
        (symbol_short!("session"), symbol_short!("expcncl")),
        (
            session_id,
            expert,
            expert_payout,
            seeker_refund,
            reason_cid,
        ),
    );
}
