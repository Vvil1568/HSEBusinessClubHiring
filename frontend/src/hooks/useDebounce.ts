import { useEffect, useState } from 'react';

export const useDebounce = <TValue,>(value: TValue, delay = 300): TValue => {
  const [debounced, setDebounced] = useState<TValue>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
