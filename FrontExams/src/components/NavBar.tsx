// FrontExams/src/components/NavBar.tsx
import { ChangeEvent, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useCategories from '../hooks/useCategories';
import useQuestions from '../hooks/useQuestions';
import useDebounce from '../hooks/useDebounce';

export default function NavBar() {
  const [querySearch, setQuerySearch] = useState({
    query: '',
    block: '',
    topic: '',
  });
  
  // Estado para controlar si la búsqueda automática está activa (temporalmente desactivada)
  const [autoSearchEnabled, setAutoSearchEnabled] = useState(false);
  
  // Debounce para la búsqueda en tiempo real (500ms de delay)
  const debouncedQuery = useDebounce(querySearch.query, 500);
  const debouncedBlock = useDebounce(querySearch.block, 300);
  const debouncedTopic = useDebounce(querySearch.topic, 300);
  
  const handleChange = ({ target }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setQuerySearch((prev) => ({
      ...prev,
      [target.id]: target.value,
    }));
  };
  
  const location = useLocation();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { callback: searchQuestions } = useQuestions();

  // Efecto para detectar Cmd+F y desactivar temporalmente la búsqueda automática
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Detectar Cmd+F (Mac) o Ctrl+F (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        setAutoSearchEnabled(false);
        // Reactivar después de 2 segundos
        setTimeout(() => setAutoSearchEnabled(true), 2000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Función para preparar parámetros de búsqueda (memoizada para evitar recreaciones)
  const prepareSearchParams = useCallback((query: string, block: string, topic: string) => {
    const searchParams: Record<string, string> = {};
    
    if (query.trim()) {
      searchParams.query = query.trim();
    }
    
    if (block && block !== '0') {
      searchParams.block = block;
    }
    
    if (topic && topic !== '0') {
      searchParams.topic = topic;
    }
    
    return searchParams;
  }, []);

  // Función de búsqueda manual (botón y Enter)
  async function handleSearch() {
    const searchParams = prepareSearchParams(querySearch.query, querySearch.block, querySearch.topic);

    if (location.pathname.includes('admin')) {
      await searchQuestions(searchParams);
    } else {
      navigate('/admin', { 
        replace: true, 
        state: searchParams 
      });
    }
  }

  // Efecto para búsqueda automática en tiempo real (simplificado)
  useEffect(() => {
    // Solo ejecutar búsqueda automática si está habilitada y estamos en admin
    if (!autoSearchEnabled || !location.pathname.includes('admin')) {
      return;
    }

    // Preparar parámetros directamente aquí para evitar dependencias complejas
    const searchParams: Record<string, string> = {};
    
    if (debouncedQuery.trim()) {
      searchParams.query = debouncedQuery.trim();
    }
    
    if (debouncedBlock && debouncedBlock !== '0') {
      searchParams.block = debouncedBlock;
    }
    
    if (debouncedTopic && debouncedTopic !== '0') {
      searchParams.topic = debouncedTopic;
    }

    searchQuestions(searchParams);
    
  }, [debouncedQuery, debouncedBlock, debouncedTopic, autoSearchEnabled, location.pathname]);

  async function handlerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Solo manejar Enter, dejar que otras teclas funcionen normalmente
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevenir el comportamiento por defecto solo para Enter
      await handleSearch();
    }
    // Para Cmd+F y otras combinaciones, no hacer nada (dejar que el navegador las maneje)
  }

  // Función para limpiar la búsqueda
  const clearSearch = async () => {
    setQuerySearch({
      query: '',
      block: '0',
      topic: '0',
    });
    
    // La búsqueda se ejecutará automáticamente por el useEffect cuando cambien los valores
    // No necesitamos llamar manualmente a searchQuestions aquí
  };

  return (
    <nav className="bg-white shadow-sm p-3">
      <div className="d-flex gap-3 justify-content-center">
        <div className="input-group search">
          <input
            id="query"
            type="text"
            className="form-control query-input"
            placeholder="Buscar en preguntas..."
            aria-label="search"
            value={querySearch.query}
            onKeyDown={handlerKeyDown}
            onChange={(e) => handleChange(e)}
          />
          <select
            name="block"
            id="block"
            className="input-group-text block-select"
            value={querySearch.block}
            onChange={(e) => handleChange(e)}
          >
            <option value="0">Todos los bloques</option>
            <option value="1">Bloque 1</option>
            <option value="2">Bloque 2</option>
            <option value="3">Bloque 3</option>
          </select>
          <select
            name="topic"
            id="topic"
            className="input-group-text topic-select"
            value={querySearch.topic}
            onChange={(e) => handleChange(e)}
          >
            <option value="0">Todos los temas</option>
            {categories.map(({ topic, name }) => (
              <option
                value={topic}
                key={topic}
              >
                {`${topic} - ${name}`}
              </option>
            ))}
          </select>
          <button
            className="input-group-text px-3 py-3 submit"
            type="button"
            onClick={handleSearch}
            title="Buscar"
          >
            <i className="bi bi-search" />
          </button>
          {(querySearch.query || querySearch.block !== '0' || querySearch.topic !== '0') && (
            <button
              className="input-group-text px-3 py-3 submit"
              type="button"
              onClick={clearSearch}
              title="Limpiar búsqueda"
            >
              <i className="bi bi-x-lg" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}