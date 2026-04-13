'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FieldMappingRow, WixField, HubSpotProperty, SyncDirection, TransformType } from '@/types';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID;

const DIRECTIONS: { value: SyncDirection; label: string }[] = [
  { value: 'bidirectional', label: 'Bi-directional ↔' },
  { value: 'wix_to_hubspot', label: 'Wix → HubSpot' },
  { value: 'hubspot_to_wix', label: 'HubSpot → Wix' },
];

const TRANSFORMS: { value: TransformType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'trim', label: 'Trim' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
];

type Row = FieldMappingRow & { uid: string };

function emptyRow(): Row {
  return {
    uid: `${Date.now()}-${Math.random()}`,
    wixField: '',
    hubspotProperty: '',
    syncDirection: 'bidirectional',
    transform: 'none',
  };
}

interface Props {
  connected: boolean;
}

export default function FieldMappingTable({ connected }: Props) {
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [wixFields, setWixFields] = useState<WixField[]>([]);
  const [hsProps, setHsProps] = useState<HubSpotProperty[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [fmRes, wfRes] = await Promise.all([
        fetch(`/api/field-mappings?siteId=${SITE_ID}`),
        fetch(`/api/field-mappings/wix-fields?siteId=${SITE_ID}`),
      ]);
      const [fmData, wfData] = await Promise.all([fmRes.json(), wfRes.json()]);

      setWixFields((wfData.fields as WixField[]) ?? []);
      const mappings = (fmData.mappings as FieldMappingRow[]) ?? [];
      setRows(
        mappings.length
          ? mappings.map((m) => ({ ...m, uid: (m._id as string) || `${Date.now()}` }))
          : [emptyRow()],
      );

      if (connected) {
        fetch(`/api/field-mappings/hs-props?siteId=${SITE_ID}`)
          .then((r) => r.json())
          .then((d) => setHsProps((d.properties as HubSpotProperty[]) ?? []))
          .catch(() => {});
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [connected]);

  useEffect(() => { load(); }, [load]);

  const setRowField = (uid: string, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)));
  };

  const validate = (): string | null => {
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.wixField || !r.hubspotProperty)
        return 'All rows must have a Wix field and HubSpot property selected.';
      if (seen.has(r.hubspotProperty))
        return `Duplicate HubSpot property: "${r.hubspotProperty}"`;
      seen.add(r.hubspotProperty);
    }
    return null;
  };

  const handleSave = async () => {
    setMsg(''); setErr('');
    const validErr = validate();
    if (validErr) { setErr(validErr); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/field-mappings?siteId=${SITE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: rows.map(({ wixField, hubspotProperty, syncDirection, transform }) => ({
            wixField, hubspotProperty, syncDirection, transform,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg(`Saved ${data.saved} mapping${data.saved !== 1 ? 's' : ''} successfully.`);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Field Mappings</h2>
        <button
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="px-3 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          + Add Row
        </button>
      </div>

      {!connected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-4">
          Connect HubSpot first to load available properties.
        </div>
      )}
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-4">
          {msg}
        </div>
      )}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm mb-4">
          {err}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Wix Field
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                HubSpot Property
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Sync Direction
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Transform
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.uid} className="hover:bg-gray-50/50">
                <td className="px-3 py-2">
                  <select
                    value={row.wixField}
                    onChange={(e) => setRowField(row.uid, 'wixField', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">— select —</option>
                    {wixFields.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label} ({f.name})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {connected && hsProps.length > 0 ? (
                    <select
                      value={row.hubspotProperty}
                      onChange={(e) => setRowField(row.uid, 'hubspotProperty', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">— select —</option>
                      {hsProps.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.label} ({p.name})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={row.hubspotProperty}
                      onChange={(e) => setRowField(row.uid, 'hubspotProperty', e.target.value)}
                      placeholder="e.g. email"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.syncDirection}
                    onChange={(e) => setRowField(row.uid, 'syncDirection', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {DIRECTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.transform}
                    onChange={(e) => setRowField(row.uid, 'transform', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {TRANSFORMS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setRows((prev) => prev.filter((r) => r.uid !== row.uid))}
                    className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Duplicate HubSpot properties are not allowed. Changes take effect on the next sync.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? 'Saving…' : 'Save Mappings'}
        </button>
      </div>
    </div>
  );
}
