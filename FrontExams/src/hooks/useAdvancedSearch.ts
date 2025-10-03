import { useCallback, useState, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setQuestions } from '../store/slice';
import AdminAPI from '../apis/AdminAPI';
import { Question } from '../store/slice';

interface SearchState {
  isSearchMode: boolean;
  isSearching: boolean;
  searchParams: Record<string, string>;
  searchResults: Question[];
  totalResults: number;
}

export const useAdvancedSearch = () => {
  const dispatch = useAppDispatch();
  const [searchState, setSearchState] = useState<SearchState>({
    isSearchMode: false,
    isSearching: false,
    searchParams: {},
    searchResults: [],
    totalResults: 0,
  });
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Ejecutar búsqueda completa en el servidor
  const executeSearch = useCallback(async (params: Record<string, string>) => {
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const hasSearchParams = Object.keys(params).length > 0;
    
    setSearchState(prev => ({
      ...prev,
      isSearching: true,
      searchParams: params,
      isSearchMode: hasSearchParams,
    }));

    try {
      if (!hasSearchParams) {
        // Sin parámetros = modo navegación normal (resetear a carga lazy)
        setSearchState(prev => ({
          ...prev,
          isSearchMode: false,
          isSearching: false,
          searchParams: {},
          searchResults: [],
          totalResults: 0,
        }));
        
        // Disparar evento para que useQuestions vuelva a cargar en modo lazy
        window.dispatchEvent(new CustomEvent('resetToLazyMode'));
        return;
      }

      // Con parámetros = búsqueda completa
      const { data } = await AdminAPI.getQuestions(params);
      const results = Array.isArray(data) ? data : data.questions || [];
      
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        searchResults: results,
        totalResults: results.length,
      }));

      // Actualizar el store con los resultados
      dispatch(setQuestions(results));
      
    } catch (error) {
      console.error('Error en búsqueda avanzada:', error);
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        searchResults: [],
        totalResults: 0,
      }));
      dispatch(setQuestions([]));
    }
  }, [dispatch]);

  // Búsqueda con debounce
  const searchWithDebounce = useCallback((params: Record<string, string>, delay: number = 300) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(params);
    }, delay);
  }, [executeSearch]);

  // Limpiar búsqueda y volver a modo navegación
  const clearSearch = useCallback(() => {
    executeSearch({});
  }, [executeSearch]);

  // Obtener estadísticas de búsqueda
  const getSearchStats = useCallback(() => {
    if (!searchState.isSearchMode) {
      return null;
    }

    return {
      totalResults: searchState.totalResults,
      searchParams: searchState.searchParams,
      hasResults: searchState.totalResults > 0,
      isEmpty: searchState.totalResults === 0,
    };
  }, [searchState]);

  return {
    // Estado
    isSearchMode: searchState.isSearchMode,
    isSearching: searchState.isSearching,
    searchParams: searchState.searchParams,
    searchResults: searchState.searchResults,
    totalResults: searchState.totalResults,
    
    // Acciones
    executeSearch,
    searchWithDebounce,
    clearSearch,
    getSearchStats,
  };
};

export default useAdvancedSearch;
