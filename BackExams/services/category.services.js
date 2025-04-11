import Categories from '../models/categories.model.js';

class CategoryService {
  async getAll() {
    const categories = await Categories.findAll();
    return categories;
  }

  async getByBlock(block) {
    const blockCategories = await Categories.findAll({
      where: {
        slug: block,
      },
    });
    return blockCategories;
  }

  async getByTopic(inputTopic) {
    const topicCategories = await Categories.findAll({
      where: {
        topic: Number(inputTopic),
      },
    });
    return topicCategories;
  }
}

export default CategoryService;
