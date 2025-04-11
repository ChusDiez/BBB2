import { DashboardClient } from './configs/axiosConfig';

const DashboardAPI = {
  getQuestionsStats() {
    return DashboardClient.get('questions');
  },
  getExamStats() {
    return DashboardClient.get('exams');
  },
};

export default DashboardAPI;
