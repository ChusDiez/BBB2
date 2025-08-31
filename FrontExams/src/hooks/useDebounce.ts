// FrontExams/src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

/**
 * Hook personalizado para implementar debounce
 * @param value - Valor que queremos debounce
 * @param delay - Delay en milisegundos
 * @returns Valor con debounce aplicado
 */
export default function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configurar el timer
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timer si el valor cambia antes del delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
