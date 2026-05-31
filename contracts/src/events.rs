//! Standardized webhook event schema — Issue #243.
//!
//! Every contract event is published as a four-field envelope:
//! `{ event_type, session_id, timestamp, payload }` under the `webhook`
//! topic so off-chain relay daemons can parse a single shape.

use soroban_sdk::{symbol_short, Env, IntoVal, Symbol, Val};

/// Publish a webhook envelope consumed by off-chain relay services.
pub fn publish_event<P>(
    env: &Env,
    event_type: Symbol,
    session_id: u64,
    payload: P,
) where
    P: IntoVal<Env, Val>,
{
    env.events().publish(
        (symbol_short!("webhook"),),
        (
            event_type,
            session_id,
            env.ledger().timestamp(),
            payload.into_val(env),
        ),
    );
}

/// Session lifecycle events.
pub mod event_type {
    use soroban_sdk::symbol_short;

    use super::Symbol;

    pub fn session_started() -> Symbol {
        symbol_short!("sessStart")
    }
    pub fn session_paused() -> Symbol {
        symbol_short!("sessPause")
    }
    pub fn session_resumed() -> Symbol {
        symbol_short!("sessResum")
    }
    pub fn session_settled() -> Symbol {
        symbol_short!("sessSettl")
    }
    pub fn session_finished() -> Symbol {
        symbol_short!("sessFinsh")
    }
    pub fn session_refund() -> Symbol {
        symbol_short!("sessRefnd")
    }
    pub fn session_commit() -> Symbol {
        symbol_short!("sessComit")
    }
    pub fn session_reveal() -> Symbol {
        symbol_short!("sessRevl")
    }
    pub fn session_voucher() -> Symbol {
        symbol_short!("sessVouch")
    }

    pub fn session_reserved() -> Symbol {
        symbol_short!("sessResrv")
    }

    pub fn session_reserved_activated() -> Symbol {
        symbol_short!("sessRact")
    }

    pub fn session_cancelled() -> Symbol {
        symbol_short!("sessCncl")
    }

    pub fn referral_commission_paid() -> Symbol {
        symbol_short!("refComm")
    }

    pub fn revenue_shared() -> Symbol {
        symbol_short!("revShare")
    }

    pub fn dispute_flagged() -> Symbol {
        symbol_short!("dispFlag")
    }
    pub fn dispute_evidence() -> Symbol {
        symbol_short!("dispEvid")
    }
    pub fn dispute_resolved() -> Symbol {
        symbol_short!("dispResl")
    }

    pub fn expert_cooldown() -> Symbol {
        symbol_short!("expCooldn")
    }
    pub fn spending_limit() -> Symbol {
        symbol_short!("spndLim")
    }

    pub fn admin_config() -> Symbol {
        symbol_short!("adminCfg")
    }
    pub fn platform_stats() -> Symbol {
        symbol_short!("platStat")
    }
    pub fn fee_burn() -> Symbol {
        symbol_short!("feeBurn")
    }
    pub fn staking() -> Symbol {
        symbol_short!("staking")
    }
    pub fn subscription() -> Symbol {
        symbol_short!("subscrip")
    }
    pub fn fixed_price() -> Symbol {
        symbol_short!("fixPrice")
    }
    pub fn expert_profile() -> Symbol {
        symbol_short!("expert")
    }
    pub fn rating() -> Symbol {
        symbol_short!("rating")
    }
    pub fn swap() -> Symbol {
        symbol_short!("swap")
    }
    pub fn governance() -> Symbol {
        symbol_short!("gov")
    }
    pub fn insurance() -> Symbol {
        symbol_short!("insuranc")
    }
    pub fn upgrade() -> Symbol {
        symbol_short!("upgrade")
    }
    pub fn integration() -> Symbol {
        symbol_short!("integr")
    }
    pub fn heartbeat() -> Symbol {
        symbol_short!("heartbt")
    }
    pub fn slashing() -> Symbol {
        symbol_short!("slash")
    }
    pub fn reverify() -> Symbol {
        symbol_short!("reverify")
    }
    pub fn frozen() -> Symbol {
        symbol_short!("frozen")
    }
    pub fn badge() -> Symbol {
        symbol_short!("badge")
    }
}
