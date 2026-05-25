import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getTins } from '../api/client';
import StatCard from '../components/StatCard';
import TinCard from '../components/TinCard';

function formatWeight(grams) {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
  return `${grams} g`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getTins()])
      .then(([statsRes, tinsRes]) => {
        setStats(statsRes.data);
        setRecent((tinsRes.data || []).slice(0, 4));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-stone-400 text-center py-24">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-500 mt-1 text-sm">Your cellar at a glance.</p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tins" value={stats.total_tins} />
            <StatCard label="Total Tobacco" value={formatWeight(stats.total_tobacco_grams)} />
            <StatCard label="Unique Blends" value={stats.unique_blends} />
            <StatCard label="Brands" value={stats.unique_brands} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Aging</p>
              <p className="text-3xl font-bold text-amber-900 mt-2">{stats.unopened_tins}</p>
              <p className="text-sm text-amber-600 mt-1">Tins &amp; jars aging</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-widest">In Rotation</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.opened_tins}</p>
              <p className="text-sm text-green-600 mt-1">In rotation</p>
            </div>
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Recent Additions</h2>
          <Link to="/cellar" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
            View all &rarr;
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-stone-100">
            <p className="text-stone-400 text-sm">Your cellar is empty.</p>
            <Link
              to="/add"
              className="mt-3 inline-block text-amber-600 hover:text-amber-700 font-medium text-sm"
            >
              Add your first tin
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((tin) => (
              <TinCard key={tin.id} tin={tin} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
