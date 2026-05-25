export default function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">{label}</p>
      <p className="mt-2 text-3xl font-bold text-stone-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-stone-400">{sub}</p>}
    </div>
  );
}
