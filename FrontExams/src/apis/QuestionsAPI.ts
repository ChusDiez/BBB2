import { QuestionsClient } from './configs/axiosConfig';

const QuestionsAPI = {
  getAll() {
    return QuestionsClient.get('');
  },

  generateByTopic(
    amount: number,
    topic: number,
    name: string,
    excludedExams: Array<string>,
  ) {
    return QuestionsClient.get('topic', {
      params: {
        amount,
        topic,
        name,
        excludedExams,
      },
    });
  },

  generateByBlock(
    amount: number,
    block: number,
    name: string,
    excludedExams: Array<string>,
  ) {
    return QuestionsClient.get('block', {
      params: {
        amount,
        block,
        name,
        excludedExams,
      },
    });
  },

  generateMultiple(
    amount: number,
    topics: Array<number>,
    name: string,
    excludedExams: Array<string>,
    onlyHasFeedback: boolean,
    randomOrder: boolean,
  ) {
    return QuestionsClient.get('multiple', {
      params: {
        amount,
        topics,
        name,
        excludedExams,
        withFeedback: onlyHasFeedback,
        randomized: randomOrder,
      },
    });
  },
};

export default QuestionsAPI;
