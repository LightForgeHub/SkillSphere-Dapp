
import sys

file_path = 'contracts/src/lib.rs'

with open(file_path, 'r') as f:
    lines = f.readlines()

# 1. Add IntoVal import
for i, line in enumerate(lines):
    if 'use soroban_sdk::{token, Address, Env, String, Vec};' in line:
        lines[i] = line.replace('use soroban_sdk::{token, Address, Env, String, Vec};', 'use soroban_sdk::{token, Address, Env, IntoVal, String, Vec};')
        break

# 2. Add reentrancy guard to withdraw_accrued
new_withdraw_accrued = """    pub fn withdraw_accrued(env: Env, session_id: u64) -> Result<i128, Error> {
        // === REENTRANCY GUARD ===
        if Self::reentrancy_locked(&env) {
            return Err(Error::ReentrancyDetected);
        }
        Self::set_reentrancy_lock(&env, true);

        // === CHECKS ===
        let mut session = Self::get_session_or_error(&env, session_id)?;
        
        // Verify caller is the expert
        if let Err(_) = session.expert.require_auth() {
             Self::set_reentrancy_lock(&env, false);
             session.expert.require_auth(); // This will panic as expected
        }

        // Verify session is active
        if session.status != SessionStatus::Active {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidSessionState);
        }

        // Calculate currently claimable amount based on time elapsed
        let now = env.ledger().timestamp();
        let time_elapsed = now.saturating_sub(session.last_settlement_timestamp as u64);
        let newly_accrued = session.rate_per_second.saturating_mul(time_elapsed as i128);

        // Total claimable is accrued + newly accrued
        let total_claimable = session.accrued_amount.saturating_add(newly_accrued);

        if total_claimable <= 0 {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidAmount);
        }

        // Verify session has sufficient balance
        if session.balance < total_claimable {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InsufficientBalance);
        }

        // === EFFECTS ===
        session.balance = session.balance.saturating_sub(total_claimable);
        session.last_settlement_timestamp = now as u32;
        session.accrued_amount = 0;
        Self::save_session(&env, &session);

        // === INTERACTIONS ===
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &session.expert, &total_claimable);

        env.events().publish(
            (symbol_short!("withdraw"), symbol_short!("accrued")),
            (session_id, total_claimable, now),
        );

        Self::set_reentrancy_lock(&env, false);
        Ok(total_claimable)
    }
"""

# 3. Add reentrancy guard to claim_no_show_refund
new_claim_no_show_refund = """    pub fn claim_no_show_refund(env: Env, seeker: Address, session_id: u64) -> Result<i128, Error> {
        // === REENTRANCY GUARD ===
        if Self::reentrancy_locked(&env) {
            return Err(Error::ReentrancyDetected);
        }
        Self::set_reentrancy_lock(&env, true);

        // === CHECKS ===
        seeker.require_auth();
        let mut session = Self::get_session_or_error(&env, session_id)?;

        if seeker != session.seeker {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::Unauthorized);
        }

        if session.status != SessionStatus::Active {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidSessionState);
        }

        let now = env.ledger().timestamp();
        if now <= session.start_timestamp as u64 + SESSION_NO_SHOW_REFUND_WINDOW {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::NotStarted);
        }

        if session.accrued_amount > 0 || session.last_settlement_timestamp != session.start_timestamp {
            Self::set_reentrancy_lock(&env, false);
            return Err(Error::InvalidSessionState);
        }

        let refund_amount = session.balance;

        // === EFFECTS ===
        session.balance = 0;
        session.status = SessionStatus::Completed;
        session.last_settlement_timestamp = now as u32;
        Self::save_session(&env, &session);

        // === INTERACTIONS ===
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&env.current_contract_address(), &session.seeker, &refund_amount);

        env.events().publish(
            (symbol_short!("session"), symbol_short!("refund")),
            (session_id, refund_amount, now),
        );

        Self::set_reentrancy_lock(&env, false);
        Ok(refund_amount)
    }
"""

# Find and replace functions
content = "".join(lines)

# Fix the end of file first
if "}get(0).unwrap(), 95);" in content:
    content = content.replace("}get(0).unwrap(), 95);\\n        assert_eq!(results.get(1).unwrap(), 0);\\n    }\\n}", "}\\n}")

# Replace withdraw_accrued
import re
pattern_withdraw = re.compile(r'pub fn withdraw_accrued\(.*?\).*?\{.*?\}', re.DOTALL)
content = pattern_withdraw.sub(new_withdraw_accrued, content)

# Replace claim_no_show_refund
pattern_refund = re.compile(r'pub fn claim_no_show_refund\(.*?\).*?\{.*?\}', re.DOTALL)
content = pattern_refund.sub(new_claim_no_show_refund, content)

with open(file_path, 'w') as f:
    f.write(content)
