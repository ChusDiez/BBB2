// FrontExams/src/components/NavBar.tsx
import { ChangeEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useCategories from '../hooks/useCategories';
import useQuestions from '../hooks/useQuestions';

export default function NavBar() {
  const [querySearch, setQuerySearch] = useState({
    query: '',
    block: '',
    topic: '',
  });
  
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

  async function handleSearch() {
    // Preparar los parámetros de búsqueda, filtrando valores vacíos
    const searchParams: Record<string, string> = {};
    
    if (querySearch.query.trim()) {
      searchParams.query = querySearch.query.trim();
    }
    
    if (querySearch.block && querySearch.block !== '0') {
      searchParams.block = querySearch.block;
    }
    
    if (querySearch.topic && querySearch.topic !== '0') {
      searchParams.topic = querySearch.topic;
    }
    
    if (location.pathname.includes('admin')) {
      await searchQuestions(searchParams);
    } else {
      navigate('/admin', { 
        replace: true, 
        state: searchParams 
      });
    }
  }

  async function handlerKeyDown(key: string) {
    if (key === 'Enter') {
      await handleSearch();
    }
  }

  // Función para limpiar la búsqueda
  const clearSearch = async () => {
    setQuerySearch({
      query: '',
      block: '0',
      topic: '0',
    });
    
    if (location.pathname.includes('admin')) {
      await searchQuestions({});
    }
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
            onKeyDown={(({ key }) => handlerKeyDown(key))}
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