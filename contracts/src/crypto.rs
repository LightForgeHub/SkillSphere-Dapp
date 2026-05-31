//! Off-chain signed session invitations — Issue #242.
//!
//! Experts pre-sign voucher payloads off-chain so seekers can open sessions
//! without a separate on-chain expert confirmation transaction.

use soroban_sdk::{contracttype, xdr::ToXdr, Address, Bytes, BytesN, Env};

use crate::{DataKey, Error};

/// Signed session invitation issued by an expert off-chain.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionVoucher {
    pub expert: Address,
    pub rate_per_second: i128,
    pub max_duration: u64,
    pub expiry: u64,
    pub nonce: u64,
}

/// Canonical byte sequence signed by the expert wallet.
pub fn voucher_message(env: &Env, voucher: &SessionVoucher) -> Bytes {
    let mut message = Bytes::new(env);
    message.append(&voucher.expert.to_xdr(env));
    message.append(&voucher.rate_per_second.to_xdr(env));
    message.append(&voucher.max_duration.to_xdr(env));
    message.append(&voucher.expiry.to_xdr(env));
    message.append(&voucher.nonce.to_xdr(env));
    message
}

/// Verify an ed25519 signature over the canonical voucher message.
pub fn verify_voucher_signature(
    env: &Env,
    voucher: &SessionVoucher,
    public_key: &BytesN<32>,
    signature: &BytesN<64>,
) -> Result<(), Error> {
    let message = voucher_message(env, voucher);
    env.crypto()
        .ed25519_verify(public_key, &message, signature);
    Ok(())
}

pub fn voucher_pubkey(env: &Env, expert: &Address) -> Option<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::ExpertVoucherPubkey(expert.clone()))
}

pub fn set_voucher_pubkey(env: &Env, expert: &Address, public_key: BytesN<32>) {
    env.storage()
        .persistent()
        .set(&DataKey::ExpertVoucherPubkey(expert.clone()), &public_key);
}

pub fn is_nonce_consumed(env: &Env, expert: &Address, nonce: u64) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::VoucherNonceConsumed(expert.clone(), nonce))
}

pub fn consume_nonce(env: &Env, expert: &Address, nonce: u64) {
    env.storage()
        .persistent()
        .set(&DataKey::VoucherNonceConsumed(expert.clone(), nonce), &true);
}
