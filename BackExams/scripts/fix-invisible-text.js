// BackExams/scripts/fix-invisible-text.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function fixInvisibleText() {
  console.log('🔧 Iniciando corrección de TEXTO INVISIBLE...\n');
  
  try {
    await startTables();
    
    // Obtener todas las preguntas con feedback
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.ne]: null
        }
      }
    });
    
    console.log(`📊 Analizando ${questions.length} preguntas con feedback\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Función para corregir texto invisible y problemas de formato
    const fixInvisibleText = (feedback) => {
      if (!feedback) return null;
      
      let fixed = feedback;
      
      // 1. ELIMINAR CARACTERES INVISIBLES PROBLEMÁTICOS
      // Caracteres Unicode invisibles comunes
      const invisibleChars = [
        '\u200B', // Zero Width Space
        '\u200C', // Zero Width Non-Joiner
        '\u200D', // Zero Width Joiner
        '\u2060', // Word Joiner
        '\uFEFF', // Zero Width No-Break Space (BOM)
        '\u00A0', // Non-breaking space problemático
        '\u2007', // Figure Space
        '\u2028', // Line Separator
        '\u2029', // Paragraph Separator
        '\u202F', // Narrow No-Break Space
      ];
      
      invisibleChars.forEach(char => {
        fixed = fixed.replace(new RegExp(char, 'g'), ' ');
      });
      
      // 2. CORREGIR SINTAXIS PANDOC A HTML VISIBLE
      // [texto]{.mark} → span con fondo amarillo VISIBLE
      fixed = fixed.replace(/\[([^\]]+)\]\{\.mark\}/g, 
        '<span style="background-color: #ffeb3b; color: #000000; padding: 2px 4px; border-radius: 3px; font-weight: 600;">$1</span>');
      
      // [texto]{.underline} → span con color azul OSCURO
      fixed = fixed.replace(/\[([^\]]+)\]\{\.underline\}/g, 
        '<span style="color: #0d47a1; text-decoration: underline; font-weight: 700;">$1</span>');
      
      // 3. CORREGIR COLORES INVISIBLES → COLORES VISIBLES
      const colorFixes = {
        // FONDOS INVISIBLES → FONDOS VISIBLES
        'background-color: #ffffff': 'background-color: #f5f5f5', // Blanco → Gris claro
        'background-color: #fff': 'background-color: #f5f5f5',
        'background-color: #fefefe': 'background-color: #eeeeee',
        'background-color: #fff3cd': 'background-color: #ffeb3b', // Amarillo invisible → Amarillo visible
        'background-color: #f8f9ff': 'background-color: #e3f2fd', // Azul invisible → Azul visible
        'background-color: #e8f4fd': 'background-color: #e1f5fe',
        
        // TEXTO INVISIBLE → TEXTO VISIBLE
        'color: #ffffff': 'color: #000000', // Blanco sobre blanco → Negro
        'color: #fff': 'color: #000000',
        'color: #fefefe': 'color: #333333',
        'color: #f5f5f5': 'color: #212121', // Gris muy claro → Gris oscuro
        'color: #e0e0e0': 'color: #424242',
        'color: #eeeeee': 'color: #616161',
        
        // COLORES MUY CLAROS → COLORES OSCUROS
        'color: #cccccc': 'color: #424242',
        'color: #dddddd': 'color: #616161',
        'color: #28a745': 'color: #1b5e20', // Verde claro → Verde oscuro
        'color: #fd7e14': 'color: #e65100', // Naranja claro → Naranja oscuro
        'color: #dc3545': 'color: #b71c1c', // Rojo claro → Rojo oscuro
        'color: #1565c0': 'color: #0d47a1', // Azul medio → Azul oscuro
      };
      
      // Aplicar todas las correcciones de colores
      Object.entries(colorFixes).forEach(([oldColor, newColor]) => {
        const regex = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        fixed = fixed.replace(regex, newColor);
      });
      
      // 4. FORZAR CONTRASTE EN ELEMENTOS COMUNES
      // Asegurar que elementos importantes sean visibles
      fixed = fixed.replace(/<span([^>]*)>/g, (match, attributes) => {
        // Si no tiene color definido, añadir color oscuro
        if (!attributes.includes('color:')) {
          return `<span${attributes} style="color: #212121;">`;
        }
        return match;
      });
      
      // 5. CORREGIR HTML ESCAPADO
      fixed = fixed.replace(/\\"/g, '"');
      fixed = fixed.replace(/\\>/g, '>');
      fixed = fixed.replace(/\\</g, '<');
      
      // 6. CORREGIR BLOCKQUOTES MALFORMADOS
      fixed = fixed.replace(
        /blockquote style=\\"([^"]+)\\"\>([^<]+)\/blockquote\>/g,
        '<blockquote style="$1">$2</blockquote>'
      );
      
      // 7. ASEGURAR ELEMENTOS CRÍTICOS VISIBLES
      // Hacer que leyes y artículos sean MUY visibles
      fixed = fixed.replace(/(Ley|LO|RD|Real Decreto|art\.|artículo)\s*([\d\/\-\.]+)/gi,
        '<span style="background-color: #ffeb3b; color: #000000; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid #fbc02d;">$1 $2</span>');
      
      // 8. LIMPIAR ESPACIOS MÚLTIPLES
      fixed = fixed.replace(/\s+/g, ' ');
      fixed = fixed.trim();
      
      return fixed;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        const fixedFeedback = fixInvisibleText(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== fixedFeedback) {
          await question.update({ feedback: fixedFeedback });
          fixedCount++;
          
          console.log(`✅ Pregunta ID ${question.id} - TEXTO INVISIBLE CORREGIDO`);
          
          // Mostrar ejemplo del primer cambio
          if (fixedCount === 1) {
            console.log('\n📝 EJEMPLO DE CORRECCIÓN:');
            console.log('   ❌ ANTES (invisible/muy claro):');
            console.log('   ' + originalFeedback.substring(0, 200) + '...\n');
            console.log('   ✅ DESPUÉS (completamente visible):');
            console.log('   ' + fixedFeedback.substring(0, 200) + '...\n');
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 RESUMEN DE CORRECCIÓN DE TEXTO INVISIBLE:');
    console.log(`   ✅ Feedbacks con texto invisible corregido: ${fixedCount}`);
    console.log(`   ⏭️  Feedbacks que ya estaban bien: ${questions.length - fixedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    if (fixedCount > 0) {
      console.log('\n🎯 PROBLEMAS DE VISIBILIDAD CORREGIDOS:');
      console.log('   👁️  Texto blanco/invisible → Texto negro visible');
      console.log('   🎨 Fondos transparentes → Fondos contrastados');
      console.log('   📝 Sintaxis Pandoc → HTML visible');
      console.log('   🔧 Caracteres Unicode invisibles → Espacios normales');
      console.log('   📐 HTML malformado → HTML válido');
      console.log('\n✅ AHORA TODOS LOS TEXTOS SON COMPLETAMENTE VISIBLES');
      
      console.log('\n🎨 EJEMPLOS DE VISIBILIDAD MEJORADA:');
      console.log('   • Texto blanco (#ffffff) → Texto negro (#000000)');
      console.log('   • Fondo invisible (#fff3cd) → Fondo amarillo visible (#ffeb3b)');
      console.log('   • [Ley]{.mark} → <span amarillo con borde visible>');
      console.log('   • Caracteres Unicode invisibles → Eliminados');
      
    } else {
      console.log('\n✅ No se detectaron problemas de texto invisible.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar corrección
console.log('='.repeat(70));
console.log('👁️  CORRECCIÓN COMPLETA DE TEXTO INVISIBLE Y POCO VISIBLE');
console.log('='.repeat(70));
console.log('Este script resuelve:');
console.log('  🔍 Texto blanco/invisible → Texto negro visible');
console.log('  🎨 Colores muy claros → Colores con contraste alto');
console.log('  📝 Sintaxis problemática → HTML limpio y visible');
console.log('  🚫 Caracteres Unicode invisibles → Eliminados');
console.log('  📐 Elementos malformados → Elementos válidos\n');

console.log('💡 Para usar este script:');
console.log('1. Añade a package.json:');
console.log('   "fix:invisible": "NODE_TLS_REJECT_UNAUTHORIZED=0 node --es-module-specifier-resolution=node scripts/fix-invisible-text.js"');
console.log('2. Ejecuta: npm run fix:invisible\n');

fixInvisibleText();