# Arbitrator Technical Guide

## Overview

This guide provides arbitrators with comprehensive instructions on how to interact with the SkillSphere contract's dispute resolution system. Arbitrators are responsible for reviewing disputed sessions and determining fair resolutions.

## Role & Responsibilities

Arbitrators are designated by the contract admin and have exclusive authority to:
- Review dispute details and IPFS metadata
- Analyze session history and payment streams
- Resolve disputes by selecting appropriate resolution outcomes
- Ensure fair treatment of both seekers and experts

## Resolution Enum & Impacts

The contract supports three resolution outcomes:

### 1. SeekerWins (Code: 1)
**When to use:** Expert failed to provide promised services or quality was severely inadequate.

**Impact:**
- Seeker receives full refund of remaining balance
- Expert receives nothing
- Session marked as Finished
- Suitable for: Non-delivery, abandonment, severe quality issues

### 2. ExpertWins (Code: 2)
**When to use:** Seeker is disputing without valid cause or expert fulfilled obligations.

**Impact:**
- Expert receives full remaining balance
- Seeker receives nothing
- Session marked as Finished
- Suitable for: Frivolous disputes, expert completed work

### 3. Refund (Code: 3)
**When to use:** Partial service delivery or shared responsibility for issues.

**Impact:**
- Expert receives accrued_amount (earned portion based on streaming)
- Seeker receives remaining balance (unearned portion)
- Session marked as Finished
- Suitable for: Partial completion, mutual agreement, partial refund scenarios

## Viewing Dispute Details

### Get Dispute Information

```bash
# Using stellar-cli to query dispute data
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ARBITRATOR_KEY> \
  -- get_dispute \
  --session_id <SESSION_ID>
```

**Returns:**
```json
{
  "session_id": 12345,
  "reason": "Expert did not respond for 3 days",
  "ipfs_metadata_hash": "QmXxxx...",
  "created_at": 1704067200,
  "resolved": false,
  "resolution": 0
}
```

### Get Session Details

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ARBITRATOR_KEY> \
  -- get_session \
  --session_id <SESSION_ID>
```

**Returns:**
```json
{
  "id": 12345,
  "seeker": "GAAAA...",
  "expert": "GBBBB...",
  "token": "GCCCC...",
  "rate_per_second": 100,
  "start_timestamp": 1704067200,
  "last_settlement_timestamp": 1704067200,
  "status": "Disputed",
  "balance": 50000,
  "accrued_amount": 25000
}
```

### Retrieve IPFS Metadata

The `ipfs_metadata_hash` field contains a reference to detailed dispute evidence:

```bash
# Using IPFS gateway to retrieve metadata
curl https://gateway.pinata.cloud/ipfs/<IPFS_HASH>

# Or using local IPFS node
ipfs get <IPFS_HASH>
```

**Expected metadata structure:**
```json
{
  "dispute_evidence": [
    {
      "type": "message",
      "timestamp": 1704067200,
      "content": "Expert communication logs"
    },
    {
      "type": "work_sample",
      "url": "ipfs://QmYyyy...",
      "description": "Incomplete deliverable"
    }
  ],
  "arbitrator_notes": "Optional notes from disputing party"
}
```

## Resolving Disputes

### Step 1: Review Evidence

1. Retrieve dispute details using `get_dispute()`
2. Fetch IPFS metadata using the provided hash
3. Review session history with `get_session()`
4. Analyze payment streams and accrued amounts

### Step 2: Make Resolution Decision

Determine which resolution best fits the situation:
- **SeekerWins**: Clear evidence of non-delivery or abandonment
- **ExpertWins**: Expert fulfilled obligations or dispute is frivolous
- **Refund**: Partial delivery or shared responsibility

### Step 3: Execute Resolution

```bash
# Using stellar-cli to resolve dispute
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ARBITRATOR_KEY> \
  -- resolve_dispute \
  --session_id <SESSION_ID> \
  --resolution <RESOLUTION_CODE>
