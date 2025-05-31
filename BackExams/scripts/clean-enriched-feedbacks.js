// BackExams/scripts/clean-enriched-feedbacks.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function cleanEnrichedFeedbacks() {
  console.log('🧹 Iniciando limpieza de feedbacks enriquecidos...\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Obtener todas las preguntas con feedback
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.ne]: null
        }
      }
    });
    
    console.log(`📊 Total de preguntas con feedback: ${questions.length}\n`);
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    // Función para limpiar el feedback
    const cleanFeedback = (feedback) => {
      if (!feedback) return null;
      
      let cleaned = feedback;
      
      // Eliminar líneas que comienzan con "PREGUNTA:" seguido de cualquier texto hasta el final de línea
      cleaned = cleaned.replace(/^PREGUNTA:.*$/gm, '');
      
      // Eliminar líneas que comienzan con "RESPUESTA CORRECTA:" seguido de cualquier texto
      cleaned = cleaned.replace(/^RESPUESTA CORRECTA:.*$/gm, '');
      
      // Eliminar líneas que comienzan con "FEEDBACK ORIGINAL:" o "FEEDBACK:"
      cleaned = cleaned.replace(/^FEEDBACK\s*ORIGINAL\s*:.*$/gm, '');
      cleaned = cleaned.replace(/^FEEDBACK\s*:.*$/gm, '');
      
      // Eliminar líneas que contengan solo "PREGUNTA:" o variantes
      cleaned = cleaned.replace(/^PREGUNTA\s*:\s*$/gm, '');
      
      // Eliminar múltiples saltos de línea consecutivos que puedan haber quedado
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      
      // Eliminar saltos de línea al principio y final
      cleaned = cleaned.trim();
      
      // Si el feedback empieza con un salto de línea o <br>, eliminarlo
      cleaned = cleaned.replace(/^(<br\s*\/?>|\n)+/, '');
      
      return cleaned;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        const cleanedFeedback = cleanFeedback(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== cleanedFeedback) {
          await question.update({ feedback: cleanedFeedback });
          cleanedCount++;
          
          console.log(`✅ Pregunta ID ${question.id} limpiada`);
          
          // Mostrar ejemplo del primer cambio
          if (cleanedCount === 1) {
            console.log('\n📝 Ejemplo de limpieza:');
            console.log('   Antes (primeros 200 caracteres):');
            console.log('   ' + originalFeedback.substring(0, 200).replace(/\n/g, '\\n') + '...\n');
            console.log('   Después (primeros 200 caracteres):');
            console.log('   ' + cleanedFeedback.substring(0, 200).replace(/\n/g, '\\n') + '...\n');
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de limpieza:');
    console.log(`   ✅ Feedbacks limpiados: ${cleanedCount}`);
    console.log(`   ⏭️  Feedbacks sin cambios: ${questions.length - cleanedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    if (cleanedCount > 0) {
      console.log('\n💡 Los elementos no deseados han sido eliminados de los feedbacks.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar limpieza
cleanEnrichedFeedbacks();