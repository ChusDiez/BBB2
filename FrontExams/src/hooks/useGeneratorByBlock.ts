/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionsAPI from '../apis/QuestionsAPI';

export default function useGeneratorByBlock() {
  const navigate = useNavigate();

  const [block, setBlock] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [examName, setExamName] = useState<string | null>();
  const excludedExams = useRef(new Set());

  const handleExcludeExam = useCallback((id: number) => {
    if (excludedExams.current.has(id)) {
      excludedExams.current.delete(id);
    } else {
      excludedExams.current.add(id);
    }
  }, [excludedExams]);

  const generateExam = useCallback(async () => {
    if (amount && block && examName) {
      const { data } = await QuestionsAPI.generateByBlock(
        amount,
        block,
        examName,
        [...excludedExams.current.values()] as Array<string>,
      );
      navigate('/result', { state: { data, amount } });
    }
  }, [amount, block, examName, navigate]);

  return {
    generateExam,
    block,
    setBlock,
    amount,
    setAmount,
    excludedExams,
    handleExcludeExam,
    examName,
    setExamName,
  };
}
