use soroban_sdk::{symbol_short, Env};
use crate::Error;

pub struct ReentrancyGuard;

impl ReentrancyGuard {
    pub fn non_reentrant(env: &Env) -> Result<(), Error> {
        let key = symbol_short!("reentr");
        let is_entered: bool = env.storage().temporary().get(&key).unwrap_or(false);
        if is_entered {
            return Err(Error::ReentrantCall);
        }
        env.storage().temporary().set(&key, &true);
        Ok(())
    }

    pub fn clear(env: &Env) {
        let key = symbol_short!("reentr");
        env.storage().temporary().set(&key, &false);
    }
}
