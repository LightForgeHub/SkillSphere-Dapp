use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env};
use crate::Error;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdminAction {
    SetFee(u32),
    SetFeeTiers(i128, u32, u32),
    PauseProtocol,
    ResumeProtocol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingAction {
    pub action: AdminAction,
    pub proposed_at: u64,
}

pub fn compute_action_hash(env: &Env, action: &AdminAction) -> BytesN<32> {
    use soroban_sdk::xdr::ToXdr;
    env.crypto().sha256(&action.clone().to_xdr(env)).into()
}

pub fn propose_admin_action(
    env: &Env,
    caller: Address,
    action: AdminAction,
) -> Result<BytesN<32>, Error> {
    caller.require_auth();
    crate::roles::require_role(env, &caller, crate::roles::Role::SuperAdmin)?;

    let hash = compute_action_hash(env, &action);
    let proposed_at = env.ledger().timestamp();
    let pending = PendingAction {
        action,
        proposed_at,
    };

    let key = (symbol_short!("pend_act"), hash.clone());
    env.storage().persistent().set(&key, &pending);
    Ok(hash)
}

pub fn execute_admin_action(
    env: &Env,
    caller: Address,
    action_hash: BytesN<32>,
) -> Result<(), Error> {
    caller.require_auth();
    crate::roles::require_role(env, &caller, crate::roles::Role::SuperAdmin)?;

    let key = (symbol_short!("pend_act"), action_hash.clone());
    let pending: PendingAction = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::Unauthorized)?;

    let now = env.ledger().timestamp();
    if now < pending.proposed_at + 172800 {
        return Err(Error::TimelockNotExpired);
    }

    match pending.action {
        AdminAction::SetFee(fee_bps) => {
            crate::SkillSphereContract::set_fee_internal(env, fee_bps)?;
        }
        AdminAction::SetFeeTiers(limit, bps1, bps2) => {
            crate::SkillSphereContract::set_fee_tiers_internal(env, limit, bps1, bps2)?;
        }
        AdminAction::PauseProtocol => {
            crate::SkillSphereContract::pause_protocol_internal(env)?;
        }
        AdminAction::ResumeProtocol => {
            crate::SkillSphereContract::resume_protocol_internal(env)?;
        }
    }

    env.storage().persistent().remove(&key);
    Ok(())
}
