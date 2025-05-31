// BackExams/scripts/clean-feedback-prefixes.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function cleanFeedbackPrefixes() {
  console.log('🧹 Iniciando limpieza de prefijos duplicados en feedbacks...\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Obtener todas las preguntas con feedback que contengan prefijos problemáticos
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.or]: [
              { [Op.like]: '%PREGUNTA:%' },
              { [Op.like]: '%RESPUESTA CORRECTA:%' },
              { [Op.like]: '%FEEDBACK ORIGINAL:%' },
              { [Op.like]: '%RETROALIMENTACIÓN:%' }
            ]}
          ]
        }
      }
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas con prefijos problemáticos\n`);
    
    if (questions.length === 0) {
      console.log('✅ No hay feedbacks con prefijos duplicados');
      process.exit(0);
    }
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    // Función para limpiar el feedback
    const cleanFeedback = (feedback) => {
      if (!feedback) return null;
      
      let cleaned = feedback;
      
      // Si contiene estructura completa con PREGUNTA, RESPUESTA y FEEDBACK
      if (cleaned.includes('PREGUNTA:') && cleaned.includes('RESPUESTA CORRECTA:')) {
        // Buscar la última ocurrencia de estos patrones y tomar solo lo que viene después
        const patterns = [
          'FEEDBACK ORIGINAL:',
          'FEEDBACK:',
          'RETROALIMENTACIÓN:'
        ];
        
        let lastIndex = -1;
        let patternLength = 0;
        
        patterns.forEach(pattern => {
          const index = cleaned.lastIndexOf(pattern);
          if (index > lastIndex) {
            lastIndex = index;
            patternLength = pattern.length;
          }
        });
        
        if (lastIndex > -1) {
          cleaned = cleaned.substring(lastIndex + patternLength).trim();
        }
      }
      
      // Eliminar prefijos al inicio si existen
      cleaned = cleaned.replace(/^(PREGUNTA|RESPUESTA CORRECTA|FEEDBACK|RETROALIMENTACIÓN|FEEDBACK ORIGINAL):\s*/gi, '');
      
      // Si todavía hay "PREGUNTA:" en algún lugar, intentar extraer solo la parte final
      if (cleaned.includes('PREGUNTA:')) {
        // Dividir por líneas y buscar donde empieza el feedback real
        const lines = cleaned.split('\n');
        let feedbackStartIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Si la línea no empieza con un prefijo conocido y tiene contenido
          if (line && 
              !line.startsWith('PREGUNTA:') && 
              !line.startsWith('RESPUESTA CORRECTA:') &&
              !line.startsWith('FEEDBACK') &&
              !line.startsWith('RETROALIMENTACIÓN:')) {
            feedbackStartIndex = i;
            break;
          }
        }
        
        if (feedbackStartIndex > -1) {
          cleaned = lines.slice(feedbackStartIndex).join('\n').trim();
        }
      }
      
      // Limpiar espacios múltiples y saltos de línea excesivos
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      cleaned = cleaned.trim();
      
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
            console.log('   ANTES:');
            console.log('   ------');
            const preview = originalFeedback.substring(0, 200).replace(/\n/g, '\\n');
            console.log(`   ${preview}...`);
            console.log('\n   DESPUÉS:');
            console.log('   --------');
            const cleanPreview = cleanedFeedback.substring(0, 200).replace(/\n/g, '\\n');
            console.log(`   ${cleanPreview}...`);
            console.log();
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
      console.log('\n💡 Los prefijos duplicados han sido eliminados.');
      console.log('   Los feedbacks ahora contienen solo la retroalimentación.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar limpieza
console.log('='.repeat(60));
console.log('🧹 LIMPIEZA DE PREFIJOS DUPLICADOS EN FEEDBACKS');
console.log('='.repeat(60));
console.log('Este script eliminará PREGUNTA:, RESPUESTA CORRECTA:, etc.\n');

cleanFeedbackPrefixes();