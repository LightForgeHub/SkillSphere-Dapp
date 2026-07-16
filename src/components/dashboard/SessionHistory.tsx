"use client";

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Download, FileText } from 'lucide-react';
import { mockSessions, mockTransactions } from '@/utils/data/mock-data';
import { formatExplorerUrl, shortenHash, copyHashToClipboard } from '@/utils/explorer';
import { exportToCSV, exportToPDF } from '@/utils/export';

export default function SessionHistory() {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (hash: string) => {
    copyHashToClipboard(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportCSV = () => {
    exportToCSV(mockSessions);
  };

  const handleExportPDF = () => {
    exportToPDF(mockSessions);
  };

  const getTransactionForSession = (sessionId: string) => {
    return mockTransactions.find((t) => t.sessionId === sessionId);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Session History</h2>
          <p className="text-gray-400">View your past sessions and transaction details on Stellar Explorer.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/50 hover:border-purple-500/80 rounded-lg text-sm font-medium transition-all"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-purple-600/50 border border-blue-500/50 hover:border-blue-500/80 rounded-lg text-sm font-medium transition-all"
          >
            <FileText size={16} />
            Download PDF Receipt
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-purple-500/20 bg-purple-600/10">
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Session</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Expert</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Transaction</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {mockSessions.map((session, idx) => {
                const transaction = getTransactionForSession(session.id);

                return (
                  <tr
                    key={session.id}
                    className={`border-b border-purple-500/10 hover:bg-purple-600/5 transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-purple-600/5'
                    }`}
                  >
                    {/* Session Title */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{session.title}</p>
                        <p className="text-xs text-muted-foreground">{session.category}</p>
                      </div>
                    </td>

                    {/* Expert Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={session.expertAvatar}
                          alt={session.expertName}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-medium">{session.expertName}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <span className="text-sm">{session.date}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-purple-400">{session.price}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          session.status === 'completed'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : session.status === 'active'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : session.status === 'upcoming'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}
                      >
                        <span className="capitalize">{session.status}</span>
                      </span>
                    </td>

                    {/* Transaction Link */}
                    <td className="px-6 py-4">
                      {transaction ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={formatExplorerUrl(transaction.hash, transaction.network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/50 hover:border-purple-500/80 rounded-lg text-sm font-medium transition-all group"
                            title={transaction.hash}
                          >
                            <span className="font-mono text-xs">{shortenHash(transaction.hash)}</span>
                            <ExternalLink size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                          </a>
                          <button
                            onClick={() => handleCopyHash(transaction.hash)}
                            className="p-1 hover:bg-purple-600/30 rounded transition-all"
                            title="Copy hash"
                          >
                            {copiedHash === transaction.hash ? (
                              <Check size={16} className="text-green-400" />
                            ) : (
                              <Copy size={16} className="opacity-60 hover:opacity-100" />
                            )}
                          </button>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              transaction.network === 'mainnet'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {transaction.network === 'mainnet' ? 'Mainnet' : 'Testnet'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Legend */}
      <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-muted-foreground mb-3 font-semibold">💡 Tip: Network Badges</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-blue-400"></span>
            <span>Testnet - Development/Testing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-orange-400"></span>
            <span>Mainnet - Production Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
