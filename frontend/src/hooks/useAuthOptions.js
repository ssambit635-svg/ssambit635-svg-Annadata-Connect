import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/api/authService.js';

export function useAuthOptions() {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setError(null); setAttempt((n) => n + 1); }, []);
  useEffect(() => {
    let active = true;
    authService.options().then((data) => { if (active) setOptions(data); })
      .catch((err) => { if (active) setError(err); });
    return () => { active = false; };
  }, [attempt]);
  return { options, error, retry };
}
