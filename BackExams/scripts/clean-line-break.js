// BackExams/scripts/clean-line-breaks.js
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function cleanLineBreaks() {
  console.log('🧹 Iniciando limpieza de saltos de línea en la base de datos...\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Obtener todas las preguntas
    const questions = await Questions.findAll();
    console.log(`📊 Total de preguntas a revisar: ${questions.length}\n`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Función para limpiar texto
    const cleanText = (text) => {
      if (!text) return null;
      
      let cleaned = String(text);
      
      // En feedback, mantener saltos simples
      if (text.length > 100) { // Asumimos que es feedback si es largo
        // Normalizar a saltos Unix
        cleaned = cleaned.replace(/\r\n/g, '\n');
        cleaned = cleaned.replace(/\r/g, '\n');
        // Máximo dos saltos consecutivos
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      } else {
        // En campos cortos, reemplazar saltos por espacios
        cleaned = cleaned.replace(/[\r\n]+/g, ' ');
      }
      
      // Limpiar espacios múltiples
      cleaned = cleaned.replace(/[ \t]+/g, ' ');
      cleaned = cleaned.trim();
      
      return cleaned;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalData = {
          question: question.question,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          feedback: question.feedback,
        };
        
        const cleanedData = {
          question: cleanText(question.question),
          optionA: cleanText(question.optionA),
          optionB: cleanText(question.optionB),
          optionC: cleanText(question.optionC),
          feedback: cleanText(question.feedback),
        };
        
        // Verificar si hubo cambios
        let hasChanges = false;
        for (const key in originalData) {
          if (originalData[key] !== cleanedData[key]) {
            hasChanges = true;
            break;
          }
        }
        
        if (hasChanges) {
          await question.update(cleanedData);
          updatedCount++;
          console.log(`✅ Pregunta ID ${question.id} actualizada`);
          
          // Mostrar ejemplo de cambio
          if (updatedCount === 1) {
            console.log('\n📝 Ejemplo de cambio:');
            console.log('   Antes:', originalData.question.substring(0, 50) + '...');
            console.log('   Después:', cleanedData.question.substring(0, 50) + '...\n');
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de limpieza:');
    console.log(`   ✅ Preguntas actualizadas: ${updatedCount}`);
    console.log(`   ⏭️  Preguntas sin cambios: ${questions.length - updatedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar limpieza
cleanLineBreaks();