# Webhook Relay Service

Off-chain relay daemons subscribe to SkillSphere contract events and forward
normalized notifications to registered webhook URLs. Webhook URLs and relay
configuration are stored **off-chain**; the contract only emits a standardized
event envelope.

## Event envelope schema

Every contract event is published under the `webhook` topic with a four-field
data tuple:

```text
(event_type, session_id, timestamp, payload)
```

| Field        | Type     | Description |
|--------------|----------|-------------|
| `event_type` | `Symbol` | Stable identifier for the event kind (see table below) |
| `session_id` | `u64`    | Related session id, or `0` when not session-scoped |
| `timestamp`  | `u64`    | Ledger timestamp (`env.ledger().timestamp()`) at emit time |
| `payload`    | tuple    | Event-specific fields documented per type |

### Decoding in a relay

1. Subscribe to contract events where topic[0] == `"webhook"`.
2. Parse the data SCVal as a four-tuple.
3. Route on `event_type` to the appropriate payload decoder.
4. POST a JSON body to each registered webhook URL for that event type.

## Event types to listen for

### Session lifecycle

| `event_type` | When emitted | Payload fields |
|--------------|--------------|----------------|
| `sessStart`  | `start_session` / voucher start | `(seeker, expert, rate, amount, metadata_cid)` |
| `sessPause`  | `pause_session` | `(paused_at)` |
| `sessResum`  | `resume_session` | `(resumed_at)` |
| `sessSettl`  | `settle_session`, partial withdraw | `(expert_payout_or_label, ts_or_amount, …)` |
| `sessFinsh`  | `end_session` | `(claimable, remaining, finished_at)` |
| `sessRefnd`  | no-show refund | `(refund_amount, ts)` |
| `sessComit`  | commit-reveal handshake commit | `(commitment_hash, committer)` |
| `sessRevl`   | commit-reveal reveal | `(committer, seeker, expert)` |
| `sessVouch`  | voucher session started | `(expert, nonce)` |

### Disputes

| `event_type` | When emitted | Payload fields |
|--------------|--------------|----------------|
| `dispFlag`   | `flag_dispute` | `(seeker, evidence_cid, created_at)` |
| `dispEvid`   | `add_dispute_evidence` | `(caller, cid)` |
| `dispResl`   | dispute resolved | `(seeker_amount, expert_amount, auto_resolved)` |
| `expCooldn`  | expert enters post-loss cooldown | `(expert, cooldown_until_ledger)` |

### Seeker limits

| `event_type` | When emitted | Payload fields |
|--------------|--------------|----------------|
| `spndLim`    | `set_spending_limit` / `clear_spending_limit` | `(seeker, max_per_session_or_0)` |

### Platform / admin / other

| `event_type` | Examples |
|--------------|----------|
| `adminCfg`   | fee changes, treasury, pause, asset fees |
| `platStat`   | rolled-up volume every 100 settlements |
| `feeBurn`    | fee burn on settlement |
| `staking`    | stake / unstake / claim / reward deposit |
| `subscrip`   | subscription started / collect / claim |
| `fixPrice`   | fixed-price escrow lifecycle |
| `expert`     | registration, verification, price feeds |
| `rating`     | session rating submitted |
| `swap`       | DEX-backed session start |
| `gov`        | arbitration proposal |
| `insuranc`   | insurance vault config / withdraw |
| `upgrade`    | WASM upgrade timelock |
| `integr`     | SBT / DEX contract pointers |
| `heartbt`    | expert heartbeat |
| `slash`      | expert slashing |
| `reverify`   | session re-verification |
| `frozen`     | session frozen for missed check-in |
| `badge`      | soulbound badge minted |

## Webhook POST format

The relay should POST JSON to each subscriber URL:

```json
{
  "event_type": "sessStart",
  "session_id": 42,
  "timestamp": 1700000000,
  "contract_id": "C…",
  "ledger": 12345678,
  "tx_hash": "…",
  "payload": {
    "seeker": "G…",
    "expert": "G…",
    "rate_per_second": "10",
    "amount": "3000",
    "metadata_cid": "Qm…"
  }
}
```

Field names inside `payload` are chosen by the relay implementation; the
contract only guarantees the on-chain tuple ordering documented above.

### Recommended relay behaviour

- **Idempotency**: dedupe on `(tx_hash, event_type, session_id)`.
- **Retries**: exponential backoff on HTTP 5xx / network errors.
- **Auth**: sign outbound requests (HMAC-SHA256 shared secret per webhook).
- **Filtering**: clients register for subsets of `event_type` values off-chain.

## Local verification

Contract integration tests in `contracts/src/lib.rs` (`test_webhook_relay_emits_standard_envelope`)
assert that session, dispute, and config flows emit `webhook`-topic events whose
data tuple has the expected four-field shape.

Run:

```bash
cd contracts && cargo test test_webhook_relay
```

## Example minimal relay (pseudocode)

```python
for event in soroban_stream(contract_id):
    if event.topics[0] != "webhook":
        continue
    event_type, session_id, timestamp, payload = decode(event.data)
    urls = db.webhooks_for(event_type)
    body = {"event_type": event_type, "session_id": session_id,
            "timestamp": timestamp, "payload": payload_to_json(payload)}
    for url in urls:
        requests.post(url, json=body, headers=sign(body), timeout=5)
```
