"use client";

import React, { useState } from "react";
import { Shield, Search, Download, ChevronDown, ChevronUp, Globe, Monitor } from "lucide-react";

interface AuditLogEntry {
  id: string;
  date: string;
  time: string;
  ipAddress: string;
  browser: string;
  os: string;
  stellarPublicKey: string;
  status: "success" | "failed";
  location: string;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-001",
    date: "Jun 30, 2026",
    time: "07:11 UTC",
    ipAddress: "192.168.1.42",
    browser: "Chrome 125",
    os: "macOS 14",
    stellarPublicKey: "GBVQQ3DQHKNOHKV4TLUQXYZRQZFRK6RQMUQKN7PLYEDBM6YXNXHGLYJ",
    status: "success",
    location: "San Francisco, US",
  },
  {
    id: "log-002",
    date: "Jun 29, 2026",
    time: "14:32 UTC",
    ipAddress: "10.0.0.15",
    browser: "Firefox 126",
    os: "Ubuntu 22.04",
    stellarPublicKey: "GBVQQ3DQHKNOHKV4TLUQXYZRQZFRK6RQMUQKN7PLYEDBM6YXNXHGLYJ",
    status: "success",
    location: "London, GB",
  },
  {
    id: "log-003",
    date: "Jun 28, 2026",
    time: "09:05 UTC",
    ipAddress: "203.0.113.7",
    browser: "Safari 17",
    os: "iOS 17",
    stellarPublicKey: "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ",
    status: "failed",
    location: "Tokyo, JP",
  },
  {
    id: "log-004",
    date: "Jun 28, 2026",
    time: "08:44 UTC",
    ipAddress: "198.51.100.23",
    browser: "Edge 124",
    os: "Windows 11",
    stellarPublicKey: "GBVQQ3DQHKNOHKV4TLUQXYZRQZFRK6RQMUQKN7PLYEDBM6YXNXHGLYJ",
    status: "success",
    location: "Berlin, DE",
  },
  {
    id: "log-005",
    date: "Jun 27, 2026",
    time: "18:59 UTC",
    ipAddress: "192.0.2.55",
    browser: "Brave 1.65",
    os: "macOS 14",
    stellarPublicKey: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    status: "success",
    location: "Toronto, CA",
  },
  {
    id: "log-006",
    date: "Jun 26, 2026",
    time: "03:17 UTC",
    ipAddress: "172.16.0.8",
    browser: "Chrome 125",
    os: "Android 14",
    stellarPublicKey: "GBVQQ3DQHKNOHKV4TLUQXYZRQZFRK6RQMUQKN7PLYEDBM6YXNXHGLYJ",
    status: "failed",
    location: "Unknown",
  },
  {
    id: "log-007",
    date: "Jun 25, 2026",
    time: "21:48 UTC",
    ipAddress: "10.10.10.1",
    browser: "Firefox 126",
    os: "Windows 10",
    stellarPublicKey: "GDQJUTQYK2MQX2ZJARTDFWERUHXBM4DMCLZU7WMAJSLTXCDMQDIBUG5",
    status: "success",
    location: "Sydney, AU",
  },
];

type SortField = "date" | "ipAddress" | "stellarPublicKey" | "status";
type SortDir = "asc" | "desc";

function truncateKey(key: string) {
  return `${key.slice(0, 6)}…${key.slice(-6)}`;
}

