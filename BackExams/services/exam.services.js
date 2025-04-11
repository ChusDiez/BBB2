import fsPromise from 'fs/promises';
import fs from 'fs';
import randomstring from 'randomstring';
import { Packer } from 'docx';
import createDocument from '../config/document.js';

const EXAMS_PATH = './exams';

class ExamService {
  constructor() {
    if (!fs.existsSync(EXAMS_PATH)) {
      fs.mkdir(EXAMS_PATH, (e) => {
        if (e) console.log('Folder not created');
        else console.log('Exams folder created for first time');
      });
    }
  }

  async createCsvExam(questions) {
    const path = this.createPath('csv');
    const results = questions.map(({
      question,
      optionA,
      optionB,
      optionC,
      correctAnswer,
      feedback,
    }) => (
      `*;${question};
;${optionA};${correctAnswer === 'A' ? 'x' : ''}
;${optionB};${correctAnswer === 'B' ? 'x' : ''}
;${optionC};${correctAnswer === 'C' ? 'x' : ''}
@;${feedback}; \n`
    )).join('');
    await fsPromise.writeFile(path, results);

    return path;
  }

  async createDocExam(questions, hasFeedback) {
    const exam = createDocument(questions, hasFeedback);
    const path = this.createPath('docx');
    const buffer = await Packer.toBuffer(exam);
    await fsPromise.writeFile(path, buffer);
    return path;
  }

  async removeExam(path) {
    await fsPromise.unlink(path);
  }

  createPath(type) {
    const hash = randomstring.generate(6);
    const path = `${EXAMS_PATH}/${hash}.${type}`;
    return path;
  }
}

export default ExamService;
