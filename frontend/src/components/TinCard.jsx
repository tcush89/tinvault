import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const BLEND_PALETTE = [
  'bg-yellow-100 text-yellow-800',
  'bg-orange-100 text-orange-800',
  'bg-slate-100 text-slate-700',
  'bg-pink-100 text-pink-800',
  'bg-red-100 text-red-800',
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-green-100 text-green-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
  'bg-stone-100 text-stone-600',
];

const STATUS_PALETTE = [
  'bg-amber-100 text-amber-800',
  'bg-green-100 text-green-800',
  'bg-stone-100 text-stone-500',
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
];

function strIndex(str, len) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % len;
}

export default function TinCard({ tin, onDelete, compact = false }) {
  const { settings } = useSettings();

  const statusObj = settings.statuses.find((s) => s.value === tin.status);
  const statusLabel = statusObj?.label ?? tin.status;

  const blendIdx = settings.blend_types.indexOf(tin.blend_type);
  const blendColor = BLEND_PALETTE[
    blendIdx >= 0 ? blendIdx % BLEND_PALETTE.length : strIndex(tin.blend_type, BLEND_PALETTE.length)
  ];

  const statusIdx = settings.statuses.findIndex((s) => s.value === tin.status);
  const statusColor = STATUS_PALETTE[
    statusIdx >= 0 ? statusIdx % STATUS_PALETTE.length : strIndex(tin.status, STATUS_PALETTE.length)
  ];

  const weightOption = settings.tin_weights?.find((w) => w.value === tin.tin_size_grams);
  const weightLabel = weightOption?.label ?? `${tin.tin_size_grams}g`;
  const totalGrams = tin.quantity * tin.tin_size_grams;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide truncate">{tin.brand}</p>
        <h3 className="text-base font-semibold text-stone-900 leading-snug mt-0.5">{tin.blend_name}</h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${blendColor}`}>
          {tin.blend_type}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="text-sm text-stone-500 space-y-0.5">
        <p>
          {tin.quantity} tin{tin.quantity !== 1 ? 's' : ''} &times; {weightLabel}
          <span className="text-stone-400 ml-1">({totalGrams}g total)</span>
        </p>
        {tin.year && <p>Year {tin.year}</p>}
      </div>

      {tin.notes && (
        <p className="text-xs text-stone-400 line-clamp-2">{tin.notes}</p>
      )}

      {!compact && (
        <div className="flex gap-2 mt-auto pt-2 border-t border-stone-50">
          <Link
            to={`/edit/${tin.id}`}
            className="flex-1 text-center text-xs font-medium py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(tin.id)}
            className="flex-1 text-xs font-medium py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
