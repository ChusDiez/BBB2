import { Question } from '../store/slice';
import { AdminClient } from './configs/axiosConfig';

const AdminAPI = {
  getQuestions(queryParams: Record<string, string>) {
    return AdminClient.get('', {
      params: {
        ...queryParams,
      },
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(question: Omit<Record<string, any>, 'id'>) {
    return AdminClient.post('add', question);
  },
  update(question: Question) {
    return AdminClient.put('update', {
      question,
    });
  },
  delete(id: number) {
    return AdminClient.post('delete', {
      id,
    });
  },
};

export default AdminAPI;
