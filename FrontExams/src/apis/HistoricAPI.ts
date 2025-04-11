import { HistoricClient } from './configs/axiosConfig';

const HistoricAPI = {
  getAll() {
    return HistoricClient.get('');
  },
  removeRecord(id: number) {
    return HistoricClient.post('delete', { id });
  },
};

export default HistoricAPI;
