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
    block: 1,              // ✅ CORREGIDO: Valor por defecto válido
    topic: 1,              // ✅ CORREGIDO: Valor por defecto válido
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
    && !!newQuestion.correctAnswer
    && newQuestion.block >= 1 && newQuestion.block <= 3    // ✅ AÑADIDO: Validación de block
    && newQuestion.topic >= 1 && newQuestion.topic <= 45,  // ✅ AÑADIDO: Validación de topic
    [newQuestion.correctAnswer,
      newQuestion.optionA,
      newQuestion.optionB,
      newQuestion.optionC,
      newQuestion.question,
      newQuestion.block,      // ✅ AÑADIDO: Dependencia
      newQuestion.topic],     // ✅ AÑADIDO: Dependencia
  );

  const setProperty = (propertyKey: string, value: string) => {
    setNewQuestion((prev: Question | any) => ({
      ...prev,
      [propertyKey]: propertyKey === 'block' || propertyKey === 'topic' 
        ? parseInt(value) || 1  // ✅ CORREGIDO: Convertir a número
        : value,
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
