import csv from 'csv-parser';
import fs from 'fs';
import Questions from '../models/questions.model.js';
import mapHeader from '../config/headers.js';
import QuestionService from './questions.services.js';
import HistoricService from './historic.services.js';

const questionsService = new QuestionService();
const historicService = new HistoricService();

class UploadService {
  async transformData(path) {
    const jsonData = [];
    return new Promise((resolve, reject) => {
      fs.createReadStream(path)
        .pipe(csv({
          mapHeaders: ({ header }) => mapHeader[header],
          mapValues: ({ value }) => (value === '' ? null : value),
          separator: ';',
        }))
        .on('data', (data) => jsonData.push(data))
        .on('end', () => {
          resolve(jsonData);
        })
        .on('error', (e) => {
          reject(e);
        });
    });
  }

  async insertCSV(file) {
    try {
      const csvData = await this.transformData(file.path);
      await Questions.bulkCreate(csvData);
      const questions = await questionsService.getLastQuestions(csvData.length);
      await historicService.addRecord(`Carga Auto. ${file.originalFilename}`, questions, 'Multiple', '');

      return {
        message: `Data loaded ${file.originalFilename} successfully`,
        fileName: file.originalFilename,
        rowsAmount: csvData.length,
      };
    } catch (e) {
      // eslint-disable-next-line no-throw-literal
      throw {
        ...e,
        fileName: file.originalFilename,
      };
    }
  }
}

export default UploadService;
