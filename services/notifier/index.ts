import { rpc } from '@stellar/stellar-sdk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = process.env.CONTRACT_ID || '';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';

if (!CONTRACT_ID || !WEBHOOK_URL) {
  console.error("CONTRACT_ID and WEBHOOK_URL must be set in .env");
  process.exit(1);
}

const server = new rpc.Server(RPC_URL);

async function sendWebhook(event: any, retryCount = 0) {
  try {
    await axios.post(WEBHOOK_URL, {
      event_type: event.type,
      contract_id: event.contractId,
      topic: event.topic,
      value: event.value,
      timestamp: new Date().toISOString()
    });
    console.log(`Webhook sent for event ${event.id}`);
  } catch (error) {
    if (retryCount < 5) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Webhook failed, retrying in ${delay}ms...`);
      setTimeout(() => sendWebhook(event, retryCount + 1), delay);
    } else {
      console.error(`Failed to send webhook after 5 retries for event ${event.id}`);
    }
  }
}

async function listenEvents() {
  console.log(`Listening for events from contract ${CONTRACT_ID}...`);
  let latestLedger = await server.getLatestLedger();
  let cursor = latestLedger.sequence.toString();

  setInterval(async () => {
    try {
      const response = await server.getEvents({
        startLedger: parseInt(cursor),
        filters: [
          {
            type: "contract",
            contractIds: [CONTRACT_ID]
          }
        ]
      });

      if (response.events && response.events.length > 0) {
        for (const event of response.events) {
          await sendWebhook(event);
        }
        cursor = response.latestLedger.toString();
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, 5000);
}

listenEvents();
