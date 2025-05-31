// BackExams/scripts/clean-feedback-duplication.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function cleanFeedbackDuplication() {
  console.log('🧹 Iniciando limpieza de duplicaciones de "Retroalimentación"...\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Obtener todas las preguntas con feedback que contengan la duplicación
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.like]: '%Retroalimentación:%' }
          ]
        }
      }
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas con feedback que contiene "Retroalimentación:"\n`);
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    // Función para limpiar duplicaciones de retroalimentación
    const cleanFeedbackDuplication = (feedback) => {
      if (!feedback) return null;
      
      let cleaned = feedback;
      
      // Patrones para eliminar duplicaciones específicas
      
      // 1. Eliminar "Retroalimentación:" al inicio si está seguido de otro "Retroalimentación:"
      cleaned = cleaned.replace(/^[\s]*<span[^>]*>Retroalimentación:<\/span>[\s]*<[^>]*>Retroalimentación:[^<]*<\/[^>]*>/gi, '');
      cleaned = cleaned.replace(/^[\s]*Retroalimentación:[\s]*<[^>]*>Retroalimentación:[^<]*<\/[^>]*>/gi, '');
      
      // 2. Eliminar etiquetas HTML que contengan "Retroalimentación:" dentro del contenido
      cleaned = cleaned.replace(/<span[^>]*>[\s]*Retroalimentación:[\s]*<\/span>/gi, '');
      cleaned = cleaned.replace(/<strong[^>]*>[\s]*Retroalimentación:[\s]*<\/strong>/gi, '');
      cleaned = cleaned.replace(/<[^>]*\[Retroalimentación:\][^}]*\}/gi, '');
      
      // 3. Eliminar "Retroalimentación:" que aparezca al inicio del feedback
      cleaned = cleaned.replace(/^[\s]*Retroalimentación:[\s]*/gi, '');
      
      // 4. Limpiar elementos específicos que aparecen en el ejemplo
      cleaned = cleaned.replace(/\*\*\[Retroalimentación:\]\{\.underline\}\*\*/gi, '');
      
      // 5. Eliminar múltiples espacios o saltos de línea al inicio
      cleaned = cleaned.replace(/^[\s\n\r]+/, '');
      
      // 6. Trim final
      cleaned = cleaned.trim();
      
      return cleaned;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        const cleanedFeedback = cleanFeedbackDuplication(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== cleanedFeedback) {
          await question.update({ feedback: cleanedFeedback });
          cleanedCount++;
          
          console.log(`✅ Pregunta ID ${question.id} limpiada`);
          
          // Mostrar ejemplo del primer cambio
          if (cleanedCount === 1) {
            console.log('\n📝 Ejemplo de limpieza:');
            console.log('   ANTES (primeros 150 caracteres):');
            console.log('   ' + originalFeedback.substring(0, 150).replace(/\n/g, '\\n') + '...\n');
            console.log('   DESPUÉS (primeros 150 caracteres):');
            console.log('   ' + cleanedFeedback.substring(0, 150).replace(/\n/g, '\\n') + '...\n');
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de limpieza de duplicaciones:');
    console.log(`   ✅ Feedbacks limpiados: ${cleanedCount}`);
    console.log(`   ⏭️  Feedbacks sin cambios: ${questions.length - cleanedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    if (cleanedCount > 0) {
      console.log('\n💡 Las duplicaciones de "Retroalimentación:" han sido eliminadas.');
      console.log('   Los feedbacks ahora tienen el formato correcto para tu plantilla.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar limpieza
console.log('='.repeat(60));
console.log('🧹 LIMPIEZA DE DUPLICACIONES DE RETROALIMENTACIÓN');
console.log('='.repeat(60));
console.log('Este script eliminará las duplicaciones de "Retroalimentación:" en los feedbacks.\n');

cleanFeedbackDuplication();