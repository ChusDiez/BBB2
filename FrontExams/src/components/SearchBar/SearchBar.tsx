import React, { useState, useCallback, useEffect, useRef } from 'react';
import useCategories from '../../hooks/useCategories';
import useQuestions from '../../hooks/useQuestions';
import '../../styles/SearchBar.css';

interface SearchOptions {
  silent?: boolean;
}

interface SearchBarProps {
  onSearch?: (params: Record<string, string>, options?: SearchOptions) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, className = '' }) => {
  const [query, setQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('0');
  const [selectedTopic, setSelectedTopic] = useState('0');
  const [hasHtml, setHasHtml] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequestRef = useRef(0);
  const hasMountedRef = useRef(false);
  const hadActiveParamsRef = useRef(false);
  
  const { categories } = useCategories();
  const { searchParams } = useQuestions();

  // Sincronizar con parámetros existentes
  useEffect(() => {
    setQuery(searchParams.query || '');
    setSelectedBlock(searchParams.block || '0');
    setSelectedTopic(searchParams.topic || '0');
    setHasHtml(searchParams.hasHtml || '');
  }, [searchParams]);

  // Preparar parámetros de búsqueda
  const prepareSearchParams = useCallback(() => {
    const params: Record<string, string> = {};
    
    if (query.trim()) params.query = query.trim();
    if (selectedBlock !== '0') params.block = selectedBlock;
    if (selectedTopic !== '0') params.topic = selectedTopic;
    if (hasHtml) params.hasHtml = hasHtml;
    
    return params;
  }, [query, selectedBlock, selectedTopic, hasHtml]);

  // Ejecutar búsqueda
  const runSearch = useCallback(async (
    params: Record<string, string>,
    options: SearchOptions = {}
  ) => {
    if (!onSearch) {
      return;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setIsSearching(true);

    try {
      await onSearch(params, options);
    } catch (error) {
      console.error('Error al ejecutar la búsqueda:', error);
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsSearching(false);
      }
    }
  }, [onSearch]);

  const handleSearch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    const params = prepareSearchParams();
    hadActiveParamsRef.current = Object.keys(params).length > 0;
    void runSearch(params);
  }, [prepareSearchParams, runSearch]);

  // Limpiar búsqueda
  const handleClear = useCallback(() => {
    setQuery('');
    setSelectedBlock('0');
    setSelectedTopic('0');
    setHasHtml('');
    hadActiveParamsRef.current = false;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    void runSearch({}, { silent: true });
  }, [runSearch]);

  // Búsqueda al presionar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Obtener bloques únicos de las categorías
  const uniqueBlocks = [...new Set(categories.map(cat => cat.block))].sort();

  // Filtrar temas por bloque seleccionado
  const filteredTopics = selectedBlock === '0' 
    ? categories 
    : categories.filter(cat => cat.block === selectedBlock);

  // Verificar si hay parámetros de búsqueda activos
  const hasActiveSearch = Object.keys(prepareSearchParams()).length > 0;

  // Ejecutar búsqueda dinámica con debounce
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const params = prepareSearchParams();
    const hasParams = Object.keys(params).length > 0;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!hasParams && !hadActiveParamsRef.current) {
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      hadActiveParamsRef.current = hasParams;
      void runSearch(hasParams ? params : {}, { silent: true });
    }, 350);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [prepareSearchParams, runSearch]);

  return (
    <div className={`search-bar bg-white border rounded p-3 mb-3 ${className}`}>
      <div className="row g-3">
        {/* Campo de búsqueda de texto */}
        <div className="col-md-4">
          <label htmlFor="searchQuery" className="form-label small text-muted mb-1">
            Buscar en pregunta, opciones o feedback
          </label>
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              id="searchQuery"
              type="text"
              className="form-control"
              placeholder="Escribe tu búsqueda..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setQuery('')}
                title="Limpiar búsqueda"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        </div>

        {/* Selector de bloque */}
        <div className="col-md-2">
          <label htmlFor="searchBlock" className="form-label small text-muted mb-1">
            Bloque
          </label>
          <select
            id="searchBlock"
            className="form-select"
            value={selectedBlock}
            onChange={(e) => {
              setSelectedBlock(e.target.value);
              if (e.target.value !== selectedBlock) {
                setSelectedTopic('0'); // Reset topic when block changes
              }
            }}
          >
            <option value="0">Todos los bloques</option>
            {uniqueBlocks.map(block => (
              <option key={block} value={block}>
                Bloque {block}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de tema */}
        <div className="col-md-2">
          <label htmlFor="searchTopic" className="form-label small text-muted mb-1">
            Tema
          </label>
          <select
            id="searchTopic"
            className="form-select"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            <option value="0">Todos los temas</option>
            {filteredTopics.map(category => (
              <option key={category.topic} value={category.topic.toString()}>
                {category.topic} - {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de HTML */}
        <div className="col-md-2">
          <label htmlFor="searchHtml" className="form-label small text-muted mb-1">
            Formato feedback
          </label>
          <select
            id="searchHtml"
            className="form-select"
            value={hasHtml}
            onChange={(e) => setHasHtml(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Con HTML</option>
            <option value="false">Sin HTML</option>
          </select>
        </div>

        {/* Botones */}
        <div className="col-md-2">
          <label className="form-label small text-muted mb-1 d-block">&nbsp;</label>
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary flex-grow-1"
              onClick={handleSearch}
              title="Buscar en todas las preguntas"
            >
              {isSearching ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  <span className="d-none d-sm-inline">Buscando...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-search me-1"></i>
                  <span className="d-none d-sm-inline">Buscar</span>
                </>
              )}
            </button>
            
            {hasActiveSearch && (
              <button
                className="btn btn-outline-secondary"
                onClick={handleClear}
                title="Limpiar filtros y volver a navegación"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de estado de búsqueda */}
      {hasActiveSearch && (
        <div className="mt-2 p-2 bg-light rounded">
          <div className="d-flex align-items-center justify-content-between">
            <div className="small text-muted">
              <i className="bi bi-funnel me-1"></i>
              <strong>Búsqueda activa:</strong>
              {query && <span className="ms-1 badge bg-primary">"{query}"</span>}
              {selectedBlock !== '0' && <span className="ms-1 badge bg-secondary">Bloque {selectedBlock}</span>}
              {selectedTopic !== '0' && <span className="ms-1 badge bg-info">Tema {selectedTopic}</span>}
              {hasHtml && <span className="ms-1 badge bg-warning">{hasHtml === 'true' ? 'Con HTML' : 'Sin HTML'}</span>}
            </div>
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Buscando en todas las preguntas de la base de datos
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
