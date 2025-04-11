import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Exam = Question[];

export type Question = {
  id: number;
  block: number;
  topic: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctAnswer: string;
  feedback: string;
};

export type Category = {
  block: string;
  name: string;
  slug: string;
  topic: number
};

export type Historic = ExamRecord[];

export type ExamRecord = {
  idExam: number;
  name: string;
  questions: string[];
  amount: number;
  category: string;
  type: string;
  createdAt: string;
};

export type QuestionStats = {
  countAll: number | null;
  countPerBlock: Array<Record<string, string>> | null;
  countPerTopic: Array<Record<string, string>> | null;
  countHasFeedback: number | null;
};

export type ExamStats = {
  countAllExams: number | null;
  lastGenerated: Record<string, string> | null;
  examsByGroup: Array<Record<string, string>> | null;
};

export type WidgetState = {
  questionStats?: QuestionStats;
  examStats?: ExamStats;
  questions: Array<Question>;
  categories: Array<Category>;
  historic: Historic;
};

const initialState = {
  categories: [],
  questions: [],
  historic: [],
} as WidgetState;

const slice = createSlice({
  name: 'widget',
  initialState,
  reducers: {
    setCategories(state, action: PayloadAction<Array<Category>>) {
      state.categories = action.payload;
    },
    setQuestionStats(state, action: PayloadAction<QuestionStats>) {
      state.questionStats = action.payload;
    },
    setExamStats(state, action: PayloadAction<ExamStats>) {
      state.examStats = action.payload;
    },
    setHistoric(state, action: PayloadAction<Historic>) {
      state.historic = action.payload;
    },
    setQuestions(state, action: PayloadAction<Array<Question>>) {
      state.questions = action.payload;
    },
  },
});

export const {
  setCategories,
  setQuestionStats,
  setExamStats,
  setHistoric,
  setQuestions,
} = slice.actions;
export default slice.reducer;
