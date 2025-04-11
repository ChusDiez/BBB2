import Historic from '../models/historicExams.model.js';

class HistoricService {
  async addRecord(name, questions, examType, type) {
    if (questions.length === 0) {
      return '#';
    }
    const questionIDs = questions.map(({ id }) => id);
    const data = await Historic.create({
      name,
      questions: questionIDs,
      amount: questions.length,
      category: examType,
      type,
    });

    return data.idExam;
  }

  async getAllRecords() {
    const data = await Historic.findAll();
    return data.reverse();
  }

  async getRecordById(idExam) {
    const result = await Historic.findOne({
      where: {
        idExam,
      },
    });
    return result;
  }

  async getQuestionsFromHistoric(idMap) {
    const records = await Promise.allSettled(idMap.map(
      (id) => this.getRecordById(Number(id)),
    ));
    const questions = [];
    records.forEach(
      ({ status, value }) => status === 'fulfilled' && questions.push(...value.questions),
    );
    return questions;
  }

  async removeRecord(idExam) {
    const rowsRemoved = await Historic.destroy({
      where: {
        idExam,
      },
    });
    return rowsRemoved > 0;
  }
}

export default HistoricService;