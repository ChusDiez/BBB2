// BackExams/scripts/fix-html-syntax.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function fixHtmlSyntax() {
  console.log('🔧 Iniciando corrección de sintaxis HTML en feedbacks...\n');
  
  try {
    await startTables();
    
    // Obtener todas las preguntas con feedback que contenga HTML
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.like]: '%style=%' } // Que tenga estilos
          ]
        }
      }
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas con estilos HTML\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Función para corregir sintaxis HTML
    const fixHtmlSyntax = (html) => {
      if (!html) return html;
      
      let fixed = html;
      
      // Corregir comas por punto y coma en estilos
      fixed = fixed.replace(/style\s*=\s*['"]([^'"]+)['"]/gi, (match, styleContent) => {
        // Dentro del style, reemplazar comas por punto y coma
        let correctedStyle = styleContent
          .replace(/,\s*(?=[\w-]+:)/g, '; ') // Coma seguida de propiedad CSS
          .replace(/,\s*$/g, '') // Eliminar coma al final
          .replace(/,\s*'/g, "'") // Eliminar coma antes de comilla
          .replace(/;\s*;/g, ';') // Eliminar punto y coma duplicados
          .replace(/;\s*$/, '') // Eliminar punto y coma al final
          .trim();
        
        return `style="${correctedStyle}"`;
      });
      
      // Cambiar comillas simples por dobles en atributos
      fixed = fixed.replace(/(\w+)\s*=\s*'([^']*)'/g, '$1="$2"');
      
      // Corregir —&gt, por →
      fixed = fixed.replace(/—&gt,/g, '→');
      fixed = fixed.replace(/—&gt;/g, '→');
      fixed = fixed.replace(/--&gt;/g, '→');
      
      return fixed;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        const fixedFeedback = fixHtmlSyntax(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== fixedFeedback) {
          await question.update({ feedback: fixedFeedback });
          fixedCount++;
          
          console.log(`✅ Pregunta ID ${question.id} - Sintaxis corregida`);
          
          // Mostrar ejemplo del primer cambio
          if (fixedCount === 1) {
            console.log('\n📝 Ejemplo de corrección:');
            console.log('   ANTES:');
            console.log('   ' + originalFeedback.substring(0, 200) + '...\n');
            console.log('   DESPUÉS:');
            console.log('   ' + fixedFeedback.substring(0, 200) + '...\n');
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de corrección de sintaxis:');
    console.log(`   ✅ Feedbacks corregidos: ${fixedCount}`);
    console.log(`   ⏭️  Feedbacks sin cambios: ${questions.length - fixedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    if (fixedCount > 0) {
      console.log('\n🎯 Sintaxis HTML corregida exitosamente.');
      console.log('   - Comas (,) → Punto y coma (;) en estilos');
      console.log('   - Comillas simples → Comillas dobles');
      console.log('   - Caracteres especiales corregidos');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar corrección
fixHtmlSyntax();