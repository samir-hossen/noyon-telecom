import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { WHATSAPP_NUMBER } from '../utils/whatsapp';

const DEFAULTS = {
  deliveryFee: 150,
  onlinePaymentEnabled: false,
  announcement: null,
  whatsappNumber: WHATSAPP_NUMBER,
  contactEmail: '',
  facebookUrl: '',
};

const PublicSettingsContext = createContext({ ...DEFAULTS, refreshPublicSettings: async () => DEFAULTS });

export function PublicSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const refreshPublicSettings = useCallback(async ({ fresh = false } = {}) => {
    const suffix = fresh ? `?v=${Date.now()}` : '';
    const data = await api.get(`/settings/public${suffix}`);
    setSettings((current) => ({ ...current, ...data, whatsappNumber: data.whatsappNumber || WHATSAPP_NUMBER }));
    return data;
  }, []);

  useEffect(() => {
    let current = true;
    api.get('/settings/public').then((data) => {
      if (current) setSettings((value) => ({ ...value, ...data, whatsappNumber: data.whatsappNumber || WHATSAPP_NUMBER }));
    }).catch(() => {});
    return () => { current = false; };
  }, []);

  const value = useMemo(() => ({ ...settings, refreshPublicSettings }), [settings, refreshPublicSettings]);
  return <PublicSettingsContext.Provider value={value}>{children}</PublicSettingsContext.Provider>;
}

export function usePublicSettings() {
  return useContext(PublicSettingsContext);
}
