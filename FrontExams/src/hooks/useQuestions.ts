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
  const questions = useAppSelector(getQuestions);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const deleteQuestion = useCallback(async (id: number) => {
    const { data } = await AdminAPI.delete(id);
    dispatch(setQuestions(data.questions as Question[]));
  }, [dispatch]);

  const callback = useCallback(async (queryParams: Record<string, string>) => {
    try {
      setIsLoading(true);
      if (!location.pathname.includes('admin')) {
        navigate('/admin', { replace: true });
      }
      const { data } = await AdminAPI.getQuestions(queryParams);
      dispatch(setQuestions(data as Question[]));
      setIsLoading(false);
    } catch (error) {
      console.log(error);
    }
  }, [dispatch, location.pathname, navigate]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const queryParams = location.state as Record<string, string>;
        const { data } = await AdminAPI.getQuestions(queryParams);
        dispatch(setQuestions(data as Question[]));
        setIsLoading(false);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [dispatch, location.state]);

  return {
    questions,
    isLoading,
    deleteQuestion,
    callback,
  };
}
