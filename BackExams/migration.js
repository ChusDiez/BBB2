import fs from 'fs/promises';

const file = await fs.readFile('./question.json', { encoding: 'utf-8' });

const questions = JSON.parse(file);
const decode = (text) => decodeURIComponent(text);

const newQuestions = questions.map((question) => {
  const decodeQuestion = decode(question.question);
  const decodeOptionA = decode(question.optionA);
  const decodeOptionB = decode(question.optionB);
  const decodeOptionC = decode(question.optionC);
  const hasFeedback = question.feedback.trim().length > 0;

  const newTopic = question.topic >= 36 ? question.topic + 1 : question.topic;
  return {
    id: question.idQuestion,
    question: decodeQuestion,
    optionA: decodeOptionA,
    optionB: decodeOptionB,
    optionC: decodeOptionC,
    feedback: hasFeedback ? decode(question.feedback) : null,
    block: question.block,
    topic: newTopic,
    correctAnswer: question.correctAnswer,
    createdAt: '2023-07-12 19:41:19',
    updatedAt: '2023-07-12 19:41:19',
  };
});

await fs.writeFile('./migratedQuestions.json', JSON.stringify(newQuestions), { flag: 'w+' });

const file2 = await fs.readFile('./historic.json', { encoding: 'utf-8' });
const historic = JSON.parse(file2);

const newHistoric = historic.map((record) => ({
  idExam: record.idExam,
  name: record.name,
  questions: record.questions.join(', '),
  amount: record.amountQuestions,
  category: record.examType,
  type: record.type,
  createdAt: record.dateCreated,
  updatedAt: record.dateCreated,
}));

await fs.writeFile('./migratedHistoric.json', JSON.stringify(newHistoric), { flag: 'w+' });
