// Debug paso a paso del método cleanHtmlForWord
import { Op } from 'sequelize';
import startTables from './utils/initializeDatabase.js';
import Questions from './models/questions.model.js';
import ExamService from './services/exam.services.js';
import he from 'he';

const examService = new ExamService();

async function stepByStepDebug() {
  await startTables();
  
  const question = await Questions.findOne({
    where: { 
      feedback: { 
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.like]: '%<div%' }
        ]
      } 
    }
  });
  
  if (!question) {
    console.log('❌ No se encontró pregunta con feedback HTML');
    return;
  }
  
  const original = question.feedback;
  console.log('🔍 Step-by-step cleanHtmlForWord debugging');
  console.log(`Original length: ${original.length}`);
  console.log('Original (first 200 chars):');
  console.log(original.substring(0, 200) + '...');
  console.log('');
  
  let cleaned = original;
  
  // Step 1: he.decode
  console.log('Step 1: he.decode');
  cleaned = he.decode(cleaned, {
    isAttributeValue: false,
    strict: false
  });
  console.log(`Length: ${cleaned.length}`);
  console.log('Result (first 200 chars):');
  console.log(cleaned.substring(0, 200) + '...');
  console.log('');
  
  // Step 2: fixMalformedHtml  
  console.log('Step 2: fixMalformedHtml');
  cleaned = examService.fixMalformedHtml(cleaned);
  console.log(`Length: ${cleaned.length}`);
  console.log('Result (first 200 chars):');
  console.log(cleaned.substring(0, 200) + '...');
  console.log('');
  
  // Step 3: Character cleanup
  console.log('Step 3: Character cleanup');
  cleaned = cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2028\u2029]/g, ' ')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  console.log(`Length: ${cleaned.length}`);
  console.log('Result (first 200 chars):');
  console.log(cleaned.substring(0, 200) + '...');
  console.log('');
  
  // Step 4: Attribute regex
  console.log('Step 4: Attribute regex');
  cleaned = cleaned.replace(/(\w+)="([^"]*)"/g, (match, attr, value) => {
    console.log(`  Processing attr="${attr}", value="${value.substring(0, 50)}..."`);
    const cleanValue = value
      .replace(/[""«»„"]/g, '"')
      .replace(/[''‹›‚‛]/g, "'")
      .replace(/[–—]/g, '-');
    const result = `${attr}="${cleanValue}"`;
    console.log(`  Result: ${result.substring(0, 100)}...`);
    return result;
  });
  console.log(`Length: ${cleaned.length}`);
  console.log('Result (first 200 chars):');
  console.log(cleaned.substring(0, 200) + '...');
  
  // Check if problem appeared here
  if (cleaned.includes('6px"') && !original.includes('6px"')) {
    console.log('🚨 PROBLEM FOUND at attribute regex step!');
  }
  console.log('');
  
  // Continue with full cleanHtmlForWord to compare
  console.log('Full cleanHtmlForWord result:');
  const fullResult = examService.cleanHtmlForWord(original);
  console.log(`Length: ${fullResult?.length || 0}`);
  console.log('Result (first 200 chars):');
  console.log((fullResult || 'NULL').substring(0, 200) + '...');
  
  process.exit(0);
}

stepByStepDebug();