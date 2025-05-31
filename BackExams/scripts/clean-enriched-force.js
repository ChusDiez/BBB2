// BackExams/scripts/clean-enriched-force.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function cleanEnrichedFeedbacksForce() {
  console.log('🧹 Iniciando limpieza FORZADA de feedbacks enriquecidos...\n');
  console.log('⚠️  Este script limpiará elementos no deseados incluso dentro de HTML\n');
  
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
    
    // Función mejorada para limpiar el feedback (funciona con HTML)
    const cleanFeedbackAdvanced = (feedback) => {
      if (!feedback) return null;
      
      let cleaned = feedback;
      
      // Patrones más agresivos para encontrar y eliminar contenido no deseado
      
      // 1. Eliminar cualquier línea que contenga "PREGUNTA:" y todo su contenido hasta el final de línea
      // Esto funciona incluso si está dentro de tags HTML
      cleaned = cleaned.replace(/<[^>]*>PREGUNTA:.*?(?=<|$)/g, '');
      cleaned = cleaned.replace(/PREGUNTA:.*?(?=<|\n|$)/g, '');
      
      // 2. Eliminar "RESPUESTA CORRECTA:" y su contenido
      cleaned = cleaned.replace(/<[^>]*>RESPUESTA CORRECTA:.*?(?=<|$)/g, '');
      cleaned = cleaned.replace(/RESPUESTA CORRECTA:.*?(?=<|\n|$)/g, '');
      
      // 3. Eliminar "FEEDBACK ORIGINAL:" o "FEEDBACK:"
      cleaned = cleaned.replace(/<[^>]*>FEEDBACK\s*ORIGINAL\s*:.*?(?=<|$)/g, '');
      cleaned = cleaned.replace(/FEEDBACK\s*ORIGINAL\s*:.*?(?=<|\n|$)/g, '');
      cleaned = cleaned.replace(/<[^>]*>FEEDBACK\s*:.*?(?=<|$)/g, '');
      cleaned = cleaned.replace(/FEEDBACK\s*:.*?(?=<|\n|$)/g, '');
      
      // 4. Limpiar tags HTML vacíos que puedan haber quedado
      cleaned = cleaned.replace(/<(\w+)(\s[^>]*)?>[\s]*<\/\1>/g, '');
      
      // 5. Limpiar párrafos que solo contengan estos prefijos
      cleaned = cleaned.replace(/<p[^>]*>\s*(PREGUNTA:|RESPUESTA CORRECTA:|FEEDBACK\s*ORIGINAL\s*:|FEEDBACK\s*:)\s*<\/p>/gi, '');
      
      // 6. Limpiar cualquier tag que contenga SOLO estos prefijos
      cleaned = cleaned.replace(/<[^>]+>\s*(PREGUNTA:|RESPUESTA CORRECTA:|FEEDBACK\s*ORIGINAL\s*:|FEEDBACK\s*:)\s*<\/[^>]+>/gi, '');
      
      // 7. Eliminar múltiples saltos de línea consecutivos
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      cleaned = cleaned.replace(/(<br\s*\/?>[\s]*){3,}/gi, '<br><br>');
      
      // 8. Eliminar saltos de línea o <br> al principio
      cleaned = cleaned.replace(/^[\s\n]*(<br\s*\/?>[\s\n]*)*/i, '');

      // 10. Sustituir <br> y </p> por saltos de línea y eliminar cualquier etiqueta HTML restante
      cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
      cleaned = cleaned.replace(/<\/p>/gi, '\n');
      cleaned = cleaned.replace(/<[^>]+>/g, '');

      // 11. Comprimir saltos de línea múltiples
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      
      // 9. Trim final
      cleaned = cleaned.trim();
      
      return cleaned;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        const cleanedFeedback = cleanFeedbackAdvanced(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== cleanedFeedback) {
          await question.update({ feedback: cleanedFeedback });
          cleanedCount++;
          
          console.log(`✅ Pregunta ID ${question.id} limpiada`);
          
          // Mostrar ejemplo del primer cambio
          if (cleanedCount === 1) {
            console.log('\n📝 Ejemplo de limpieza:');
            console.log('   ANTES:');
            console.log('   ------');
            console.log('   ' + originalFeedback.substring(0, 300).replace(/\n/g, '\\n') + '...\n');
            console.log('   DESPUÉS:');
            console.log('   --------');
            console.log('   ' + cleanedFeedback.substring(0, 300).replace(/\n/g, '\\n') + '...\n');
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de limpieza FORZADA:');
    console.log(`   ✅ Feedbacks limpiados: ${cleanedCount}`);
    console.log(`   ⏭️  Feedbacks sin cambios: ${questions.length - cleanedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    if (cleanedCount > 0) {
      console.log('\n💡 Los elementos no deseados han sido eliminados de los feedbacks.');
      console.log('   Ahora puedes volver a enriquecer si es necesario.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar limpieza forzada
cleanEnrichedFeedbacksForce();