/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useCallback, useMemo, useState } from 'react';
import AdminAPI from '../apis/AdminAPI';
import { Question, setQuestions } from '../store/slice';
import { useModalContext } from '../context/ModalContext';
import { useAppDispatch } from '../store/hooks';

export default function useAdmin(question: Question) {
  const modal = useModalContext();
  const dispatch = useAppDispatch();
  const [newQuestion, setNewQuestion] = useState(question || {
    block: 0,
    topic: 0,
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    correctAnswer: '',
    feedback: undefined,
  });

  const isValidQuestion = useMemo<boolean>(
    () => !!newQuestion.question
    && !!newQuestion.optionA
    && !!newQuestion.optionB
    && !!newQuestion.optionC
    && !!newQuestion.correctAnswer,
    [newQuestion.correctAnswer,
      newQuestion.optionA,
      newQuestion.optionB,
      newQuestion.optionC,
      newQuestion.question],
  );

  const setProperty = (propertyKey: string, value: string) => {
    setNewQuestion((prev: Question | any) => ({
      ...prev,
      [propertyKey]: value,
    }));
  };

  const addQuestion = useCallback(async () => {
    try {
      if (Object.keys(question).length) {
        const { data } = await AdminAPI.update(newQuestion);
        dispatch(setQuestions(data.questions as Question[]));
      } else if (isValidQuestion) {
        await AdminAPI.add(newQuestion as unknown as Omit<Question, 'id'>);
      }
    } catch (e) {
      console.error(e);
    } finally {
      modal.closeModal();
    }
  }, [question, isValidQuestion, newQuestion, dispatch, modal]);

  return {
    isValidQuestion,
    addQuestion,
    newQuestion,
    setProperty,
  };
}
