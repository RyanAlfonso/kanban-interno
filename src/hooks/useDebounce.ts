// Caminho completo: src/hooks/useDebounce.ts

import { useState, useEffect } from 'react';

/**
 * Hook customizado que atrasa a atualização de um valor.
 * É útil para evitar chamadas de API excessivas em campos de busca.
 * @param value O valor a ser "debounced" (ex: o texto de um input).
 * @param delay O tempo de atraso em milissegundos (ex: 500).
 * @returns O valor após o atraso.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
