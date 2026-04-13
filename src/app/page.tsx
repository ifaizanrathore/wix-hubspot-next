'use client';

import { useEffect, useState } from 'react';
import ConnectionStatus from '@/components/ConnectionStatus';
import StatsCards from '@/components/StatsCards';
import FieldMappingTable from '@/components/FieldMappingTable';
import SyncLogs from '@/components/SyncLogs';
import type { OAuthStatusResponse } from '@/types';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID;

type Tab = 'Overview' | 'Field Mappings' | 'Sync Logs';

const NAV_TABS: { id: Tab; icon: string }[] = [
  { id: 'Overview', icon: '▦' },
  { id: 'Field Mappings', icon: '⇄' },
  { id: 'Sync Logs', icon: '≡' },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [connection, setConnection] = useState<OAuthStatusResponse | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Read OAuth callback result from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('oauth');
    if (result === 'success') {
      setBanner({ type: 'success', msg: 'HubSpot connected successfully!' });
    }
    if (result === 'error') {
      setBanner({ type: 'error', msg: `Connection failed: ${params.get('reason') ?? 'unknown'}` });
    }
    if (result) window.history.replaceState({}, '', '/');
  }, []);

  // Load connection status on mount
  useEffect(() => {
    fetch(`/api/oauth/status?siteId=${SITE_ID}`)
      .then((r) => r.json())
      .then((d) => setConnection(d as OAuthStatusResponse))
      .catch(() => setConnection({ connected: false }));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-4 px-8 py-4 shadow-md"
        style={{ background: 'linear-gradient(135deg, #0a2540 0%, #1a4a8a 100%)' }}
      >
        <div className="flex items-center gap-1 text-xl font-bold tracking-tight">
          <span className="text-yellow-300">Wix</span>
          <span className="text-white mx-1">↔</span>
          <span style={{ color: '#ff7a59' }}>HubSpot</span>
        </div>
        <span className="text-blue-200 text-sm ml-1">Contact Sync Dashboard</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connection?.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
          <span className="text-sm text-blue-200">
            {connection?.connected ? `Connected · Portal ${connection.hubspotPortalId}` : 'Not connected'}
          </span>
        </div>
      </header>

      {/* ── OAuth Banner ────────────────────────────────────────────────── */}
      {banner && (
        <div
          className={`px-8 py-3 flex items-center justify-between text-sm font-medium ${
            banner.type === 'success'
              ? 'bg-green-50 text-green-800 border-b border-green-200'
              : 'bg-red-50 text-red-800 border-b border-red-200'
          }`}
        >
          <span>{banner.msg}</span>
          <button
            onClick={() => setBanner(null)}
            className="text-lg leading-none opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-1">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <nav className="w-52 shrink-0 bg-white border-r border-gray-200 pt-6 flex flex-col gap-1">
          {NAV_TABS.map(({ id, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-left transition-all ${
                tab === id
                  ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
              }`}
            >
              <span className="text-base">{icon}</span>
              {id}
            </button>
          ))}

          {/* Sidebar info */}
          <div className="mt-auto mb-6 px-5">
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 border border-gray-200">
              <p className="font-semibold text-gray-700 mb-1">App Status</p>
              <p>Site ID</p>
              <p className="font-mono text-gray-400 truncate">{SITE_ID?.slice(0, 18)}…</p>
            </div>
          </div>
        </nav>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Connection status always visible */}
          <ConnectionStatus connection={connection} onConnectionChange={setConnection} />

          {tab === 'Overview' && <StatsCards />}
          {tab === 'Field Mappings' && (
            <FieldMappingTable connected={connection?.connected ?? false} />
          )}
          {tab === 'Sync Logs' && <SyncLogs />}
        </main>
      </div>
    </div>
  );
}
