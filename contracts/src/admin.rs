//! Admin helpers – thin re-exports so other modules can import from a single place.

pub use crate::DataKey;
pub use crate::Error;

use soroban_sdk::{Address, Env};

/// Returns the stored admin address, or `Error::Unauthorized` if not set.
pub fn get_admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::Unauthorized)
}

/// Requires the stored admin to have signed the current transaction.
pub fn require_admin(env: &Env) -> Result<Address, Error> {
    let admin = get_admin(env)?;
    admin.require_auth();
    Ok(admin)
}
