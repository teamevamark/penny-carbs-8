import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Module-level cache so the random pick is stable for the whole session
// and the network call only happens once.
let cachedKey: string | null = null;
let inflight: Promise<string> | null = null;

const FALLBACK_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

async function loadKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('google_maps_api_keys')
        .select('api_key')
        .eq('is_active', true);

      if (error) throw error;

      const keys = (data || [])
        .map((row: { api_key: string }) => row.api_key)
        .filter((k): k is string => !!k && k.trim().length > 0);

      if (keys.length > 0) {
        // Random pick per session
        cachedKey = keys[Math.floor(Math.random() * keys.length)];
      } else {
        cachedKey = FALLBACK_KEY;
      }
    } catch (err) {
      console.warn('[useGoogleMapsKey] Failed to fetch keys, using fallback:', err);
      cachedKey = FALLBACK_KEY;
    }
    return cachedKey!;
  })();

  return inflight;
}

export function useGoogleMapsKey(): { apiKey: string; isLoading: boolean } {
  const [apiKey, setApiKey] = useState<string>(cachedKey || '');
  const [isLoading, setIsLoading] = useState<boolean>(!cachedKey);

  useEffect(() => {
    if (cachedKey) {
      setApiKey(cachedKey);
      setIsLoading(false);
      return;
    }
    let active = true;
    loadKey().then((key) => {
      if (active) {
        setApiKey(key);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { apiKey, isLoading };
}
