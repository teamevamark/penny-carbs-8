// Loads the Google Maps JS library with a given key in an isolated way and
// reports whether it initializes successfully. Each call uses a unique
// callback name and script tag so multiple keys can be verified independently
// without polluting the main `window.google` used by the app.

export type VerifyResult = {
  ok: boolean;
  message: string;
  durationMs: number;
};

export async function verifyGoogleMapsKey(apiKey: string, timeoutMs = 8000): Promise<VerifyResult> {
  const start = performance.now();

  if (!apiKey || !apiKey.trim()) {
    return { ok: false, message: 'Empty API key', durationMs: 0 };
  }

  return new Promise<VerifyResult>((resolve) => {
    const cbName = `__gmapsVerify_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      try {
        delete (window as any)[cbName];
      } catch {
        (window as any)[cbName] = undefined;
      }
      script.remove();
      window.removeEventListener('error', onWindowError, true);
    };

    const finish = (result: VerifyResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onWindowError = (ev: ErrorEvent) => {
      const msg = ev.message || '';
      // Google posts auth failures via gm_authFailure too, but some land here
      if (msg.includes('Google Maps') || msg.includes('InvalidKey')) {
        finish({ ok: false, message: msg, durationMs: performance.now() - start });
      }
    };
    window.addEventListener('error', onWindowError, true);

    // Google calls this global if auth fails (bad key, billing off, referrer block)
    const prevAuthFail = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      finish({
        ok: false,
        message: 'Authentication failed (invalid key, billing disabled, or referrer not allowed)',
        durationMs: performance.now() - start,
      });
      (window as any).gm_authFailure = prevAuthFail;
    };

    (window as any)[cbName] = () => {
      try {
        // Touch a constructor to confirm the library actually initialized
        const g = (window as any).google;
        if (g?.maps?.Map && g?.maps?.LatLng) {
          // Construct a throwaway LatLng — cheap and proves the lib works
          // eslint-disable-next-line no-new
          new g.maps.LatLng(0, 0);
          finish({ ok: true, message: 'Loaded successfully', durationMs: performance.now() - start });
        } else {
          finish({ ok: false, message: 'Library loaded but maps namespace missing', durationMs: performance.now() - start });
        }
      } catch (e: any) {
        finish({ ok: false, message: e?.message || 'Initialization error', durationMs: performance.now() - start });
      }
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${cbName}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      finish({ ok: false, message: 'Network error loading Maps script', durationMs: performance.now() - start });
    };

    document.head.appendChild(script);

    setTimeout(() => {
      finish({ ok: false, message: `Timeout after ${timeoutMs}ms`, durationMs: performance.now() - start });
    }, timeoutMs);
  });
}
