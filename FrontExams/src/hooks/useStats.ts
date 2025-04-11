/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import DashboardAPI from '../apis/DashboardAPI';
import { useAppSelector } from '../store/hooks';
import { getExamStats, getQuestionStats } from '../store/selectors';
import {
  ExamStats,
  QuestionStats,
  setExamStats,
  setQuestionStats,
} from '../store/slice';

export default function useStats() {
  const questionStats = useAppSelector(getQuestionStats);
  const examsStats = useAppSelector(getExamStats);
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      const { data: questions } = await DashboardAPI.getQuestionsStats();
      const { data: exams } = await DashboardAPI.getExamStats();
      dispatch(setExamStats(exams as ExamStats));
      dispatch(setQuestionStats(questions as QuestionStats));
    })();
  }, [dispatch]);

  return {
    questionStats,
    examsStats,
  };
}
