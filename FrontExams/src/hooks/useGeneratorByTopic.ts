/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '../store/slice';
import QuestionsAPI from '../apis/QuestionsAPI';

// Tipos para el nivel de dificultad
type DifficultyLevel = {
  value: string;
  label: string;
  percentage: string;
  description: string;
};

export default function useGeneratorByTopic() {
  const navigate = useNavigate();

  const [option, setOption] = useState<Category | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [examName, setExamName] = useState<string | null>();
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const excludedExams = useRef(new Set());

  const handleExcludeExam = useCallback((id: number) => {
    if (excludedExams.current.has(id)) {
      excludedExams.current.delete(id);
    } else {
      excludedExams.current.add(id);
    }
  }, [excludedExams]);

  const generateExam = useCallback(async () => {
    if (amount && option && examName) {
      const { data } = await QuestionsAPI.generateByTopic(
        amount,
        option?.topic,
        examName,
        [...excludedExams.current.values()] as Array<string>,
        difficulty?.value // Pasar el nivel de dificultad
      );
      navigate('/result', { state: { data, amount } });
    }
  }, [amount, examName, navigate, option, difficulty]);

  return {
    generateExam,
    option,
    setOption,
    amount,
    setAmount,
    excludedExams,
    handleExcludeExam,
    examName,
    setExamName,
    difficulty,
    setDifficulty,
  };
}
