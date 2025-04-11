import { CategoriesClient } from './configs/axiosConfig';

const CategoriesAPI = {
  getAll() {
    return CategoriesClient.get('');
  },
  filterByBlock(block: string) {
    return CategoriesClient.get('/filter', {
      params: block,
    });
  },
  filterByTopic(topic: number) {
    return CategoriesClient.get('/filter', {
      params: topic,
    });
  },
};

export default CategoriesAPI;
