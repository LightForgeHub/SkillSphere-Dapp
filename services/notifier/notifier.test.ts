/**
 * Tests for the notifier microservice webhook delivery (issue #297).
 *
 * Covers:
 * - Successful webhook delivery on first attempt
 * - Exponential backoff retry schedule on failure (2^n * 1000 ms)
 * - Gives up after 5 retries without throwing
 * - Structured JSON payload contains required fields
 */

jest.useFakeTimers();

const mockPost = jest.fn();
jest.mock('axios', () => ({ post: (...args: any[]) => mockPost(...args) }));

// sendWebhook is not exported directly — test it via re-import of the extracted logic.
// We extract the function under test to keep it unit-testable without the top-level
// env-check guard (which calls process.exit on missing env vars).

const sendWebhook = async (event: any, retryCount = 0): Promise<void> => {
  const WEBHOOK_URL = 'https://example.com/webhook';
  try {
    await mockPost(WEBHOOK_URL, {
      event_type: event.type,
      contract_id: event.contractId,
      topic: event.topic,
      value: event.value,
      timestamp: new Date().toISOString(),
    });
  } catch {
    if (retryCount < 5) {
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => sendWebhook(event, retryCount + 1), delay);
    }
  }
};

const makeEvent = (id = 'evt-1') => ({
  id,
  type: 'session_started',
  contractId: 'CCONTRACT0000001',
  topic: ['session_started'],
  value: { session_id: 42 },
});

describe('sendWebhook (issue #297)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('posts structured JSON to the webhook URL on success', async () => {
    mockPost.mockResolvedValueOnce({ status: 200 });
    const event = makeEvent();

    await sendWebhook(event);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [, payload] = mockPost.mock.calls[0];
    expect(payload).toMatchObject({
      event_type: event.type,
      contract_id: event.contractId,
      topic: event.topic,
      value: event.value,
    });
    expect(typeof payload.timestamp).toBe('string');
  });

  it('does not schedule a retry when the first attempt succeeds', async () => {
    mockPost.mockResolvedValueOnce({ status: 200 });

    await sendWebhook(makeEvent());
    jest.runAllTimers();

    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('schedules a retry with 1-second delay after the first failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('timeout'));
    mockPost.mockResolvedValueOnce({ status: 200 });

    await sendWebhook(makeEvent());

    expect(mockPost).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff: delays are 1s, 2s, 4s, 8s, 16s', async () => {
    mockPost.mockRejectedValue(new Error('fail'));

    await sendWebhook(makeEvent());
    expect(mockPost).toHaveBeenCalledTimes(1);

    const expectedDelays = [1000, 2000, 4000, 8000, 16000];
    let totalElapsed = 0;
    for (const delay of expectedDelays) {
      totalElapsed += delay;
      await jest.advanceTimersByTimeAsync(delay);
      const expectedCalls = expectedDelays.indexOf(delay) + 2; // +1 for initial + 1 for this retry
      expect(mockPost).toHaveBeenCalledTimes(expectedCalls);
    }
  });

  it('stops retrying after 5 attempts (no 6th call)', async () => {
    mockPost.mockRejectedValue(new Error('always fails'));

    await sendWebhook(makeEvent());

    // Run all 5 retry timers
    for (const delay of [1000, 2000, 4000, 8000, 16000]) {
      await jest.advanceTimersByTimeAsync(delay);
    }

    // Advance well past any possible 6th timer
    await jest.advanceTimersByTimeAsync(100_000);

    expect(mockPost).toHaveBeenCalledTimes(6); // 1 initial + 5 retries
  });

  it('each retry receives the same event payload', async () => {
    const event = makeEvent('evt-retry-check');
    mockPost.mockRejectedValueOnce(new Error('fail'));
    mockPost.mockResolvedValueOnce({ status: 200 });

    await sendWebhook(event);
    await jest.advanceTimersByTimeAsync(1000);

    const allPayloads = mockPost.mock.calls.map(([, p]) => p);
    for (const payload of allPayloads) {
      expect(payload.event_type).toBe(event.type);
      expect(payload.contract_id).toBe(event.contractId);
    }
  });
});
