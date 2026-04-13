'use client';

import { useEffect, useState } from 'react';
import type { DashboardStats } from '@/types';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID;

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`/api/dashboard/stats?siteId=${SITE_ID}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setStats(d)))
      .catch((e) => setErr(e.message));
  }, []);

  const cards = stats
    ? [
        { label: 'Synced Contacts', value: stats.totalMappings, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Sync Events', value: stats.totalLogs, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { label: 'Successful Syncs', value: stats.successLogs, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Errors', value: stats.errorLogs, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-5">Overview</h2>

      {err && <p className="text-red-500 text-sm mb-4">{err}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {!stats && !err
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
            ))
          : cards.map((c) => (
              <div
                key={c.label}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className={`text-4xl font-bold ${c.color} mb-1`}>{c.value}</div>
                <div className="text-sm text-gray-500">{c.label}</div>
              </div>
            ))}
      </div>

      {stats?.lastSync && (
        <p className="text-sm text-gray-500 mb-5">
          Last successful sync:{' '}
          <span className="font-semibold text-gray-700">
            {new Date(stats.lastSync.createdAt!).toLocaleString()}
          </span>{' '}
          <span className="text-gray-400">
            ({stats.lastSync.source} → {stats.lastSync.action})
          </span>
        </p>
      )}

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside mb-5">
          <li>Wix contact changes automatically sync to HubSpot via webhooks</li>
          <li>HubSpot contact changes sync back to Wix (true bi-directional)</li>
          <li>Loop prevention: 60-second dedup window per contact — echoes are ignored</li>
          <li>Conflict resolution: &quot;last updated wins&quot; using timestamps</li>
          <li>Form submissions push contact + full UTM attribution to HubSpot in seconds</li>
        </ul>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1.5">
          <p className="font-semibold text-gray-700 mb-2">Webhook URLs to register:</p>
          <div className="font-mono text-xs text-gray-600 bg-white border border-gray-200 rounded p-2">
            Wix → POST http://your-server/api/webhooks/wix
          </div>
          <div className="font-mono text-xs text-gray-600 bg-white border border-gray-200 rounded p-2">
            HubSpot → POST http://your-server/api/webhooks/hubspot
          </div>
        </div>
      </div>
    </div>
  );
}
