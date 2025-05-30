// FrontExams/src/hooks/useQuestions.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getQuestions } from '../store/selectors';
import { Question, setQuestions } from '../store/slice';
import AdminAPI from '../apis/AdminAPI';

export default function useQuestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const questions = useAppSelector(getQuestions);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const deleteQuestion = useCallback(async (id: number) => {
    try {
      const { data } = await AdminAPI.delete(id);
      dispatch(setQuestions(data.questions as Question[]));
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
    }
  }, [dispatch]);

  const callback = useCallback(async (queryParams: Record<string, string>) => {
    try {
      setIsLoading(true);
      setSearchParams(queryParams);
      
      if (!location.pathname.includes('admin')) {
        navigate('/admin', { replace: true });
      }
      
      const { data } = await AdminAPI.getQuestions(queryParams);
      dispatch(setQuestions(data as Question[]));
    } catch (error) {
      console.error('Error al buscar preguntas:', error);
      dispatch(setQuestions([]));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, location.pathname, navigate]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        // Usar el state de navegación si existe, sino usar parámetros vacíos
        const queryParams = (location.state as Record<string, string>) || {};
        setSearchParams(queryParams);
        
        const { data } = await AdminAPI.getQuestions(queryParams);
        dispatch(setQuestions(data as Question[]));
      } catch (error) {
        console.error('Error al cargar preguntas:', error);
        dispatch(setQuestions([]));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dispatch, location.state]);

  return {
    questions,
    isLoading,
    deleteQuestion,
    callback,
    searchParams,
  };
}