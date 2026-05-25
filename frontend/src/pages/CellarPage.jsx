import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTins, deleteTin } from '../api/client';
import { useSettings } from '../context/SettingsContext';
import TinCard from '../components/TinCard';

const STATUS_PALETTE = [
  'bg-amber-100 text-amber-800',
  'bg-green-100 text-green-800',
  'bg-stone-100 text-stone-500',
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
];

const COLS = [
  { key: 'brand',          label: 'Brand' },
  { key: 'blend_name',     label: 'Blend' },
  { key: 'blend_type',     label: 'Blend Type' },
  { key: 'container_type', label: 'Form' },
  { key: 'quantity',       label: 'Qty',      numeric: true },
  { key: 'tin_size_grams', label: 'Weight',   numeric: true },
  { key: 'year',           label: 'Year',     numeric: true },
  { key: 'purchase_date',  label: 'Purchased' },
  { key: 'opened_date',    label: 'Opened' },
  { key: 'status',         label: 'Status' },
  { key: 'notes',          label: 'Notes' },
];

function sortValue(tin, key) {
  const v = tin[key];
  if (v == null || v === '') return null;
  if (key === 'purchase_date' || key === 'opened_date') return new Date(v).getTime();
  return v;
}

function sortTins(tins, field, dir) {
  return [...tins].sort((a, b) => {
    const av = sortValue(a, field);
    const bv = sortValue(b, field);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv, undefined, { sensitivity: 'base' }) : av - bv;
    return dir === 'asc' ? cmp : -cmp;
  });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
    </svg>
  );
}

function SortIcon({ dir }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none text-[9px] opacity-60">
      <span className={dir === 'asc' ? 'opacity-100' : ''}>▲</span>
      <span className={dir === 'desc' ? 'opacity-100' : ''}>▼</span>
    </span>
  );
}

function TinTable({ tins, onDelete, settings }) {
  const [sortKey, setSortKey] = useState('brand');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = sortTins(tins, sortKey, sortDir);

  const weightLabel = (grams) =>
    settings.tin_weights?.find((w) => w.value === grams)?.label ?? `${grams}g`;

  const statusInfo = (value) => {
    const idx = settings.statuses.findIndex((s) => s.value === value);
    const label = idx >= 0 ? settings.statuses[idx].label : value;
    const color = STATUS_PALETTE[idx >= 0 ? idx % STATUS_PALETTE.length : 0];
    return { label, color };
  };

  const thCls = (key) =>
    `px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-stone-800 transition-colors ${
      sortKey === key ? 'text-stone-800' : ''
    }`;

  return (
    <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/60">
              {COLS.map((col) => (
                <th key={col.key} className={thCls(col.key)} onClick={() => handleSort(col.key)}>
                  {col.label}
                  {sortKey === col.key ? (
                    <SortIcon dir={sortDir} />
                  ) : (
                    <span className="ml-1 inline-flex flex-col leading-none text-[9px] opacity-20">
                      <span>▲</span><span>▼</span>
                    </span>
                  )}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {sorted.map((tin) => {
              const { label: statusLabel, color: statusColor } = statusInfo(tin.status);
              return (
                <tr key={tin.id} className="hover:bg-stone-50/70 transition-colors group">
                  <td className="px-3 py-2.5 font-medium text-stone-800 whitespace-nowrap">{tin.brand}</td>
                  <td className="px-3 py-2.5 text-stone-700 whitespace-nowrap">{tin.blend_name}</td>
                  <td className="px-3 py-2.5 text-stone-500 whitespace-nowrap">{tin.blend_type}</td>
                  <td className="px-3 py-2.5 text-stone-500 capitalize whitespace-nowrap">{tin.container_type}</td>
                  <td className="px-3 py-2.5 text-stone-700 text-right tabular-nums">{tin.quantity}</td>
                  <td className="px-3 py-2.5 text-stone-500 whitespace-nowrap">{weightLabel(tin.tin_size_grams)}</td>
                  <td className="px-3 py-2.5 text-stone-500 tabular-nums">{tin.year ?? '—'}</td>
                  <td className="px-3 py-2.5 text-stone-500 whitespace-nowrap">{fmtDate(tin.purchase_date) || '—'}</td>
                  <td className="px-3 py-2.5 text-stone-500 whitespace-nowrap">{fmtDate(tin.opened_date) || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-stone-400 max-w-xs truncate" title={tin.notes}>{tin.notes || '—'}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/edit/${tin.id}`}
                        className="text-xs font-medium text-stone-500 hover:text-amber-600 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => onDelete(tin.id)}
                        className="text-xs font-medium text-stone-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CellarPage() {
  const { settings } = useSettings();
  const [tins, setTins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blendType, setBlendType] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState(() => localStorage.getItem('cellar-view') || 'table');

  const switchView = (v) => {
    setView(v);
    localStorage.setItem('cellar-view', v);
  };

  const fetchTins = useCallback(() => {
    setLoading(true);
    getTins({ search, blend_type: blendType, status })
      .then((res) => setTins(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, blendType, status]);

  useEffect(() => {
    const timer = setTimeout(fetchTins, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTins, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this tin from your cellar?')) return;
    try {
      await deleteTin(id);
      setTins((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert('Failed to delete tin.');
    }
  };

  const selectClass =
    'px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">My Cellar</h1>
          {!loading && (
            <p className="text-stone-500 mt-0.5 text-sm">
              {tins.length} tin{tins.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-stone-200 overflow-hidden">
            <button
              onClick={() => switchView('grid')}
              title="Card view"
              className={`px-2.5 py-2 transition-colors ${
                view === 'grid'
                  ? 'bg-stone-800 text-white'
                  : 'bg-white text-stone-400 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => switchView('table')}
              title="Table view"
              className={`px-2.5 py-2 border-l border-stone-200 transition-colors ${
                view === 'table'
                  ? 'bg-stone-800 text-white'
                  : 'bg-white text-stone-400 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              <TableIcon />
            </button>
          </div>
          <button
            onClick={() => { window.location.href = '/api/export'; }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors"
          >
            Export CSV
          </button>
          <Link
            to="/add"
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Add Tin
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search brand or blend..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-52 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <select
          value={blendType}
          onChange={(e) => setBlendType(e.target.value)}
          className={selectClass}
        >
          <option value="">All types</option>
          {settings.blend_types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {settings.statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {(search || blendType || status) && (
          <button
            onClick={() => { setSearch(''); setBlendType(''); setStatus(''); }}
            className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-stone-400 text-center py-24">Loading...</div>
      ) : tins.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-stone-100">
          <p className="text-stone-400 text-sm">
            {search || blendType || status ? 'No tins match your filters.' : 'Your cellar is empty.'}
          </p>
          {!search && !blendType && !status && (
            <Link to="/add" className="mt-3 inline-block text-amber-600 hover:text-amber-700 font-medium text-sm">
              Add your first tin
            </Link>
          )}
        </div>
      ) : view === 'table' ? (
        <TinTable tins={tins} onDelete={handleDelete} settings={settings} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tins.map((tin) => (
            <TinCard key={tin.id} tin={tin} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