```

**Resolution codes:**
- `1` for SeekerWins
- `2` for ExpertWins
- `3` for Refund

**Example:**
```bash
stellar contract invoke \
  --id CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4 \
  --source arbitrator-key \
  -- resolve_dispute \
  --session_id 12345 \
  --resolution 3
```

### Step 4: Verify Resolution

```bash
# Confirm dispute is resolved
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ARBITRATOR_KEY> \
  -- get_dispute \
  --session_id <SESSION_ID>
```

**Expected response after resolution:**
```json
{
  "session_id": 12345,
  "reason": "Expert did not respond for 3 days",
  "ipfs_metadata_hash": "QmXxxx...",
  "created_at": 1704067200,
  "resolved": true,
  "resolution": 3
}
```

## Key Data Fields Reference

### Session Status Values
- `Active`: Session in progress, payments streaming
- `Paused`: Session temporarily paused
- `Finished`: Session completed or ended
- `Disputed`: Session under arbitration

### Important Calculations

**Accrued Amount:** Payments earned by expert up to dispute time
```
accrued_amount = (last_settlement_timestamp - start_timestamp) × rate_per_second
```

**Remaining Balance:** Funds not yet claimed
```
remaining_balance = balance - accrued_amount
```

**Expert Earned (for Refund resolution):**
```
expert_receives = accrued_amount
seeker_receives = balance - accrued_amount
```

## Common Scenarios

### Scenario 1: Expert Abandonment
**Evidence:** No activity for extended period, seeker messages unanswered

**Recommended Resolution:** SeekerWins (Code: 1)
- Seeker gets full refund
- Expert receives nothing

### Scenario 2: Partial Completion
**Evidence:** Expert completed 60% of work, then stopped

**Recommended Resolution:** Refund (Code: 3)
- Expert receives accrued_amount (earned portion)
- Seeker receives remaining balance (unearned portion)

### Scenario 3: Frivolous Dispute
**Evidence:** Expert completed all work, seeker disputes without cause

**Recommended Resolution:** ExpertWins (Code: 2)
- Expert receives full balance
- Seeker receives nothing

### Scenario 4: Mutual Agreement
**Evidence:** Both parties agree to partial refund

**Recommended Resolution:** Refund (Code: 3)
- Splits funds based on accrued vs. remaining

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|-----------|
| `DisputeNotFound` | Session ID has no dispute | Verify session_id is correct |
| `InvalidSessionState` | Session not in Disputed status | Check session status first |
| `Unauthorized` | Caller is not admin/arbitrator | Use authorized arbitrator key |
| `SessionNotFound` | Session ID doesn't exist | Verify session_id is valid |

## Security Considerations

1. **Always verify IPFS metadata** before making decisions
2. **Cross-reference session data** with dispute claims
3. **Document your reasoning** in arbitrator notes
4. **Use authorized keys only** for dispute resolution
5. **Confirm resolution** after execution

## Event Monitoring

Monitor these contract events for dispute activity:

```bash
# Listen for dispute events
stellar contract events \
  --id <CONTRACT_ID> \
  --filter disputed
```

**Event types:**
- `disputed`: Emitted when dispute is flagged
- `resolved`: Emitted when dispute is resolved

## Best Practices

1. **Review thoroughly** - Take time to understand both perspectives
2. **Be consistent** - Apply similar logic to similar cases
3. **Document decisions** - Keep records of reasoning
4. **Communicate clearly** - Ensure parties understand the outcome
5. **Follow procedures** - Always verify data before resolving
6. **Escalate if needed** - Consult with other arbitrators for complex cases

## Support & Escalation

For complex disputes or technical issues:
1. Contact the protocol admin
2. Escalate to arbitration council
3. Request additional evidence from parties
4. Consult dispute resolution guidelines

---

**Last Updated:** 2024
**Contract Version:** 1.0
**Arbitrator Role Version:** 1.0
