import Temporary from '../models/temporaryTable.model.js';

class ExcludeService {
  async addToTemporaryTable(questions) {
    console.log('Adding questions temporary table');
    const preparedQuestions = questions.map((question) => ({ questionId: question }));
    console.log('Prepared statement questions table', preparedQuestions);
    await Temporary.bulkCreate(preparedQuestions);
  }

  async clearTemporaryTable() {
    await Temporary.destroy({
      truncate: true,
    });
    console.log('Clearing temporary table');
  }
}

export default ExcludeService;
