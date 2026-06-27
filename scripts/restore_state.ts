#!/usr/bin/env ts-node
/**
 * Detect archived SkillSphere contract keys and submit a StateArchival
 * restoration transaction (RestoreFootprintOp).
 *
 * Issue #283 — Archived State Restoration Walkthrough & Helper Script
 *
 * Usage:
 *   CONTRACT_ID=... EXPERT_ADDRESS=... SECRET_KEY=... npm run restore-state
 *
 * Optional env:
 *   RPC_URL            — Soroban RPC endpoint (default: testnet)
 *   NETWORK_PASSPHRASE — Stellar network passphrase (default: testnet)
 *   DRY_RUN=true       — detect archived keys without submitting transactions
 */

import dotenv from "dotenv";
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";

dotenv.config();

const { Api, Server, assembleTransaction } = rpc;

const RPC_URL =
  process.env.RPC_URL ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;
const CONTRACT_ID = process.env.CONTRACT_ID ?? "";
const EXPERT_ADDRESS = process.env.EXPERT_ADDRESS ?? "";
const SECRET_KEY = process.env.SECRET_KEY ?? "";
const DRY_RUN = process.env.DRY_RUN === "true";

const server = new Server(RPC_URL);

export type ArchivedKeyReport = {
  ledgerKey: xdr.LedgerKey;
  status: "live" | "archived" | "missing";
};

/** Build the persistent storage ledger key for `DataKey::ExpertProfile(address)`. */
export function expertProfileLedgerKey(
  contractId: string,
  expertAddress: string,
): xdr.LedgerKey {
  const contract = Address.fromString(contractId);
  const expert = Address.fromString(expertAddress);

  const key = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("ExpertProfile"),
    expert.toScVal(),
  ]);

  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: contract.toScAddress(),
      key,
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );
}

/** Query RPC for the archival status of a ledger key. */
export async function getKeyArchivalStatus(
  ledgerKey: xdr.LedgerKey,
): Promise<ArchivedKeyReport["status"]> {
  const response = await server.getLedgerEntries(ledgerKey);

  if (!response.entries || response.entries.length === 0) {
    return "missing";
  }

  const entry = response.entries[0];
  const liveUntil = entry.liveUntilLedgerSeq;
  if (liveUntil !== undefined && liveUntil < response.latestLedger) {
    return "archived";
  }

  return "live";
}

async function waitForTx(
  hash: string,
): Promise<rpc.Api.GetTransactionResponse> {
  let response = await server.getTransaction(hash);
  while (response.status === Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    response = await server.getTransaction(hash);
  }
  return response;
}

async function submitTx(
  tx: Transaction,
): Promise<rpc.Api.GetTransactionResponse> {
  const response = await server.sendTransaction(tx);
  if (response.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(response.errorResult)}`,
    );
  }
  return waitForTx(response.hash);
}

/**
 * Simulate `get_expert_profile`, restore archived footprint entries when
 * required, then retry the read.
 */
export async function restoreExpertProfileAndRead(
  signer: Keypair,
  contractId: string,
  expertAddress: string,
): Promise<{
  wasArchived: boolean;
  restoreTxHash?: string;
  readTxHash?: string;
}> {
  const account = await server.getAccount(signer.publicKey());
  const contract = new Contract(contractId);
  const expert = Address.fromString(expertAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "get_expert_profile",
        nativeToScVal(expert, { type: "address" }),
      ),
    )
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (!Api.isSimulationSuccess(sim)) {
    throw new Error(`Simulation failed: ${JSON.stringify(sim)}`);
  }

  if (!Api.isSimulationRestore(sim)) {
    const prepTx = assembleTransaction(tx, sim).build();
    prepTx.sign(signer);
    const readResult = await submitTx(prepTx);
    return {
      wasArchived: false,
      readTxHash:
        readResult.status === Api.GetTransactionStatus.SUCCESS
          ? readResult.txHash
          : undefined,
    };
  }

  let fee = parseInt(BASE_FEE, 10);
  fee += parseInt(sim.restorePreamble.minResourceFee, 10);

  const restoreTx = new TransactionBuilder(
    await server.getAccount(signer.publicKey()),
    { fee: fee.toString(), networkPassphrase: NETWORK_PASSPHRASE },
  )
    .setSorobanData(sim.restorePreamble.transactionData.build())
    .addOperation(Operation.restoreFootprint({}))
    .setTimeout(300)
    .build();

  restoreTx.sign(signer);
  const restoreResult = await submitTx(restoreTx);

  if (restoreResult.status !== Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `Restore transaction failed: ${JSON.stringify(restoreResult)}`,
    );
  }

  const retryAccount = await server.getAccount(signer.publicKey());
  const retryTx = new TransactionBuilder(retryAccount, {
    fee: (parseInt(tx.fee, 10) + parseInt(sim.minResourceFee, 10)).toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
    sorobanData: sim.transactionData.build(),
  })
    .addOperation(
      contract.call(
        "get_expert_profile",
        nativeToScVal(expert, { type: "address" }),
      ),
    )
    .setTimeout(300)
    .build();

  retryTx.sign(signer);
  const readResult = await submitTx(retryTx);

  if (readResult.status !== Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Read retry failed: ${JSON.stringify(readResult)}`);
  }

  return {
    wasArchived: true,
    restoreTxHash: restoreResult.txHash,
    readTxHash: readResult.txHash,
  };
}

async function main(): Promise<void> {
  if (!CONTRACT_ID || !EXPERT_ADDRESS) {
    console.error(
      "Required env vars: CONTRACT_ID, EXPERT_ADDRESS (SECRET_KEY unless DRY_RUN=true)",
    );
    process.exit(1);
  }

  const profileKey = expertProfileLedgerKey(CONTRACT_ID, EXPERT_ADDRESS);
  const status = await getKeyArchivalStatus(profileKey);

  console.log("SkillSphere archived-state restoration");
  console.log(`  Contract : ${CONTRACT_ID}`);
  console.log(`  Expert   : ${EXPERT_ADDRESS}`);
  console.log(`  RPC      : ${RPC_URL}`);
  console.log(`  Key      : ExpertProfile (persistent)`);
  console.log(`  Status   : ${status}`);

  if (status === "missing") {
    console.log(
      "\nNo ExpertProfile entry found. The expert may never have registered,",
    );
    console.log("or the address / contract ID is incorrect.");
    process.exit(1);
  }

  if (status === "live") {
    console.log("\nExpert profile is live — no restoration required.");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(
      "\nDRY_RUN=true — archived key detected; skipping transaction submission.",
    );
    process.exit(0);
  }

  if (!SECRET_KEY) {
    console.error("SECRET_KEY is required to submit restoration transactions.");
    process.exit(1);
  }

  const signer = Keypair.fromSecret(SECRET_KEY);
  console.log(`\nSigner   : ${signer.publicKey()}`);
  console.log("Submitting restoration transaction…");

  const result = await restoreExpertProfileAndRead(
    signer,
    CONTRACT_ID,
    EXPERT_ADDRESS,
  );

  console.log("\nRestoration complete.");
  console.log(`  Was archived : ${result.wasArchived}`);
  if (result.restoreTxHash) {
    console.log(`  Restore tx   : ${result.restoreTxHash}`);
  }
  if (result.readTxHash) {
    console.log(`  Read tx      : ${result.readTxHash}`);
  }
  console.log(
    "\nExpert profile is readable again via get_expert_profile.",
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
