/* eslint-disable @typescript-eslint/no-explicit-any */
import { scValToNative, xdr } from '@stellar/stellar-sdk';

export interface DecodedEvent {
  eventId: string;
  contractId: string;
  topic: string;
  ledgerSequence: number;
  transactionHash: string;
  payload: Record<string, any>;
  decodedSuccessfully: boolean;
  error?: string;
}

export class EventDecoder {
  /**
   * Safely decodes XDR topic strings or ScVal objects into plain JavaScript string topic name.
   */
  static decodeTopic(topicRaw: any): string {
    if (!topicRaw) return 'unknown';

    try {
      if (typeof topicRaw === 'string') {
        // If string is plain topic name
        if (!topicRaw.startsWith('AAAA') && !topicRaw.includes('=')) {
          return topicRaw;
        }
        // Try decoding XDR base64
        const scVal = xdr.ScVal.fromXDR(topicRaw, 'base64');
        const native = scValToNative(scVal);
        if (typeof native === 'string') return native;
        if (typeof native === 'symbol') return Symbol.keyFor(native) || String(native);
        if (typeof native === 'object' && native !== null) return JSON.stringify(native);
        return String(native);
      }

      if (Array.isArray(topicRaw)) {
        return topicRaw.map(t => EventDecoder.decodeTopic(t)).join(':');
      }

      if (typeof topicRaw === 'object' && topicRaw !== null) {
        const native = scValToNative(topicRaw);
        return typeof native === 'string' ? native : String(native);
      }

      return String(topicRaw);
    } catch {
      return typeof topicRaw === 'string' ? topicRaw : 'unknown';
    }
  }

  /**
   * Safely decodes XDR value payload into JSON serializable object.
   */
  static decodeValue(valueRaw: any): Record<string, any> {
    if (valueRaw === undefined || valueRaw === null) {
      return {};
    }

    try {
      if (typeof valueRaw === 'string') {
        // Check if string is already JSON
        if (valueRaw.trim().startsWith('{') || valueRaw.trim().startsWith('[')) {
          return JSON.parse(valueRaw);
        }
        // Attempt XDR base64 decoding
        const scVal = xdr.ScVal.fromXDR(valueRaw, 'base64');
        const native = scValToNative(scVal);
        return EventDecoder.normalizeNativeValue(native);
      }

      if (typeof valueRaw === 'object') {
        // If it's an XDR ScVal object
        if ('switch' in valueRaw || 'arm' in valueRaw) {
          const native = scValToNative(valueRaw);
          return EventDecoder.normalizeNativeValue(native);
        }
        return EventDecoder.normalizeNativeValue(valueRaw);
      }

      return { raw: valueRaw };
    } catch (err: any) {
      return { raw: valueRaw, decodeError: err?.message || 'Failed to decode XDR' };
    }
  }

  private static normalizeNativeValue(native: any): Record<string, any> {
    if (native === null || native === undefined) return {};
    if (typeof native === 'bigint') return { amount: native.toString() };
    if (typeof native !== 'object') return { value: native };
    if (Array.isArray(native)) return { items: native.map(n => typeof n === 'bigint' ? n.toString() : n) };

    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(native)) {
      if (typeof val === 'bigint') {
        result[key] = val.toString();
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = EventDecoder.normalizeNativeValue(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  /**
   * Main entry point to decode Soroban Contract Event. Guaranteed not to throw/crash.
   */
  static decodeEvent(rawEvent: any): DecodedEvent {
    const eventId = rawEvent?.id || rawEvent?.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const contractId = rawEvent?.contractId || rawEvent?.contract_id || '';
    const ledgerSequence = parseInt(String(rawEvent?.ledger || rawEvent?.ledgerSequence || 0), 10);
    const transactionHash = rawEvent?.txHash || rawEvent?.transactionHash || rawEvent?.hash || '';

    try {
      // Decode topic
      let topic = 'unknown';
      if (rawEvent?.topic) {
        if (Array.isArray(rawEvent.topic)) {
          topic = EventDecoder.decodeTopic(rawEvent.topic[0]);
        } else {
          topic = EventDecoder.decodeTopic(rawEvent.topic);
        }
      } else if (rawEvent?.type) {
        topic = String(rawEvent.type);
      }

      // Decode payload
      let payload: Record<string, any> = {};
      if (rawEvent?.value) {
        payload = EventDecoder.decodeValue(rawEvent.value);
      } else if (rawEvent?.payload) {
        payload = typeof rawEvent.payload === 'string' ? EventDecoder.decodeValue(rawEvent.payload) : rawEvent.payload;
      } else if (rawEvent?.data) {
        payload = typeof rawEvent.data === 'string' ? EventDecoder.decodeValue(rawEvent.data) : rawEvent.data;
      }

      return {
        eventId,
        contractId,
        topic,
        ledgerSequence,
        transactionHash,
        payload,
        decodedSuccessfully: true,
      };
    } catch (err: any) {
      // Safe fallback - service never crashes on corrupt events
      return {
        eventId,
        contractId,
        topic: 'corrupt_event',
        ledgerSequence,
        transactionHash,
        payload: { raw: rawEvent, error: err?.message || 'Decoding error' },
        decodedSuccessfully: false,
        error: err?.message || 'Failed to decode event',
      };
    }
  }
}
