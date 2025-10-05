// FrontExams/src/hooks/useQuestions.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { useCallback, useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getQuestions } from '../store/selectors';
import { Question, setQuestions, addQuestions } from '../store/slice';
import AdminAPI from '../apis/AdminAPI';

// Configuración para carga por lotes
const BATCH_SIZE = 100;
const INITIAL_LOAD_SIZE = 200;

export default function useQuestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const questions = useAppSelector(getQuestions);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const loadingRef = useRef(false);
  const latestSearchRef = useRef(0);

  const deleteQuestion = useCallback(async (id: number) => {
    try {
      const { data } = await AdminAPI.delete(id);
      dispatch(setQuestions(data.questions as Question[]));
      // Actualizar el total después de eliminar
      setTotalQuestions(prev => prev - 1);
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
    }
  }, [dispatch]);

  // Función para cargar más preguntas (lazy loading) - solo en modo navegación
  const loadMoreQuestions = useCallback(async () => {
    if (loadingRef.current || !hasNextPage || isLoadingMore || isSearchMode) {
      return;
    }

    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      const queryParams = {
        ...searchParams,
        limit: BATCH_SIZE.toString(),
        offset: currentOffset.toString(),
      };

      const { data } = await AdminAPI.getQuestions(queryParams);
      
      if (Array.isArray(data)) {
        // Respuesta simple (array de preguntas)
        dispatch(addQuestions(data as Question[]));
        setCurrentOffset(prev => prev + data.length);
        setHasNextPage(data.length === BATCH_SIZE);
      } else {
        // Respuesta con metadata (objeto con questions, total, etc.)
        const newQuestions = data.questions as Question[];
        dispatch(addQuestions(newQuestions));
        setCurrentOffset(prev => prev + newQuestions.length);
        setHasNextPage(newQuestions.length === BATCH_SIZE && currentOffset + newQuestions.length < (data.total || 0));
        if (data.total !== undefined) {
          setTotalQuestions(data.total);
        }
      }
    } catch (error) {
      console.error('Error al cargar más preguntas:', error);
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [searchParams, currentOffset, hasNextPage, isLoadingMore, isSearchMode, dispatch]);

  // Función de búsqueda híbrida
  const callback = useCallback(async (queryParams: Record<string, string>) => {
    const currentRequest = latestSearchRef.current + 1;
    latestSearchRef.current = currentRequest;

    try {
      setIsLoading(true);
      setSearchParams(queryParams);
      
      if (!location.pathname.includes('admin')) {
        navigate('/admin', { replace: true });
      }

      const hasSearchParams = Object.keys(queryParams).length > 0;
      setIsSearchMode(hasSearchParams);

      if (hasSearchParams) {
        // Modo búsqueda: cargar todos los resultados de una vez (pero virtualizados)
        setCurrentOffset(0);
        setHasNextPage(false);
        
        const { data } = await AdminAPI.getQuestions(queryParams);
        if (latestSearchRef.current !== currentRequest) {
          return;
        }
        const results = Array.isArray(data) ? data : data.questions || [];
        dispatch(setQuestions(results));
        setCurrentOffset(results.length);
        setTotalQuestions(results.length);
      } else {
        // Modo navegación: carga lazy por lotes
        setCurrentOffset(0);
        setHasNextPage(true);
        
        const initialParams = {
          ...queryParams,
          limit: INITIAL_LOAD_SIZE.toString(),
          offset: '0',
        };
        
        const { data } = await AdminAPI.getQuestions(initialParams);
        if (latestSearchRef.current !== currentRequest) {
          return;
        }
        
        if (Array.isArray(data)) {
          dispatch(setQuestions(data as Question[]));
          setCurrentOffset(data.length);
          setHasNextPage(data.length === INITIAL_LOAD_SIZE);
        } else {
          const newQuestions = data.questions as Question[];
          dispatch(setQuestions(newQuestions));
          setCurrentOffset(newQuestions.length);
          setHasNextPage(newQuestions.length === INITIAL_LOAD_SIZE && newQuestions.length < (data.total || 0));
          if (data.total !== undefined) {
            setTotalQuestions(data.total);
          }
        }
      }
    } catch (error) {
      console.error('Error al buscar preguntas:', error);
      if (latestSearchRef.current === currentRequest) {
        dispatch(setQuestions([]));
        setHasNextPage(false);
      }
    } finally {
      if (latestSearchRef.current === currentRequest) {
        setIsLoading(false);
      }
    }
  }, [dispatch, location.pathname, navigate]);

  // Escuchar evento para resetear a modo lazy
  useEffect(() => {
    const handleResetToLazy = () => {
      callback({});
    };

    window.addEventListener('resetToLazyMode', handleResetToLazy);
    return () => window.removeEventListener('resetToLazyMode', handleResetToLazy);
  }, [callback]);

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const queryParams = (location.state as Record<string, string>) || {};
        setSearchParams(queryParams);
        setCurrentOffset(0);
        setHasNextPage(true);
        
        const initialParams = {
          ...queryParams,
          limit: INITIAL_LOAD_SIZE.toString(),
          offset: '0',
        };
        
        const { data } = await AdminAPI.getQuestions(initialParams);
        
        if (Array.isArray(data)) {
          dispatch(setQuestions(data as Question[]));
          setCurrentOffset(data.length);
          setHasNextPage(data.length === INITIAL_LOAD_SIZE);
        } else {
          const newQuestions = data.questions as Question[];
          dispatch(setQuestions(newQuestions));
          setCurrentOffset(newQuestions.length);
          setHasNextPage(newQuestions.length === INITIAL_LOAD_SIZE && newQuestions.length < (data.total || 0));
          if (data.total !== undefined) {
            setTotalQuestions(data.total);
          }
        }
      } catch (error) {
        console.error('Error al cargar preguntas:', error);
        dispatch(setQuestions([]));
        setHasNextPage(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dispatch, location.state]);

  return {
    questions,
    isLoading,
    isLoadingMore,
    hasNextPage,
    totalQuestions,
    isSearchMode,
    deleteQuestion,
    callback,
    searchParams,
    loadMoreQuestions,
  };
}
