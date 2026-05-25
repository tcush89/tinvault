import { createTin } from '../api/client';
import TinForm from '../components/TinForm';

export default function AddTinPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Add Tin</h1>
        <p className="text-stone-500 mt-1 text-sm">Add a new tin to your cellar.</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
        <TinForm onSubmit={(data) => createTin(data)} submitLabel="Add to Cellar" />
      </div>
    </div>
  );
}
