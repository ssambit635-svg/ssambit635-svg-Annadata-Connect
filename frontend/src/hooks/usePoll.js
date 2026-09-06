import { useCallback, useEffect, useRef, useState } from 'react';

// Data hook with loading/error state and optional interval polling.
//
// Resilience rule: a failed *background* refresh never wipes the screen —
// if we already have data, a transient network blip keeps the last good
// data on screen (it just goes stale) instead of flipping the whole page
// to an error state. Only an initial-load failure (no data yet) surfaces
// the full error screen.
export function usePoll(fn, { intervalMs = 0, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const dataRef = useRef(null);
  const aliveRef = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!aliveRef.current) return;
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await fnRef.current();
      if (!aliveRef.current) return; // unmounted while fetching — no setState
      dataRef.current = result;
      setData(result);
      setError(null);
    } catch (e) {
      if (!aliveRef.current) return;
      if (dataRef.current) {
        // Keep the last good data on screen during a background refresh failure.
        setError(null);
      } else {
        setError(e);
      }
    } finally {
      if (aliveRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    if (!intervalMs) return undefined;
    const id = setInterval(() => {
      // Skip background polls while the tab/app is hidden: saves battery on
      // low-end phones and avoids pile-ups after the screen wakes.
      if (typeof document !== 'undefined' && document.hidden) return;
      load(true);
    }, intervalMs);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs, ...deps]);

  return { data, error, loading, refreshing, reload: () => load(false) };
}
