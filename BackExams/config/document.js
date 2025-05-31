/* eslint-disable default-param-last */
/* eslint-disable max-len */
import docx from 'docx';
import fs from 'fs';
import { htmlToDocxElements } from '../utils/htmlToDocx.js';

// Extraer componentes de docx
const {
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
} = docx;

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

/**
 * Detecta si un texto contiene HTML
 * @param {string} text - El texto a verificar
 * @returns {boolean} - True si contiene HTML, false si no
 */
function containsHtml(text) {
  if (!text) return false;
  // Buscar tags HTML comunes
  const htmlRegex = /<(strong|b|em|i|u|mark|span|br|p|ul|ol|li|blockquote|code)[^>]*>|<\/(strong|b|em|i|u|mark|span|p|ul|ol|li|blockquote|code)>/i;
  return htmlRegex.test(text);
}

/**
 * Crea una fila de feedback que puede ser HTML o texto plano
 * @param {string} feedback - El feedback a mostrar
 * @returns {TableRow} - La fila de la tabla
 */
function createFeedbackRow(feedback) {
  if (!feedback) {
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: 'Retroalimentación: Sin información adicional' })],
        }),
      ],
    });
  }

  // Si contiene HTML, usar el convertidor
  if (containsHtml(feedback)) {
    const htmlElements = htmlToDocxElements(feedback);
    
    // Si el convertidor no devuelve elementos, usar texto plano como fallback
    if (htmlElements.length === 0) {
      return new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Retroalimentación: ', bold: true }),
                  new TextRun({ text: feedback.replace(/<[^>]*>/g, '') })
                ],
              }),
            ],
          }),
        ],
      });
    }

    // Crear la celda con el contenido HTML convertido
    const feedbackElements = [
      new Paragraph({
        children: [new TextRun({ text: 'Retroalimentación:', bold: true })],
        spacing: { after: 120 }
      }),
      ...htmlElements
    ];

    return new TableRow({
      children: [
        new TableCell({
          children: feedbackElements,
          margins: {
            top: 200,
            bottom: 200,
            left: 200,
            right: 200,
          },
        }),
      ],
    });
  } else {
    // Texto plano - comportamiento original
    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Retroalimentación: ', bold: true }),
                new TextRun({ text: feedback })
              ],
            }),
          ],
        }),
      ],
    });
  }
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
    
    if (hasFeedback && feedback) {
      const correctAnswerText = createCorrectAnswerRow(correctAnswer);
      const feedbackRow = createFeedbackRow(feedback);
      rows.push(correctAnswerText, feedbackRow, emptyRow);
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
/**
 * Crea una tabla compacta con las respuestas correctas
 * @param {Array} questions - Array de preguntas
 * @returns {Table} - Tabla con respuestas en 4 columnas
 */
function createAnswerKeyTable(questions) {
  const rows = [];
  const columnsPerRow = 4;
  
  // Crear encabezado
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ 
          children: [new TextRun({ text: 'RESPUESTAS CORRECTAS', bold: true })],
          alignment: AlignmentType.CENTER 
        })],
        columnSpan: columnsPerRow,
        shading: {
          fill: 'E8F4FD'
        }
      })
    ]
  });
  rows.push(headerRow);
  
  // Crear filas con respuestas (4 columnas por fila)
  for (let i = 0; i < questions.length; i += columnsPerRow) {
    const cells = [];
    
    for (let j = 0; j < columnsPerRow; j++) {
      const questionIndex = i + j;
      if (questionIndex < questions.length) {
        const questionNum = questionIndex + 1;
        const answer = questions[questionIndex].correctAnswer;
        
        cells.push(new TableCell({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${questionNum}. `, bold: true }),
              new TextRun({ text: answer, bold: true, color: '0066CC' })
            ],
            alignment: AlignmentType.CENTER
          })],
          width: {
            size: 25,
            type: WidthType.PERCENTAGE,
          },
          margins: {
            top: 100,
            bottom: 100,
            left: 50,
            right: 50,
          }
        }));
      } else {
        // Celda vacía si no hay más preguntas
        cells.push(new TableCell({
          children: [new Paragraph({ text: '' })],
          width: {
            size: 25,
            type: WidthType.PERCENTAGE,
          }
        }));
      }
    }
    
    rows.push(new TableRow({ children: cells }));
  }
  
  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { size: 3, color: '0066CC' },
      bottom: { size: 3, color: '0066CC' },
      left: { size: 3, color: '0066CC' },
      right: { size: 3, color: '0066CC' },
      insideHorizontal: { size: 1, color: 'CCCCCC' },
      insideVertical: { size: 1, color: 'CCCCCC' },
    },
  });
}

function createDoc(children, answerKeyTable) {
  const sections = [
    addImages(),
    children,
  ];
  
  // Añadir tabla de respuestas al final si existe
  if (answerKeyTable) {
    sections.push(
      new Paragraph({ text: '', spacing: { before: 400 } }), // Espacio antes de la tabla
      answerKeyTable
    );
  }
  
  return new Document({
    creator: 'Chus',
    title: 'Examen',
    numbering: {
      config: [
        numberingConfig,
      ],
    },
    sections: [{
      children: sections,
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
  const answerKeyTable = createAnswerKeyTable(questions);
  const doc = createDoc(table, answerKeyTable);
  return doc;
}

export default createDocument;