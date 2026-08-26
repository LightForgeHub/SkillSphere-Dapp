import {
  Address,
  Contract,
  nativeToScVal,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import type {
  DisputeAdapter,
  SubmitDisputeParams,
  SubmitDisputeResult,
} from "../disputes";
import { allocateDisputeId } from "../disputes-store";

// ---------------------------------------------------------------------------
// Soroban dispute adapter (real submission path)
// ---------------------------------------------------------------------------
//
// Submits an appeal by invoking the expected `submit_dispute` entry on the
// reputation-scoring contract:
//
//   submit_dispute(
//     caller:               Address, // connected wallet (seeker or expert)
//     session_id:           u64,     // reviewed session being contested
//     reason:               String,  // grounds for the appeal
//     evidence_description: String,  // narrative description
//     evidence:             Vec<Bytes>, // evidence metadata (JSON-encoded)
//     raised_by:            Symbol,  // "seeker" | "expert"
//   )
//
// The full pipeline is: build -> simulate -> prepare -> Freighter sign ->
// submit -> poll for ledger confirmation. Argument encoding is isolated here
// so the UI never depends on contract details. Pointing this adapter at a
// deployed contract requires only the NEXT_PUBLIC_DISPUTE_CONTRACT_ID env var.

const CONTRACT_ID = process.env.NEXT_PUBLIC_DISPUTE_CONTRACT_ID ?? "";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";

/** How many times to poll the RPC for ledger confirmation, and how fast. */
const CONFIRM_POLL_ATTEMPTS = 10;
const CONFIRM_POLL_INTERVAL_MS = 3000;

/** Adapter needs the wallet context (uses the project's existing wallet). */
export interface SorobanWalletContext {
  address: string;
  networkPassphrase: string;
  signTransaction: (
    xdr: string,
    options?: { networkPassphrase?: string }
  ) => Promise<string>;
}

/** Typed failure for every configuration/signing/confirmation problem. */
export class SorobanContractSeamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SorobanContractSeamError";
  }
}

/**
 * Validates and returns the configured dispute contract id.
 *
 * @throws SorobanContractSeamError when NEXT_PUBLIC_DISPUTE_CONTRACT_ID is
 *         missing or not a valid Stellar contract id (C + 55 chars).
 */
function requireContractId(): string {
  if (!/^C[A-Z0-9]{55}$/.test(CONTRACT_ID)) {
    throw new SorobanContractSeamError(
      "NEXT_PUBLIC_DISPUTE_CONTRACT_ID is not configured with a valid deployed " +
        "contract id. Set it in the environment to enable on-chain appeals, or use " +
        "NEXT_PUBLIC_DISPUTE_ADAPTER=mock for local demo submissions."
    );
  }
  return CONTRACT_ID;
}

/**
 * Encodes evidence metadata as a contract `Vec<Bytes>` where each entry is
 * the JSON form of `{ name, size, type }` — metadata only, never file bytes.
 */
function buildEvidenceScVal(
  evidence: SubmitDisputeParams["evidence"]
): xdr.ScVal {
  return xdr.ScVal.scvVec(
    evidence.map((item) =>
      xdr.ScVal.scvBytes(
        Buffer.from(
          JSON.stringify({ name: item.name, size: item.size, type: item.type }),
          "utf8"
        )
      )
    )
  );
}

/**
 * Builds the `submit_dispute` invoke-host-function operation with arguments
 * mapped from frontend params into their ScVal representations.
 */
function buildSubmitOperation(
  params: SubmitDisputeParams,
  callerAddress: string,
  contractId: string
) {
  const contract = new Contract(contractId);
  return contract.call(
    "submit_dispute",
    new Address(callerAddress).toScVal(),
    nativeToScVal(BigInt(params.sessionId || "0"), { type: "u64" }),
    nativeToScVal(params.reason),
    nativeToScVal(params.evidenceDescription || ""),
    buildEvidenceScVal(params.evidence),
    nativeToScVal(params.raisedBy, { type: "symbol" })
  );
}

/**
 * Polls the RPC until the submitted transaction is confirmed or failed.
 *
 * @returns The confirmed transaction hash.
 * @throws SorobanContractSeamError when the transaction fails on ledger or
 *         confirmation cannot be observed within the polling window.
 */
async function waitForConfirmation(
  server: rpc.Server,
  txHash: string
): Promise<string> {
  for (let attempt = 0; attempt < CONFIRM_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_INTERVAL_MS));
    const response = await server.getTransaction(txHash);

    if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return txHash;
    }
    if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new SorobanContractSeamError(
        "The submit_dispute transaction failed on ledger. No dispute was recorded."
      );
    }
  }
  throw new SorobanContractSeamError(
    "Timed out waiting for ledger confirmation. Check the transaction hash on an explorer before retrying."
  );
}

/**
 * Real Soroban `submit_dispute` implementation driving the same transaction
 * state machine as the rest of the dApp:
 *
 *   build -> simulate -> prepare -> Freighter sign -> submit -> confirm
 *
 * Requires a deployed contract id via NEXT_PUBLIC_DISPUTE_CONTRACT_ID; all
 * failures surface as typed `SorobanContractSeamError`s handled by the UI's
 * existing error states (form data preserved, no success projection written).
 */
export class SorobanDisputeAdapter implements DisputeAdapter {
  private wallet: SorobanWalletContext | null = null;

  /** Binds the connected wallet used to sign the submission. */
  bind(wallet: SorobanWalletContext): void {
    this.wallet = wallet;
  }

  /**
   * Builds, signs, submits, and confirms the on-chain dispute submission.
   *
   * @returns The dispute id and confirmed transaction hash.
   * @throws SorobanContractSeamError for missing wallet/config, simulation
   *         failures, signature rejection, ledger failure, or poll timeout.
   */
  async submitDispute(params: SubmitDisputeParams): Promise<SubmitDisputeResult> {
    const wallet = this.wallet;
    if (!wallet || !wallet.address) {
      throw new SorobanContractSeamError("Connect your wallet to submit an appeal.");
    }
    const passphrase = wallet.networkPassphrase || NETWORK_PASSPHRASE;
    const contractId = requireContractId();
    const server = new rpc.Server(RPC_URL, { allowHttp: true });

    const operation = buildSubmitOperation(params, wallet.address, contractId);
    const account = await server.getAccount(wallet.address);

    const unsigned = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: passphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(unsigned);
    if ("error" in simulated && simulated.error) {
      throw new SorobanContractSeamError(
        "The contract rejected the submit_dispute invocation: " + simulated.error
      );
    }

    const prepared = await server.prepareTransaction(unsigned);
    const signedXdr = await wallet.signTransaction(prepared.toXDR(), {
      networkPassphrase: passphrase,
    });

    const signedTx = TransactionBuilder.fromXDR(signedXdr, passphrase);
    const sent = await server.sendTransaction(signedTx);

    if (sent.errorResult) {
      throw new SorobanContractSeamError(
        "The network rejected the submit_dispute transaction."
      );
    }

    const txHash = await waitForConfirmation(server, sent.hash);

    return {
      id: allocateDisputeId(),
      txHash,
    };
  }
}
