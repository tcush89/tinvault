import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings } from '../api/client';

const DEFAULT = {
  blend_types: [
    'Virginia', 'Burley', 'English/Latakia', 'Aromatic',
    'Virginia/Perique', 'Turkish/Oriental', 'Other',
  ],
  statuses: [
    { value: 'aging_tin', label: 'Aging (unopened tin)' },
    { value: 'aging_jar', label: 'Aging (mason jar)' },
    { value: 'in_rotation', label: 'In Rotation' },
  ],
  tin_weights: [
    { value: 50, label: '50g' },
    { value: 100, label: '100g' },
    { value: 200, label: '200g' },
    { value: 250, label: '250g' },
    { value: 28, label: '1 oz (28g)' },
    { value: 57, label: '2 oz (57g)' },
    { value: 113, label: '4 oz (113g)' },
    { value: 227, label: '8 oz (227g)' },
    { value: 454, label: '1 lb (454g)' },
    { value: 907, label: '2 lb (907g)' },
  ],
};

const Ctx = createContext({ settings: DEFAULT, refresh: () => {}, loaded: false });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() =>
    getSettings()
      .then((res) => setSettings(res.data))
      .catch(console.error)
      .finally(() => setLoaded(true)),
  []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Ctx.Provider value={{ settings, refresh, loaded }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);
