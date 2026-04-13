'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ISyncLog } from '@/types';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID;

const STATUS_STYLE: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  error:   'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-600',
};

const SOURCE_STYLE: Record<string, string> = {
  wix:     'bg-yellow-100 text-yellow-800',
  hubspot: 'bg-orange-100 text-orange-800',
  form:    'bg-purple-100 text-purple-800',
};

export default function SyncLogs() {
  const [logs, setLogs] = useState<ISyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/logs?siteId=${SITE_ID}&page=${page}&limit=25`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-800">Sync Logs</h2>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        {total} total event{total !== 1 ? 's' : ''}
      </p>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Time', 'Source', 'Action', 'Status', 'Wix ID', 'HubSpot ID', 'Detail'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  {loading ? 'Loading…' : 'No sync events yet.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id as string} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt!).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${SOURCE_STYLE[log.source] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.source}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{log.action}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${STATUS_STYLE[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {log.wixContactId ? `${log.wixContactId.slice(0, 14)}…` : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {log.hubspotContactId ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">
                    {log.detail || log.errorMessage || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
