/* eslint-disable default-param-last */
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import fs from 'fs';

const numberingConfig = {
  reference: 'numbering',
  levels: [
    {
      level: 0,
      format: 'decimal',
      text: '%1.',
    },
    {
      level: 1,
      format: 'lowerLetter',
      text: '%2)',
    },
  ],
};

function createNumberedRow(property = '', level) {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            text: property,
            numbering: {
              reference: 'numbering',
              level,
            },
            ...level === 0 && {
              heading: HeadingLevel.HEADING_6,
            },
            alignment: AlignmentType.JUSTIFIED,
            indent: {
              left: '0.64cm',
            },
          }),
        ],
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
      }),
    ],
  });
}

function createCorrectAnswerRow(correctAnswer) {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Respuesta correcta: ',
              }),
              new TextRun({
                text: correctAnswer,
                bold: true,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createBaseRow(property) {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            text: property,
          }),
        ],
      }),
    ],
  });
}

function createEmptyRow() {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({})],
      }),
    ],
  });
}

function addResource(resourceURL, width, height) {
  const path = `./config/images/${resourceURL}`;
  return new ImageRun({
    data: fs.readFileSync(path),
    transformation: {
      width,
      height,
    },
  });
}

function addImages() {
  return new Paragraph({
    children: [
      addResource('Header1.png', 600, 65),
      new TextRun({ break: 3 }),
      addResource('Header2.png', 500, 130),
      new TextRun({ break: 7 }),
      addResource('Header3.png', 550, 280),
      new TextRun({ break: 7 }),
      addResource('Header4.png', 598, 250),
      new TextRun({ break: 7 }),
    ],
  });
}

function createRows(questions, hasFeedback) {
  const rows = [];
  questions.forEach(({
    question,
    optionA,
    optionB,
    optionC,
    correctAnswer,
    feedback,
  }) => {
    const title = createNumberedRow(question, 0);
    const rowOptionA = createNumberedRow(optionA, 1);
    const rowOptionB = createNumberedRow(optionB, 1);
    const rowOptionC = createNumberedRow(optionC, 1);
    const emptyRow = createEmptyRow();
    rows.push(title, rowOptionA, rowOptionB, rowOptionC, emptyRow);
    if (hasFeedback) {
      const correctAnswerText = createCorrectAnswerRow(correctAnswer);
      const feedbackText = createBaseRow(`Retroalimentación: ${feedback ?? ''}`);
      rows.push(correctAnswerText, feedbackText, emptyRow);
    }
  });
  return rows;
}

function createTable(rows) {
  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { size: 0 },
      bottom: { size: 0 },
      left: { size: 0 },
      right: { size: 0 },
      insideHorizontal: { style: 0 },
      insideVertical: { style: 0 },
    },
  });
}

function createDoc(children) {
  return new Document({
    creator: 'Chus',
    title: 'Examen',
    numbering: {
      config: [
        numberingConfig,
      ],
    },
    sections: [{
      children: [
        addImages(),
        children,
      ],
    }],
    styles: {
      default: {
        heading6: {
          run: {
            bold: true,
            size: '12pt',
          },
        },
        document: {
          run: {
            font: 'Gill Sans MT',
            size: '12pt',
          },
        },
      },
    },
  });
}

function createDocument(questions, hasFeedback) {
  const rows = createRows(questions, hasFeedback);
  const table = createTable(rows);
  const doc = createDoc(table);
  return doc;
}

export default createDocument;
