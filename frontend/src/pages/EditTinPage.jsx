import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTin, updateTin } from '../api/client';
import TinForm from '../components/TinForm';

export default function EditTinPage() {
  const { id } = useParams();
  const [tin, setTin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getTin(id)
      .then((res) => setTin(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-stone-400 text-center py-24">Loading...</div>;
  if (notFound || !tin) return <div className="text-red-500 text-center py-24">Tin not found.</div>;

  const initial = {
    ...tin,
    year: tin.year ?? '',
    purchase_date: tin.purchase_date
      ? new Date(tin.purchase_date).toISOString().split('T')[0]
      : '',
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Edit Tin</h1>
        <p className="text-stone-500 mt-1 text-sm">
          {tin.brand} &mdash; {tin.blend_name}
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        <TinForm
          initial={initial}
          onSubmit={(data) => updateTin(id, data)}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
