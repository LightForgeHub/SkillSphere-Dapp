# ZK Identity Verification Design

## Executive Summary

Zero-knowledge proof (ZK proof) verification for identity on-chain provides significant privacy benefits while maintaining compliance and trust in the SkillSphere ecosystem. This design enables users to prove they possess valid credentials or meet certain criteria without revealing sensitive personal information.

### Why ZK for Identity?

1. **Privacy Preservation**: Users can prove eligibility (e.g., "I am a verified expert") without exposing underlying documents or personal data
2. **Regulatory Compliance**: Maintains auditability for regulated jurisdictions while preserving user privacy
3. **Selective Disclosure**: Users choose what to reveal and when, giving them control over their data
4. **Non-Transferable Proofs**: ZK commitments can be bound to specific addresses, preventing credential sharing
5. **Reduced On-Chain Footprint**: Only proof/verification key hashes are stored, minimizing storage costs

## Current Soroban Limitations

### Supported Cryptographic Primitives

Soroban currently supports the following host functions:

- **Hash Functions**: SHA-256, Keccak-256
- **Elliptic Curve Operations**: ed25519 signature verification
- **Basic Arithmetic**: Integer operations up to 128-bit
- **Byte Operations**: Concatenation, slicing, comparison

### Missing for Native ZK Support

1. **Pairing-Based Cryptography**: Required for Groth16 and PLONK verification (bn254 curve)
2. **Large Field Arithmetic**: Field elements for BN254 (254-bit) or BLS12-381 (381-bit) operations
3. **Elliptic Curve Point Operations**: Addition, multiplication, multiexp for verification equations
4. **Miller Loop Verification**: Core operation for pairing checks
5. **Large Compute Footprint**: ZK verification requires significant CPU cycles

### Workarounds

Until native support lands, ZK verification can be achieved via:

1. **Oracle-Based Verification**: Trusted oracle submits verification results
2. **Pre-compiled Contracts**: WASM libraries bundling elliptic curve math
3. **Hybrid Approach**: On-chain commitment + off-chain oracle attestation

## ZK Scheme Options

### Groth16

| Aspect | Details |
|--------|---------|
| Proof Size | ~192 bytes (3 G1 points + 1 G2 point) |
| Verification Time | Fast (12 pairings) |
| Setup | Trusted setup required per circuit |
| Quantum Resistance | No |
| Soroban Suitability | Challenging without pairing support |

**Pros:**
- Smallest proofs among major schemes
- Fast verification
- Widely adopted in production

**Cons:**
- Requires trusted ceremony per circuit change
- Less flexible for circuit updates

### PLONK / UltraPLONK

| Aspect | Details |
|--------|---------|
| Proof Size | ~288 bytes (single proof) |
| Verification Time | Moderate (16+ permutations) |
| Setup | Universal trusted setup (one-time) |
| Quantum Resistance | No |
| Soroban Suitability | Challenging without pairing support |

**Pros:**
- Universal setup allows multiple circuits
- More flexible circuit updates
- Better for evolving requirements

**Cons:**
- Larger proofs than Groth16
- More complex verifier implementation

### Recommendation

**Interim**: Use oracle-based verification with Groth16 proofs
**Long-term**: Transition to native PLONK support when Soroban adds pairing host functions

## Proposed Architecture

### Phase 1: Oracle-Based Verification (Current)

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   User       │───►│  Off-chain      │───►│  ZK-Prover       │
│ (Proves:     │    │  Prover         │    │  (snarkjs)       │
│  "I know secret│    │  (circom)       │    │                  │
│   that hashes   │    │                 │    │                  │
│   to commitment)│    │                 │    │                  │
└──────────────┘    └─────────────────┘    └─────────┬────────┘
                                                        │
                                                        ▼
┌──────────────────┐    ┌─────────────────┐    ┌───────┴────────┐
│  Trusted Oracle  │◄───│  Verification   │◄───│  Proof &       │
│  (Authorized    │    │  Key (Stored     │    │  Public Inputs  │
│   by Contract)   │    │   On-Chain)      │    │                │
└────────┬─────────┘    └─────────────────┘    └────────────────┘
         │
         ▼
┌──────────────────┐
│ Soroban Identity │
│   Contract       │
│  (Verifies via   │
│   Oracle)        │
└──────────────────┘
```

### Phase 2: Native Verification (Future)

When Soroban adds pairing-based cryptography host functions:

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   User       │───►│  Off-chain      │───►│  ZK-Prover       │
│              │    │  Prover         │    │  (snarkjs)       │
└──────────────┘    └─────────────────┘    └─────────┬────────┘
                                                        │
                        ┌───────────────────────────────┼──────────────────────┐
                        │                             ▼                      │
                        │    ┌────────────────────────────────────────────┐  │
                        │    │    On-Chain Verification (Native)             │  │
                        │    │    - Pairing checks via host functions        │  │
                        │    │    - Proof verification in WASM                │  │
                        │    └────────────────────┬─────────────────────────┘  │
                        │                         │                          │
                        ▼                         ▼                          │
┌──────────────────┐    ┌─────────────────┐    ┌───────┴────────┐          │
│  Soroban Identity │◄───│  Verification   │◄───│  Proof &       │          │
│   Contract       │    │  Key (Stored    │    │  Public Inputs  │          │
│                  │    │   On-Chain)     │    │                │          │
└──────────────────┘    └─────────────────┘    └────────────────┘          │
```

