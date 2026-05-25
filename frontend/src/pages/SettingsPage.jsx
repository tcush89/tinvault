import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { updateSettings, resetApp, importCSV } from '../api/client';

function slugify(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function reorder(arr, idx, dir) {
  const next = [...arr];
  const swap = idx + dir;
  if (swap < 0 || swap >= next.length) return next;
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
}

const inputClass =
  'px-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500';

const arrowBtn = (disabled) =>
  `w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${
    disabled
      ? 'text-stone-200 cursor-not-allowed'
      : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
  }`;

function parseImperial(input) {
  const s = input.trim();
  if (!s) return null;
  const ozMatch = s.match(/^(\d+\.?\d*)\s*oz$/i);
  if (ozMatch) {
    const n = parseFloat(ozMatch[1]);
    const g = Math.round(n * 28.3495);
    return g > 0 ? { grams: g, label: `${n} oz (${g}g)` } : null;
  }
  const lbMatch = s.match(/^(\d+\.?\d*)\s*lbs?$/i);
  if (lbMatch) {
    const n = parseFloat(lbMatch[1]);
    const g = Math.round(n * 453.592);
    return g > 0 ? { grams: g, label: `${n} lb (${g}g)` } : null;
  }
  return null;
}

function parseMetric(input) {
  const s = input.trim();
  if (!s) return null;
  const gMatch = s.match(/^(\d+\.?\d*)\s*g(?:rams?)?$/i);
  if (gMatch) {
    const n = Math.round(parseFloat(gMatch[1]));
    return n > 0 ? { grams: n, label: `${n}g` } : null;
  }
  const numMatch = s.match(/^(\d+\.?\d*)$/);
  if (numMatch) {
    const n = Math.round(parseFloat(numMatch[1]));
    return n > 0 ? { grams: n, label: `${n}g` } : null;
  }
  return null;
}

function WeightAddForm({ newWeightImperial, setNewWeightImperial, newWeightMetric, setNewWeightMetric, onAdd, inputClass }) {
  const pi = parseImperial(newWeightImperial);
  const pm = parseMetric(newWeightMetric);
  const imperialActive = newWeightImperial.trim() !== '';
  const metricActive = newWeightMetric.trim() !== '';
  const previewLabel = imperialActive ? pi?.label : (metricActive ? pm?.label : null);

  const fieldLabel = 'block text-xs font-medium text-stone-500 mb-1';
  const disabledCls = ' opacity-40 cursor-not-allowed bg-stone-50';

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <span className={fieldLabel}>Imperial</span>
          <input
            type="text"
            value={newWeightImperial}
            onChange={(e) => { setNewWeightImperial(e.target.value); setNewWeightMetric(''); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
            placeholder="e.g. 2 oz, 1.5 lb"
            disabled={metricActive}
            className={`w-full ${inputClass}${metricActive ? disabledCls : ''}`}
          />
        </div>
        <span className="pb-2 text-xs font-medium text-stone-400 flex-shrink-0">or</span>
        <div className="flex-1">
          <span className={fieldLabel}>Metric</span>
          <input
            type="text"
            value={newWeightMetric}
            onChange={(e) => { setNewWeightMetric(e.target.value); setNewWeightImperial(''); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
            placeholder="e.g. 100, 250g"
            disabled={imperialActive}
            className={`w-full ${inputClass}${imperialActive ? disabledCls : ''}`}
          />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex-shrink-0 px-4 py-1.5 text-sm font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors mb-0.5"
        >Add</button>
      </div>
      {previewLabel && (
        <p className="text-xs text-stone-400 pl-0.5">
          Label: <span className="font-mono text-stone-500">{previewLabel}</span>
        </p>
      )}
    </div>
  );
}

function ResetModal({ onConfirm, onClose, resetting }) {
  const [confirmText, setConfirmText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ready = confirmText === 'DELETE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md space-y-5 p-6">
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-stone-900">Reset App</h3>
          <p className="text-sm text-stone-600">
            This will permanently delete <strong>all tins</strong> and restore settings to their
            defaults. There is no undo.
          </p>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700 space-y-1">
          <p className="font-medium">This action will:</p>
          <ul className="list-disc list-inside space-y-0.5 text-red-600">
            <li>Delete every tin in your cellar</li>
            <li>Reset blend types and statuses to defaults</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Type <span className="font-mono font-semibold tracking-wide">DELETE</span> to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ready && onConfirm()}
            placeholder="DELETE"
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={!ready || resetting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {resetting ? 'Resetting...' : 'Reset App'}
          </button>
          <button
            onClick={onClose}
            disabled={resetting}
            className="px-5 py-2 rounded-lg text-sm font-medium border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, refresh } = useSettings();
  const navigate = useNavigate();
  const [blendTypes, setBlendTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [tinWeights, setTinWeights] = useState([]);
  const [newBlend, setNewBlend] = useState('');
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newWeightImperial, setNewWeightImperial] = useState('');
  const [newWeightMetric, setNewWeightMetric] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    setBlendTypes([...settings.blend_types]);
    setStatuses(settings.statuses.map((s) => ({ ...s })));
    setTinWeights((settings.tin_weights ?? []).map((w) => ({ ...w })));
  }, [settings]);

  const addBlend = () => {
    const t = newBlend.trim();
    if (!t) return;
    if (blendTypes.includes(t)) { setError(`"${t}" already exists.`); return; }
    setBlendTypes((prev) => [...prev, t]);
    setNewBlend('');
    setError('');
  };

  const addStatus = () => {
    const label = newStatusLabel.trim();
    if (!label) return;
    const value = slugify(label) || `status_${Date.now()}`;
    if (statuses.some((s) => s.value === value)) {
      setError('A status with that name already exists.');
      return;
    }
    setStatuses((prev) => [...prev, { value, label }]);
    setNewStatusLabel('');
    setError('');
  };

  const updateStatusLabel = (idx, label) =>
    setStatuses((prev) => prev.map((s, i) => (i === idx ? { ...s, label } : s)));

  const addWeight = () => {
    const result = parseImperial(newWeightImperial) || parseMetric(newWeightMetric);
    if (!result) {
      setError('Enter a valid weight in one field (e.g. 2 oz, 1.5 lb, or 100g).');
      return;
    }
    if (tinWeights.some((w) => w.value === result.grams)) {
      setError(`A weight of ${result.grams}g already exists.`);
      return;
    }
    setTinWeights((prev) => [...prev, { value: result.grams, label: result.label }]);
    setNewWeightImperial('');
    setNewWeightMetric('');
    setError('');
  };

  const updateWeightLabel = (idx, label) =>
    setTinWeights((prev) => prev.map((w, i) => (i === idx ? { ...w, label } : w)));

  const save = async () => {
    setError('');
    if (blendTypes.length === 0) { setError('At least one blend type is required.'); return; }
    if (statuses.length === 0) { setError('At least one status is required.'); return; }
    if (statuses.some((s) => !s.label.trim())) { setError('All status labels must be non-empty.'); return; }
    if (tinWeights.length === 0) { setError('At least one tin/bulk weight is required.'); return; }
    if (tinWeights.some((w) => !w.label.trim())) { setError('All weight labels must be non-empty.'); return; }
    setSaving(true);
    try {
      await updateSettings({ blend_types: blendTypes, statuses, tin_weights: tinWeights });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const res = await importCSV(fd);
      setImportResult({ imported: res.data.imported });
      setImportFile(null);
      setFileInputKey((k) => k + 1);
    } catch (err) {
      const data = err.response?.data;
      setImportResult({ errors: data?.errors || [data?.error || 'Import failed. Please try again.'] });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetApp();
      await refresh();
      setShowResetModal(false);
      navigate('/');
    } catch {
      setError('Reset failed. Please try again.');
      setShowResetModal(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      {showResetModal && (
        <ResetModal
          onConfirm={handleReset}
          onClose={() => setShowResetModal(false)}
          resetting={resetting}
        />
      )}

      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
          <p className="text-stone-500 mt-1 text-sm">Customize the dropdown options used when adding tins.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Blend Types */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Blend Types</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Shown in the blend type dropdown when adding or editing tins.
            </p>
          </div>

          <ul className="space-y-1.5">
            {blendTypes.map((type, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                <div className="flex flex-col">
                  <button
                    onClick={() => setBlendTypes((prev) => reorder(prev, idx, -1))}
                    disabled={idx === 0}
                    className={arrowBtn(idx === 0)}
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => setBlendTypes((prev) => reorder(prev, idx, 1))}
                    disabled={idx === blendTypes.length - 1}
                    className={arrowBtn(idx === blendTypes.length - 1)}
                    title="Move down"
                  >▼</button>
                </div>
                <span className="flex-1 text-sm text-stone-700 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100">
                  {type}
                </span>
                <button
                  onClick={() => setBlendTypes((prev) => prev.filter((_, i) => i !== idx))}
                  className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors text-lg leading-none"
                  title="Remove"
                >&times;</button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              type="text"
              value={newBlend}
              onChange={(e) => setNewBlend(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlend())}
              placeholder="New blend type..."
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={addBlend}
              className="px-4 py-1.5 text-sm font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
            >Add</button>
          </div>
        </section>

        {/* Statuses */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Statuses</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Edit the display label freely. The ID shown in gray is stored in the database and is set when you create a status.
            </p>
          </div>

          <ul className="space-y-1.5">
            {statuses.map((s, idx) => (
              <li key={s.value} className="flex items-center gap-1.5">
                <div className="flex flex-col">
                  <button
                    onClick={() => setStatuses((prev) => reorder(prev, idx, -1))}
                    disabled={idx === 0}
                    className={arrowBtn(idx === 0)}
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => setStatuses((prev) => reorder(prev, idx, 1))}
                    disabled={idx === statuses.length - 1}
                    className={arrowBtn(idx === statuses.length - 1)}
                    title="Move down"
                  >▼</button>
                </div>
                <input
                  type="text"
                  value={s.label}
                  onChange={(e) => updateStatusLabel(idx, e.target.value)}
                  className={`flex-1 ${inputClass}`}
                />
                <span className="text-xs text-stone-400 font-mono bg-stone-50 px-2 py-1 rounded border border-stone-100 whitespace-nowrap">
                  {s.value}
                </span>
                <button
                  onClick={() => setStatuses((prev) => prev.filter((_, i) => i !== idx))}
                  className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors text-lg leading-none"
                  title="Remove"
                >&times;</button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              type="text"
              value={newStatusLabel}
              onChange={(e) => setNewStatusLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStatus())}
              placeholder="New status label..."
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={addStatus}
              className="px-4 py-1.5 text-sm font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
            >Add</button>
          </div>
        </section>

        {/* Tin/Bulk Weights */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Tin/Bulk Weight</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Type a weight to add, either metric (<span className="font-mono">100g</span>) or imperial (<span className="font-mono">2 oz</span>, <span className="font-mono">1.5 lb</span>). Grams are auto-calculated for imperial. Edit labels on existing entries freely.
            </p>
          </div>

          <ul className="space-y-1.5">
            {tinWeights.map((w, idx) => (
              <li key={w.value} className="flex items-center gap-1.5">
                <div className="flex flex-col">
                  <button
                    onClick={() => setTinWeights((prev) => reorder(prev, idx, -1))}
                    disabled={idx === 0}
                    className={arrowBtn(idx === 0)}
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => setTinWeights((prev) => reorder(prev, idx, 1))}
                    disabled={idx === tinWeights.length - 1}
                    className={arrowBtn(idx === tinWeights.length - 1)}
                    title="Move down"
                  >▼</button>
                </div>
                <input
                  type="text"
                  value={w.label}
                  onChange={(e) => updateWeightLabel(idx, e.target.value)}
                  className={`flex-1 ${inputClass}`}
                />
                <span className="text-xs text-stone-400 font-mono bg-stone-50 px-2 py-1 rounded border border-stone-100 whitespace-nowrap">
                  {w.value}g
                </span>
                <button
                  onClick={() => setTinWeights((prev) => prev.filter((_, i) => i !== idx))}
                  className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors text-lg leading-none"
                  title="Remove"
                >&times;</button>
              </li>
            ))}
          </ul>

          <WeightAddForm
            newWeightImperial={newWeightImperial}
            setNewWeightImperial={setNewWeightImperial}
            newWeightMetric={newWeightMetric}
            setNewWeightMetric={setNewWeightMetric}
            onAdd={addWeight}
            inputClass={inputClass}
          />
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>

        {/* Import */}
        <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Import Cellar</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Bulk import tins from a CSV file. Imports are additive; existing tins are not modified.
            </p>
          </div>

          <a
            href="/api/import/template"
            download
            className="inline-block text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Download CSV template →
          </a>

          <div className="space-y-3">
            <input
              key={fileInputKey}
              type="file"
              accept=".csv"
              onChange={(e) => { setImportFile(e.target.files[0] || null); setImportResult(null); }}
              className="block w-full text-sm text-stone-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 file:cursor-pointer"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={!importFile || importing}
              className="px-4 py-2 text-sm font-medium bg-stone-800 hover:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>

            {importResult && (
              <div className={`text-sm px-4 py-3 rounded-lg border ${
                importResult.errors
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                {importResult.errors ? (
                  <div>
                    <p className="font-medium mb-1">Import failed:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                ) : (
                  <p>Successfully imported {importResult.imported} tin{importResult.imported !== 1 ? 's' : ''}.</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="border border-red-200 rounded-xl p-6 space-y-4 bg-red-50/40">
          <div>
            <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
            <p className="text-xs text-red-400 mt-0.5">Destructive actions that cannot be undone.</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-stone-800">Reset App</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Delete all tins and restore default settings.
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Reset...
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
