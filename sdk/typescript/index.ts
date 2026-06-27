/**
 * @file index.ts
 * AUTO-GENERATED — do not edit by hand.
 * Re-generated on each push to main via `.github/workflows/soroban.yml`.
 *
 * Typed wrappers around the SkillSphere Soroban contract.
 * The `soroban contract bindings typescript` command will replace this file
 * with a fully-generated client when the workflow runs.  Until then, this
 * placeholder provides the same public API so consumers can import and type-
 * check against it immediately.
 */

import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  Address,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SkillSphereConfig {
  /** Soroban RPC endpoint. */
  rpcUrl: string;
  /** Stellar network passphrase (e.g. Networks.TESTNET). */
  networkPassphrase: string;
  /** Deployed contract address (C…). */
  contractId: string;
}

// ---------------------------------------------------------------------------
// Types mirroring the on-chain SessionRating struct
// ---------------------------------------------------------------------------

/** Multi-dimensional rating submitted after a completed session (each 1–5). */
export interface SessionRating {
  communication: number;
  expertise: number;
  punctuality: number;
  overall: number;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class SkillSphereClient {
  private readonly server: Server;
  private readonly contract: Contract;
  private readonly config: SkillSphereConfig;

  constructor(config: SkillSphereConfig) {
    this.config = config;
    this.server = new Server(config.rpcUrl);
    this.contract = new Contract(config.contractId);
  }

  /**
   * Start a mentorship session between a seeker and an expert.
   *
   * Maps to the on-chain `start_session` function.
   *
   * @param seekerKeypair - Keypair of the seeker (pays and authorises).
   * @param expertAddress - Stellar address of the expert.
   * @param tokenAddress  - Whitelisted payment-token contract address.
   * @param amount        - Escrow deposit in the token's base unit (i128).
   * @param minReputation - Minimum expert reputation score required (0 = any).
   * @param metadataCid   - IPFS CID of session metadata.
   * @returns The new session ID (u64 as bigint).
   */
  async startSession(
    seekerKeypair: Keypair,
    expertAddress: string,
    tokenAddress: string,
    amount: bigint,
    minReputation: number,
    metadataCid: string
  ): Promise<bigint> {
    const account = await this.server.getAccount(
      seekerKeypair.publicKey()
    );

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        this.contract.call(
          "start_session",
          new Address(seekerKeypair.publicKey()).toScVal(),
          new Address(expertAddress).toScVal(),
          new Address(tokenAddress).toScVal(),
          nativeToScVal(amount, { type: "i128" }),
          nativeToScVal(minReputation, { type: "u32" }),
          nativeToScVal(metadataCid, { type: "string" })
        )
      )
      .setTimeout(30)
      .build();

    tx.sign(seekerKeypair);

    const response = await this.server.sendTransaction(tx);
    if (response.status === "ERROR") {
      throw new Error(`start_session failed: ${JSON.stringify(response)}`);
    }

    const result = await this._waitForResult(response.hash);
    // The contract returns u64; decode as BigInt.
    return xdr.ScVal.fromXDR(result.returnValue!, "base64").u64() as unknown as bigint;
  }

  /**
   * End (close) an active session.
   *
   * Maps to the on-chain `end_session` function.
   *
   * @param callerKeypair - Keypair of the caller (seeker or expert).
   * @param sessionId     - ID of the session to close.
   */
  async endSession(callerKeypair: Keypair, sessionId: bigint): Promise<void> {
    const account = await this.server.getAccount(
      callerKeypair.publicKey()
    );

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        this.contract.call(
          "end_session",
          new Address(callerKeypair.publicKey()).toScVal(),
          nativeToScVal(sessionId, { type: "u64" })
        )
      )
      .setTimeout(30)
      .build();

    tx.sign(callerKeypair);

    const response = await this.server.sendTransaction(tx);
    if (response.status === "ERROR") {
      throw new Error(`end_session failed: ${JSON.stringify(response)}`);
    }

    await this._waitForResult(response.hash);
  }

  /**
   * Submit a multi-dimensional rating for a completed session.
   *
   * Maps to the on-chain `rate_expert` function.
   *
   * @param seekerKeypair - Keypair of the session seeker (must match on-chain auth).
   * @param sessionId     - ID of the completed session.
   * @param rating        - Scores (1–5) across four dimensions.
   */
  async rateExpert(
    seekerKeypair: Keypair,
    sessionId: bigint,
    rating: SessionRating
  ): Promise<void> {
    const { communication, expertise, punctuality, overall } = rating;

    for (const [dim, score] of Object.entries({ communication, expertise, punctuality, overall })) {
      if (score < 1 || score > 5) {
        throw new RangeError(`rating.${dim} must be between 1 and 5, got ${score}`);
      }
    }

    const account = await this.server.getAccount(
      seekerKeypair.publicKey()
    );

    const ratingScVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: nativeToScVal("communication", { type: "symbol" }),
        val: nativeToScVal(communication, { type: "u32" }),
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("expertise", { type: "symbol" }),
        val: nativeToScVal(expertise, { type: "u32" }),
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("overall", { type: "symbol" }),
        val: nativeToScVal(overall, { type: "u32" }),
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("punctuality", { type: "symbol" }),
        val: nativeToScVal(punctuality, { type: "u32" }),
      }),
    ]);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        this.contract.call(
          "rate_expert",
          nativeToScVal(sessionId, { type: "u64" }),
          ratingScVal
        )
      )
      .setTimeout(30)
      .build();

    tx.sign(seekerKeypair);

    const response = await this.server.sendTransaction(tx);
    if (response.status === "ERROR") {
      throw new Error(`rate_expert failed: ${JSON.stringify(response)}`);
    }

    await this._waitForResult(response.hash);
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async _waitForResult(hash: string, maxAttempts = 20): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.server.getTransaction(hash);
      if (result.status === "SUCCESS") return result;
      if (result.status === "FAILED") {
        throw new Error(`Transaction ${hash} failed: ${JSON.stringify(result)}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(`Transaction ${hash} did not confirm within the timeout`);
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

/** Create a testnet client with sensible defaults. */
export function createTestnetClient(contractId: string): SkillSphereClient {
  return new SkillSphereClient({
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: Networks.TESTNET,
    contractId,
  });
}

/** Create a mainnet client. */
export function createMainnetClient(contractId: string): SkillSphereClient {
  return new SkillSphereClient({
    rpcUrl: "https://soroban-mainnet.stellar.org",
    networkPassphrase: Networks.PUBLIC,
    contractId,
  });
}
