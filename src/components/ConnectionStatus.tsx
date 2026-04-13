'use client';

import { useState } from 'react';
import type { OAuthStatusResponse } from '@/types';

interface Props {
  connection: OAuthStatusResponse | null;
  onConnectionChange: (c: OAuthStatusResponse) => void;
}

export default function ConnectionStatus({ connection, onConnectionChange }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    window.location.href = `/api/oauth/initiate?siteId=${siteId}`;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect HubSpot? Sync will stop until reconnected.')) return;
    setLoading(true);
    try {
      const siteId = process.env.NEXT_PUBLIC_SITE_ID;
      const res = await fetch(`/api/oauth/status?siteId=${siteId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      onConnectionChange({ connected: false });
    } catch (e) {
      alert('Failed to disconnect: ' + (e instanceof Error ? e.message : 'unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (!connection) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm animate-pulse h-20" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">HubSpot Connection</h3>
          {connection.connected ? (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              Connected to portal{' '}
              <span className="font-semibold text-gray-900">{connection.hubspotPortalId}</span>
              {connection.connectedAt && (
                <span className="text-gray-400">
                  · since {new Date(connection.connectedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
              Not connected
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {connection.connected ? (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-hubspot-orange rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
              style={{ backgroundColor: '#ff7a59' }}
            >
              {loading ? 'Redirecting…' : 'Connect HubSpot'}
            </button>
          )}
        </div>
      </div>

      {connection.connected && (connection.scopes?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold text-gray-500">Scopes:</span>
          {connection.scopes!.map((sc) => (
            <span
              key={sc}
              className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-md"
            >
              {sc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