export default function LoginAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.ipAddress.includes(search) ||
      log.stellarPublicKey.toLowerCase().includes(search.toLowerCase()) ||
      log.browser.toLowerCase().includes(search.toLowerCase()) ||
      log.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === "date") {
      cmp =
        new Date(a.date + " " + a.time).getTime() -
        new Date(b.date + " " + b.time).getTime();
    } else if (sortField === "ipAddress") {
      cmp = a.ipAddress.localeCompare(b.ipAddress);
    } else if (sortField === "stellarPublicKey") {
      cmp = a.stellarPublicKey.localeCompare(b.stellarPublicKey);
    } else if (sortField === "status") {
      cmp = a.status.localeCompare(b.status);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={13} className="inline ml-1" />
    ) : (
      <ChevronDown size={13} className="inline ml-1" />
    );
  };

  const handleExportCSV = () => {
    const header = ["Date", "Time", "IP Address", "Browser", "OS", "Location", "Stellar Public Key", "Status"];
    const rows = MOCK_AUDIT_LOGS.map((l) => [
      l.date, l.time, l.ipAddress, l.browser, l.os, l.location, l.stellarPublicKey, l.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "login-audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
          <Shield className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Login Audit Logs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Review all wallet authentication events for your account.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Total Logins</p>
          <p className="text-2xl font-bold text-white">{MOCK_AUDIT_LOGS.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Successful</p>
          <p className="text-2xl font-bold text-green-400">
            {MOCK_AUDIT_LOGS.filter((l) => l.status === "success").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-600/10 to-rose-600/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Failed Attempts</p>
          <p className="text-2xl font-bold text-red-400">
            {MOCK_AUDIT_LOGS.filter((l) => l.status === "failed").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Unique IPs</p>
          <p className="text-2xl font-bold text-blue-400">
            {new Set(MOCK_AUDIT_LOGS.map((l) => l.ipAddress)).size}
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search by IP, key, browser, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search audit logs"
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {(["all", "success", "failed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                statusFilter === s
                  ? s === "all"
                    ? "bg-purple-600 text-white"
                    : s === "success"
                    ? "bg-green-600/30 text-green-400 border border-green-500/50"
                    : "bg-red-600/30 text-red-400 border border-red-500/50"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors"
          aria-label="Export logs as CSV"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-gradient-to-br from-purple-600/5 to-pink-600/5 border border-purple-500/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Login audit logs">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                  onClick={() => handleSort("date")}
                  scope="col"
                >
                  Date & Time <SortIcon field="date" />
                </th>
                <th
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                  onClick={() => handleSort("ipAddress")}
                  scope="col"
                >
                  IP Address <SortIcon field="ipAddress" />
                </th>
                <th
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell"
                  scope="col"
                >
                  Browser / OS
                </th>
                <th
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell"
                  scope="col"
                >
                  Location
                </th>
                <th
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                  onClick={() => handleSort("stellarPublicKey")}
                  scope="col"
                >
                  Stellar Public Key <SortIcon field="stellarPublicKey" />
                </th>
                <th
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                  onClick={() => handleSort("status")}
                  scope="col"
                >
                  Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No logs match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-white font-medium">{log.date}</div>
                      <div className="text-slate-500 text-xs">{log.time}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                      {log.ipAddress}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Monitor size={14} className="text-slate-500 flex-shrink-0" />
                        {log.browser}
                      </div>
                      <div className="text-slate-500 text-xs ml-5">{log.os}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Globe size={14} className="text-slate-500 flex-shrink-0" />
                        {log.location}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code
                        className="font-mono text-xs bg-black/30 px-2 py-1 rounded text-purple-300 cursor-pointer hover:bg-black/50 transition-colors"
                        title={`${log.stellarPublicKey} — click to copy`}
                        onClick={() => navigator.clipboard.writeText(log.stellarPublicKey)}
                        aria-label={`Stellar public key: ${log.stellarPublicKey}. Click to copy.`}
                      >
                        {truncateKey(log.stellarPublicKey)}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          log.status === "success"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            log.status === "success" ? "bg-green-400" : "bg-red-400"
                          }`}
                        />
                        {log.status === "success" ? "Success" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filtered.length} of {MOCK_AUDIT_LOGS.length} log entries
          </span>
          <span>
            Sorted by {sortField} ({sortDir})
          </span>
        </div>
      </div>
    </div>
  );
}
