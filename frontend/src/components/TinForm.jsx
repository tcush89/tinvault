import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { getBrandSuggestions, getBlendSuggestions } from '../api/client';

const inputClass =
  'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

function Autocomplete({ value, onChange, suggestions, onSelect, renderItem, inputClass, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => { setActiveIdx(-1); }, [suggestions]);

  useEffect(() => {
    const handler = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      onSelect(suggestions[activeIdx]);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={inputClass}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                i === activeIdx ? 'bg-amber-50 text-amber-900' : 'hover:bg-stone-50 text-stone-700'
              }`}
            >
              {renderItem ? renderItem(s) : s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function TinForm({ initial = {}, onSubmit, submitLabel = 'Save' }) {
  const { settings, loaded } = useSettings();
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [blendSuggestions, setBlendSuggestions] = useState([]);
  const brandDebounce = useRef(null);
  const blendDebounce = useRef(null);
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (!loaded || initialized.current) return;
    initialized.current = true;
    setForm({
      brand: '',
      blend_name: '',
      blend_type: settings.blend_types[0] || '',
      quantity: 1,
      tin_size_grams: settings.tin_weights[0]?.value ?? 50,
      year: '',
      purchase_date: '',
      opened_date: '',
      container_type: 'tin',
      status: settings.statuses[0]?.value || '',
      notes: '',
      ...initial,
    });
  }, [loaded, settings, initial]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleBrandInput = (val) => {
    setForm((prev) => ({ ...prev, brand: val }));
    clearTimeout(brandDebounce.current);
    if (!val.trim()) { setBrandSuggestions([]); return; }
    brandDebounce.current = setTimeout(() => {
      getBrandSuggestions(val).then((r) => setBrandSuggestions(r.data)).catch(() => setBrandSuggestions([]));
    }, 150);
  };

  const handleBlendInput = (val) => {
    setForm((prev) => ({ ...prev, blend_name: val }));
    clearTimeout(blendDebounce.current);
    if (!val.trim()) { setBlendSuggestions([]); return; }
    blendDebounce.current = setTimeout(() => {
      getBlendSuggestions(val).then((r) => setBlendSuggestions(r.data)).catch(() => setBlendSuggestions([]));
    }, 150);
  };

  const selectBrand = (brand) => {
    setForm((prev) => ({ ...prev, brand }));
    setBrandSuggestions([]);
  };

  const selectBlend = (suggestion) => {
    setForm((prev) => ({
      ...prev,
      blend_name: suggestion.blend_name,
      brand: suggestion.brand,
      blend_type: suggestion.blend_type,
      container_type: suggestion.container_type,
    }));
    setBlendSuggestions([]);
    setBrandSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        quantity: parseInt(form.quantity, 10) || 1,
        tin_size_grams: parseInt(form.tin_size_grams, 10) || 50,
        year: form.year ? parseInt(form.year, 10) : null,
        purchase_date: form.purchase_date || null,
        opened_date: form.opened_date || null,
      });
      navigate('/cellar');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded || form === null) {
    return <div className="text-stone-400 py-8 text-center text-sm">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand" required>
          <Autocomplete
            value={form.brand}
            onChange={handleBrandInput}
            suggestions={brandSuggestions}
            onSelect={selectBrand}
            renderItem={(s) => s}
            inputClass={inputClass}
            placeholder="e.g. Peterson, Dunhill, G.L. Pease"
            required
          />
        </Field>
        <Field label="Blend Name" required>
          <Autocomplete
            value={form.blend_name}
            onChange={handleBlendInput}
            suggestions={blendSuggestions}
            onSelect={selectBlend}
            renderItem={(s) => (
              <div>
                <div className="font-medium text-stone-800">{s.blend_name}</div>
                <div className="text-xs text-stone-400 mt-0.5">{s.brand} &middot; {s.blend_type}</div>
              </div>
            )}
            inputClass={inputClass}
            placeholder="e.g. Standard Mixture, Nightcap"
            required
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Blend Type">
          <select value={form.blend_type} onChange={set('blend_type')} className={inputClass}>
            {settings.blend_types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select value={form.container_type} onChange={set('container_type')} className={inputClass}>
            <option value="tin">Tin</option>
            <option value="bulk">Bulk</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={set('status')} className={inputClass}>
            {settings.statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Quantity">
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={set('quantity')}
            className={inputClass}
          />
        </Field>
        <Field label="Tin/Bulk Weight">
          <select value={form.tin_size_grams} onChange={set('tin_size_grams')} className={inputClass}>
            {settings.tin_weights.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input
            type="number"
            min="1900"
            max="2099"
            value={form.year}
            onChange={set('year')}
            className={inputClass}
            placeholder="e.g. 2019"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Purchase Date">
          <input
            type="date"
            value={form.purchase_date}
            onChange={set('purchase_date')}
            className={inputClass}
          />
        </Field>
        <Field label="Opened Date">
          <input
            type="date"
            value={form.opened_date}
            onChange={set('opened_date')}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          className={inputClass}
          placeholder="Tasting notes, where purchased, aging targets..."
        />
      </Field>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-6 py-2 rounded-lg text-sm font-medium border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
