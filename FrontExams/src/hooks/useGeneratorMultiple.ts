/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { MultiValue } from 'react-select';
import { Category } from '../store/slice';
import QuestionsAPI from '../apis/QuestionsAPI';
import { useAppSelector } from '../store/hooks';
import { getCategories } from '../store/selectors';

type Properties = {
  amount: number | null;
  name: string | undefined;
  options: MultiValue<Category> | null;
  randomOrder: boolean;
  onlyHasFeedback: boolean;
  allTopics: false;
};

export default function useGeneratorMultiple() {
  const navigate = useNavigate();
  const categories = useAppSelector(getCategories);

  const [examProperties, setExamProperties] = useState<Properties>({
    amount: null,
    name: undefined,
    options: null,
    randomOrder: false,
    onlyHasFeedback: false,
    allTopics: false,
  });

  const setProperty = (propertyKey: any, value: any) => {
    setExamProperties((prev) => ({
      ...prev,
      [propertyKey]: value,
    }));
  };

  useEffect(() => {
    setProperty('options', examProperties.allTopics ? categories : []);
    return () => {};
  }, [categories, examProperties.allTopics]);

  const excludedExams = useRef(new Set());

  const handleExcludeExam = useCallback((id: number) => {
    if (excludedExams.current.has(id)) {
      excludedExams.current.delete(id);
    } else {
      excludedExams.current.add(id);
    }
  }, [excludedExams]);

  const generateExam = useCallback(async () => {
    const {
      amount,
      options,
      name,
      onlyHasFeedback,
      randomOrder,
    } = examProperties;
    if (amount && options?.length && name) {
      const { data } = await QuestionsAPI.generateMultiple(
        amount,
        options.map((opt) => opt.topic),
        name,
        [...excludedExams.current.values()] as Array<string>,
        onlyHasFeedback,
        randomOrder,

      );
      navigate('/result', { state: { data, amount } });
    }
  }, [examProperties, navigate]);

  return {
    generateExam,
    examProperties,
    setProperty,
    handleExcludeExam,
  };
}
