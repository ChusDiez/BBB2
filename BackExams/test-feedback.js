// Test para debugging del problema de feedbacks
import { Op } from 'sequelize';
import startTables from './utils/initializeDatabase.js';
import Questions from './models/questions.model.js';
import ExamService from './services/exam.services.js';

const examService = new ExamService();

async function testFeedbackProcessing() {
  console.log('🔍 DEBUGGING: Procesamiento de feedback\n');
  
  await startTables();
  
  // Obtener una pregunta con feedback HTML
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
  
  console.log(`📋 Pregunta ID: ${question.id}`);
  console.log(`📋 Longitud original: ${question.feedback.length} chars`);
  console.log('📋 Feedback original (primeros 300 chars):');
  console.log(question.feedback.substring(0, 300) + '...\n');
  
  // Test 1: ¿Qué detecta la condición includes('<')?
  const hasHtml = question.feedback.includes('<');
  console.log(`🔍 Test 1 - ¿Incluye '<'? ${hasHtml}`);
  
  // Test 2: ¿Qué devuelve cleanHtmlForWord?
  console.log('🔍 Test 2 - cleanHtmlForWord:');
  const cleanedHtml = examService.cleanHtmlForWord(question.feedback);
  console.log(`   Longitud: ${cleanedHtml?.length || 0} chars`);
  console.log('   Resultado (primeros 300 chars):');
  console.log((cleanedHtml || 'NULL').substring(0, 300) + '...\n');
  
  // Test 3: ¿Qué devuelve sanitizeText con preserveLineBreaks=true?
  console.log('🔍 Test 3 - sanitizeText(preserveLineBreaks=true):');
  const sanitizedText = examService.sanitizeText(question.feedback, true);
  console.log(`   Longitud: ${sanitizedText?.length || 0} chars`);
  console.log('   Resultado (primeros 300 chars):');
  console.log((sanitizedText || 'NULL').substring(0, 300) + '...\n');
  
  // Test 4: Simular el procesamiento real en createDocExam
  console.log('🔍 Test 4 - Lógica real de createDocExam:');
  const processedFeedback = question.feedback.includes('<') ? 
    examService.cleanHtmlForWord(question.feedback) : 
    examService.sanitizeText(question.feedback, true);
    
  console.log(`   Se usó: ${question.feedback.includes('<') ? 'cleanHtmlForWord' : 'sanitizeText'}`);
  console.log(`   Longitud final: ${processedFeedback?.length || 0} chars`);
  console.log('   Resultado final (primeros 300 chars):');
  console.log((processedFeedback || 'NULL').substring(0, 300) + '...\n');
  
  // Test 5: Verificar si hay saltos de línea problemáticos
  const lineBreakCount = (processedFeedback || '').match(/\n/g)?.length || 0;
  const hasArbitraryBreaks = /\w\n\w/g.test(processedFeedback || '');
  console.log(`🔍 Test 5 - Análisis de saltos de línea:`);
  console.log(`   Total saltos de línea: ${lineBreakCount}`);
  console.log(`   ¿Tiene saltos arbitrarios? ${hasArbitraryBreaks}`);
  
  process.exit(0);
}

testFeedbackProcessing();