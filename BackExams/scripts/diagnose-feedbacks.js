// BackExams/scripts/diagnose-feedbacks.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function diagnoseFeedbacks() {
  console.log('🔍 Iniciando diagnóstico de feedbacks...\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Obtener todas las preguntas con feedback
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.ne]: null
        }
      },
      order: [['id', 'ASC']],
      limit: 10 // Solo analizamos las primeras 10 para el diagnóstico
    });
    
    console.log(`📊 Analizando ${questions.length} preguntas con feedback...\n`);
    
    // Estadísticas
    let withHTML = 0;
    let withPREGUNTA = 0;
    let withRESPUESTA = 0;
    let withFEEDBACK = 0;
    
    // Analizar cada pregunta
    questions.forEach((question, index) => {
      const feedback = question.feedback;
      
      // Verificar contenido
      const hasHTML = feedback.includes('<') && feedback.includes('>');
      const hasPREGUNTA = feedback.includes('PREGUNTA:');
      const hasRESPUESTA = feedback.includes('RESPUESTA CORRECTA:');
      const hasFEEDBACK = feedback.includes('FEEDBACK') && feedback.includes(':');
      
      if (hasHTML) withHTML++;
      if (hasPREGUNTA) withPREGUNTA++;
      if (hasRESPUESTA) withRESPUESTA++;
      if (hasFEEDBACK) withFEEDBACK++;
      
      console.log(`\n📝 Pregunta ID ${question.id}:`);
      console.log(`   - Tiene HTML: ${hasHTML ? '✅' : '❌'}`);
      console.log(`   - Tiene "PREGUNTA:": ${hasPREGUNTA ? '⚠️ SÍ' : '✅ NO'}`);
      console.log(`   - Tiene "RESPUESTA CORRECTA:": ${hasRESPUESTA ? '⚠️ SÍ' : '✅ NO'}`);
      console.log(`   - Tiene "FEEDBACK:": ${hasFEEDBACK ? '⚠️ SÍ' : '✅ NO'}`);
      
      // Mostrar muestra del contenido problemático si existe
      if (hasPREGUNTA || hasRESPUESTA || hasFEEDBACK) {
        console.log('\n   🔴 Contenido problemático encontrado:');
        console.log('   ' + '-'.repeat(50));
        
        // Extraer las líneas problemáticas
        const lines = feedback.split('\n');
        lines.forEach(line => {
          if (line.includes('PREGUNTA:') || 
              line.includes('RESPUESTA CORRECTA:') || 
              line.includes('FEEDBACK')) {
            console.log(`   ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
          }
        });
        console.log('   ' + '-'.repeat(50));
      }
      
      // Mostrar los primeros 200 caracteres del feedback
      if (index === 0) {
        console.log('\n   📄 Muestra del feedback completo (primeros 300 caracteres):');
        console.log('   ' + feedback.substring(0, 300).replace(/\n/g, '\\n') + '...');
      }
    });
    
    // Resumen
    console.log('\n\n📊 RESUMEN DEL DIAGNÓSTICO:');
    console.log(`   - Total con HTML: ${withHTML}/${questions.length}`);
    console.log(`   - Total con "PREGUNTA:": ${withPREGUNTA}/${questions.length}`);
    console.log(`   - Total con "RESPUESTA CORRECTA:": ${withRESPUESTA}/${questions.length}`);
    console.log(`   - Total con "FEEDBACK:": ${withFEEDBACK}/${questions.length}`);
    
    if (withPREGUNTA > 0 || withRESPUESTA > 0 || withFEEDBACK > 0) {
      console.log('\n⚠️  Se encontraron elementos problemáticos en los feedbacks.');
      console.log('   Ejecuta "npm run clean:enriched-force" para limpiarlos.');
    } else {
      console.log('\n✅ No se encontraron elementos problemáticos en la muestra analizada.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar diagnóstico
diagnoseFeedbacks();