### Phase 3: Full Trustless (Future)

- Full verifier implemented in Soroban WASM
- No oracle dependency
- On-chain governance for verification key updates

## Interim Oracle Bridge

### Trust Minimization Strategies

1. **Multi-Oracle Consensus**: Require 2-of-3 oracle signatures for verification
2. **Oracle Bonding**: Oracles must stake tokens; slashing for incorrect verifications
3. **Merkle Tree Attestations**: Oracles submit Merkle roots; anyone can challenge with inclusion proofs
4. **Time-Locked Updates**: Oracle signatures for verification key updates have 24h timelock
5. **Public Challenge Period**: 7-day window for anyone to dispute malicious verifications

### Oracle Interface

```rust
// Oracle submits verification result
pub fn oracle_verify_identity(
    env: Env,
    account: Address,
    is_valid: bool,
    proof_hash: BytesN<32>,
    oracle_sig: BytesN<64>,
) -> Result<(), IdentityError>
```

## Circuit Design Sketch

### Identity Commitment Circuit (Pseudocode)

```
// Circom circuit: identity_commitment.circom

template IdentityCommitment() {
    // Private inputs (known only to prover)
    signal input secret;           // User's secret value
    
    // Public inputs (known to verifier/contract)
    signal input commitment;       // SHA256 hash stored on-chain
    signal input nullifier;        // Prevents replay across circuits
    
    // Constraints
    // 1. The secret must hash to the stored commitment
    signal computed_hash;
    computed_hash <-- HashSHA256(secret);
    computed_hash === commitment;
    
    // 2. Nullifier is derived from secret (prevents double-spend across apps)
    signal computed_nullifier;
    computed_nullifier <-- HashSHA256(HashSHA256(secret));
    computed_nullifier === nullifier;
}

component main = IdentityCommitment();
```

### Circuit Application Flow

1. **Registration**: User submits `sha256(secret)` as their identity commitment
2. **Proof Generation**: User generates ZK proof they know the secret
3. **Verification**: Contract/oracle verifies proof against stored commitment
4. **Nullifier Tracking**: Prevents same secret from being used across multiple protocols

### Real-World Credential Circuit

```
// Extended circuit: kyc_credential.circom

template KYCCredential() {
    // Private inputs
    signal input government_id_hash;
    signal input expiry_date;
    signal input proof_of_age_threshold;  // e.g., 18 years
    
    // Public inputs
    signal input min_age_satisfied;       // 1 if over threshold, 0 otherwise
    
    // Constraint: Age must be verified
    signal age_valid;
    age_valid <-- DeriveAndVerifyAge(government_id_hash, expiry_date);
    age_valid === min_age_satisfied;
}
```

## Roadmap

### Phase 1: Oracle-Based (Months 1-3)

- [ ] Deploy trusted oracle contract
- [ ] Store verification key hashes in Soroban
- [ ] Implement `oracle_verify_kyc` function
- [ ] Off-chain prover using snarkjs
- [ ] Circom circuit for basic identity commitment
- [ ] Multi-oracle consensus (2-of-3)

### Phase 2: Native Support Wait (Months 3-12)

- [ ] Monitor Soroban RFC for pairing host functions
- [ ] Contribute to specification discussions
- [ ] Prepare WASM verifier library
- [ ] Integration tests with experimental features

### Phase 3: Full Trustless (Months 12+)

- [ ] Replace oracle calls with native verification
- [ ] Remove oracle dependency from contract
- [ ] Enable governance-controlled key updates
- [ ] Add support for circuit upgrades

## References

### Soroban Documentation

- [Soroban Host Functions](https://soroban.stellar.org/docs/reference/host-functions)
- [Soroban Cryptographic Primitives RFC](https://github.com/stellar/rfcs/blob/main/0000-soroban-crypto-primitives.md)
- [Stellar Ecosystem ZK Discussions](https://github.com/stellar/ecosystem-discussions)

### ZK Libraries and Tools

- [snarkjs](https://github.com/iden3/snarkjs) - JavaScript ZK toolkit
- [circom](https://docs.circom.io/) - ZK circuit language
- [GROTH16 Paper](https://eprint.iacr.org/2016/260.pdf) - Succinct arguments of knowledge
- [PLONK Paper](https://eprint.iacr.org/2019/1021.pdf) - Polynomial commitments

### Axelar Integration

- [Axelar Cross-Chain Messaging](https://docs.axelar.network/developers/axelarscan/overview)
- For oracle-based approach, oracle can run off-chain and submit results via Axelar to Soroban

### Related Projects

- [Semaphore](https://semaphore.appliedzkp.org/) - ZK identity on Ethereum
- [Proof of Personhood](https://papers.syntopia.org/popr) - Privacy-preserving identity
- [zkEVM](https://github.com/scroll-tech/zkevm-circuits) - ZK circuits for EVM

## Implementation Notes

The initial implementation should use the identity.rs contract with oracle-based verification. The `KycStatus` enum and account structure are designed to accommodate both interim and future phases, with the `Verified` status indicating successful ZK proof verification.