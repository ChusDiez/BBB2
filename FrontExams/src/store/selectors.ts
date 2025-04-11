import { createDraftSafeSelector } from '@reduxjs/toolkit';
import { RootState } from './store';

const getState = (state: RootState) => state.widget;

export const getExamStats = createDraftSafeSelector(
  getState,
  (widget) => widget.examStats,
);

export const getCategories = createDraftSafeSelector(
  getState,
  (widget) => widget.categories,
);

export const getQuestionStats = createDraftSafeSelector(
  getState,
  (widget) => widget.questionStats,
);

export const getHistoric = createDraftSafeSelector(
  getState,
  (widget) => widget.historic,
);

export const getQuestions = createDraftSafeSelector(
  getState,
  (widget) => widget.questions,
);
