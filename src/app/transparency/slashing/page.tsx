"use client";

import React, { useEffect, useState } from "react";

interface SlashEvent {
  date: string; // ISO string
  expertAddress: string;
  slashedAmount: string; // formatted token amount
  reasonCID: string; // IPFS CID
  arbitratorId: string;
  txHash: string; // transaction hash
}

// TODO: set the correct explorer base URL for the target blockchain
const EXPLORER_BASE_URL = "https://explorer.example.com/tx/";

export default function SlashingPage() {
  const [events, setEvents] = useState<SlashEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/slashing")
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Failed to fetch: ${res.status} ${txt}`);
        }
        return res.json();
      })
      .then((data: SlashEvent[]) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading slashing history…</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error loading data: {error}</p>;
  }

  if (events.length === 0) {
    return <p>No slashing events recorded.</p>;
  }

  return (
    <section style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Expert Slashing History</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Expert Address</th>
            <th style={thStyle}>Slashed Amount</th>
            <th style={thStyle}>Reason CID</th>
            <th style={thStyle}>Arbitrator ID</th>
            <th style={thStyle}>Explorer</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, idx) => (
            <tr key={ev.txHash} style={idx % 2 ? { backgroundColor: '#fafafa' } : undefined}>
              <td style={tdStyle}>{new Date(ev.date).toLocaleString()}</td>
              <td style={tdStyle}>{ev.expertAddress}</td>
              <td style={tdStyle}>{ev.slashedAmount}</td>
              <td style={tdStyle}>
                <a
                  href={`https://ipfs.io/ipfs/${ev.reasonCID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc' }}
                >
                  {ev.reasonCID.slice(0, 12)}…
                </a>
              </td>
              <td style={tdStyle}>{ev.arbitratorId}</td>
              <td style={tdStyle}>
                <a
                  href={`${EXPLORER_BASE_URL}${ev.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc' }}
                >
                  View Tx
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'left',
  fontWeight: 600,
  borderBottom: '2px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderBottom: '1px solid #eee',
  wordBreak: 'break-all',
};

