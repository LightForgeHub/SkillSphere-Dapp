use soroban_sdk::{contracttype, symbol_short, Address, Env};
use crate::Error;

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Role {
    SuperAdmin = 0,
    FeeManager = 1,
    DisputeAdmin = 2,
}

pub fn has_role(env: &Env, user: &Address, role: Role) -> bool {
    let key = (symbol_short!("role"), user.clone());
    if let Some(user_role) = env.storage().persistent().get::<_, Role>(&key) {
        // SuperAdmin possesses all permissions/roles
        if user_role == Role::SuperAdmin {
            return true;
        }
        return user_role == role;
    }
    false
}

pub fn require_role(env: &Env, user: &Address, role: Role) -> Result<(), Error> {
    if has_role(env, user, role) {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}

pub fn grant_role(env: &Env, caller: &Address, user: &Address, role: Role) -> Result<(), Error> {
    caller.require_auth();
    // Only SuperAdmin can manage roles
    require_role(env, caller, Role::SuperAdmin)?;
    let key = (symbol_short!("role"), user.clone());
    env.storage().persistent().set(&key, &role);
    Ok(())
}

pub fn revoke_role(env: &Env, caller: &Address, user: &Address) -> Result<(), Error> {
    caller.require_auth();
    // Only SuperAdmin can manage roles
    require_role(env, caller, Role::SuperAdmin)?;
    let key = (symbol_short!("role"), user.clone());
    env.storage().persistent().remove(&key);
    Ok(())
}
