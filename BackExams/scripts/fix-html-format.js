// BackExams/scripts/fix-html-format.js
// Agrega este script al package.json:
// "fix:html-format": "NODE_TLS_REJECT_UNAUTHORIZED=0 node --es-module-specifier-resolution=node scripts/fix-html-format.js"
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function fixHtmlFormat() {
  console.log('🔧 Iniciando corrección de formato HTML...\n');
  
  try {
    await startTables();
    
    // Obtener todas las preguntas con feedback que contenga problemas de formato
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.or]: [
              { [Op.like]: '%{.mark}%' },
              { [Op.like]: '%{.underline}%' },
              { [Op.like]: '%\\>%' },
              { [Op.like]: '%\\"%' },
              { [Op.like]: '%blockquote style=%' }
            ]}
          ]
        }
      }
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas con problemas de formato\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Función para corregir el formato HTML
    const fixHtmlFormat = (feedback) => {
      if (!feedback) return null;
      
      let fixed = feedback;
      
      // 1. Convertir sintaxis Pandoc a HTML
      // [texto]{.mark} -> <span class="law-reference">texto</span>
      fixed = fixed.replace(/\[([^\]]+)\]\{\.mark\}/g, '<span class="law-reference">$1</span>');
      
      // [texto]{.underline} -> <span style="text-decoration: underline;">texto</span>
      fixed = fixed.replace(/\[([^\]]+)\]\{\.underline\}/g, '<span style="text-decoration: underline; font-weight: 600;">$1</span>');
      
      // 2. Corregir HTML escapado
      fixed = fixed.replace(/\\"/g, '"');
      fixed = fixed.replace(/\\>/g, '>');
      fixed = fixed.replace(/\\</g, '<');
      
      // 3. Corregir blockquotes malformados
      fixed = fixed.replace(
        /blockquote style=\\"([^"]+)\\"\>([^<]+)\/blockquote\>/g,
        '<blockquote style="$1">$2</blockquote>'
      );
      
      // 4. Corregir sintaxis de blockquote específica del documento
      fixed = fixed.replace(
        /blockquote style="border-left: 3px solid #0066cc; padding-left: 10px; margin: 5px 0; font-style: italic;"\>([^<]+)\/blockquote\>/g,
        '<blockquote style="border-left: 3px solid #0066cc; padding-left: 10px; margin: 5px 0; font-style: italic;">$1</blockquote>'
      );
      
      // 5. Limpiar múltiples espacios
      fixed = fixed.replace(/\s+/g, ' ');
      
      // 6. Trim
      fixed = fixed.trim();
      
      return fixed;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        const fixedFeedback = fixHtmlFormat(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== fixedFeedback) {
          await question.update({ feedback: fixedFeedback });
          fixedCount++;
          
          console.log(`✅ Pregunta ID ${question.id} - Formato corregido`);
          
          // Mostrar ejemplo del primer cambio
          if (fixedCount === 1) {
            console.log('\n📝 Ejemplo de corrección:');
            console.log('   ANTES:');
            console.log('   ' + originalFeedback.substring(0, 150) + '...\n');
            console.log('   DESPUÉS:');
            console.log('   ' + fixedFeedback.substring(0, 150) + '...\n');
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de corrección de formato:');
    console.log(`   ✅ Feedbacks corregidos: ${fixedCount}`);
    console.log(`   ⏭️  Feedbacks sin cambios: ${questions.length - fixedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    if (fixedCount > 0) {
      console.log('\n🎯 Formato HTML corregido para mejor exportación.');
      console.log('   Los documentos Word ahora se generarán correctamente.');
    } else {
      console.log('\n✅ No se encontraron problemas de formato para corregir.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar corrección
console.log('='.repeat(50));
console.log('🔧 CORRECCIÓN DE FORMATO HTML');
console.log('='.repeat(50));
console.log('Este script corrige problemas de formato HTML/Markdown mixto.\n');

fixHtmlFormat();