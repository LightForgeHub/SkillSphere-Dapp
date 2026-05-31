
import sys

file_path = 'contracts/src/lib.rs'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_claim_no_show_refund = """
    /// Refunds a session to the seeker if the expert did not show up within the window.
    ///
    /// # Arguments
    /// * `seeker` - The address of the seeker requesting the refund.
    /// * `session_id` - The ID of the session.
    ///
    /// # Returns
    /// * The amount refunded to the seeker.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the seeker.
    /// * `Error::NotStarted` - If the session start window has not passed yet.
    /// * `Error::InvalidSessionState` - If the session has already accrued earnings.
    pub fn claim_no_show_refund(env: Env, seeker: Address, session_id: u64) -> Result<i128, Error> {
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

new_withdraw_accrued = """
    /// Allows an expert to withdraw currently accrued funds from an active session.
    ///
    /// # Arguments
    /// * `session_id` - The ID of the session.
    ///
    /// # Returns
    /// * The amount of tokens withdrawn.
    ///
    /// # Errors
    /// * `Error::SessionNotFound` - If the session doesn't exist.
    /// * `Error::Unauthorized` - If the caller is not the expert.
    /// * `Error::InvalidSessionState` - If the session is not active.
    /// * `Error::InvalidAmount` - If there are no accrued funds to withdraw.
    /// * `Error::InsufficientBalance` - If the session balance is less than accrued (should not happen).
    pub fn withdraw_accrued(env: Env, session_id: u64) -> Result<i128, Error> {
        // === REENTRANCY GUARD ===
        if Self::reentrancy_locked(&env) {
            return Err(Error::ReentrancyDetected);
        }
        Self::set_reentrancy_lock(&env, true);

        // === CHECKS ===
        let mut session = Self::get_session_or_error(&env, session_id)?;
        
        // Verify caller is the expert
        session.expert.require_auth();

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

# Insert them back at appropriate places
# I'll just append them before mod test for simplicity
for i, line in enumerate(lines):
    if 'mod test {' in line:
        lines.insert(i-1, new_withdraw_accrued)
        lines.insert(i-1, new_claim_no_show_refund)
        break

with open(file_path, 'w') as f:
    f.writelines(lines)
