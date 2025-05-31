// BackExams/scripts/fix-colors-for-word.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function fixColorsForWord() {
  console.log('🎨 Iniciando corrección de colores para Word...\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Obtener todas las preguntas con feedback que contenga HTML
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.like]: '%<%' } // Contiene HTML
          ]
        }
      }
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas con feedback HTML\n`);
    
    if (questions.length === 0) {
      console.log('✅ No hay preguntas con HTML para corregir');
      process.exit(0);
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Función para corregir colores problemáticos
    const fixColors = (feedback) => {
      if (!feedback) return null;
      
      let fixed = feedback;
      
      // Mapeo de colores problemáticos a colores optimizados para Word
      const colorFixes = {
        // Fondo amarillo muy claro → Amarillo más visible
        '#fff3cd': '#ffffcc',
        
        // Azul muy claro → Azul más oscuro
        '#f8f9ff': '#f0f8ff',
        '#e8f4fd': '#f0f8ff',
        
        // Gris muy claro → Gris con más contraste
        '#e9ecef': '#f5f5f5',
        
        // Colores de texto muy claros → Más oscuros
        'color: #28a745': 'color: #006600',
        'color: #fd7e14': 'color: #cc5500',
        'color: #dc3545': 'color: #990000',
        'color: #1565c0': 'color: #003399',
      };
      
      // Aplicar correcciones
      Object.entries(colorFixes).forEach(([oldColor, newColor]) => {
        const regex = new RegExp(oldColor.replace('#', '\\#'), 'gi');
        fixed = fixed.replace(regex, newColor);
      });
      
      // Corregir patrones específicos de background-color problemáticos
      fixed = fixed.replace(/background-color:\s*#fff3cd/gi, 'background-color: #ffffcc');
      fixed = fixed.replace(/background-color:\s*#e8f4fd/gi, 'background-color: #f0f8ff');
      fixed = fixed.replace(/background-color:\s*#e9ecef/gi, 'background-color: #f5f5f5');
      
      // Añadir font-weight a elementos importantes si no lo tienen
      fixed = fixed.replace(
        /<span style="([^"]*color: #003399[^"]*)">/gi, 
        '<span style="$1; font-weight: 600;">'
      );
      
      fixed = fixed.replace(
        /<span style="([^"]*color: #006600[^"]*)">/gi, 
        '<span style="$1; font-weight: 500;">'
      );
      
      return fixed;
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        const fixedFeedback = fixColors(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== fixedFeedback) {
          await question.update({ feedback: fixedFeedback });
          fixedCount++;
          
          console.log(`✅ Pregunta ID ${question.id} - Colores corregidos`);
          
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
    
    console.log('\n📊 Resumen de corrección de colores:');
    console.log(`   ✅ Feedbacks corregidos: ${fixedCount}`);
    console.log(`   ⏭️  Feedbacks sin cambios: ${questions.length - fixedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    
    if (fixedCount > 0) {
      console.log('\n🎨 Los colores han sido optimizados para Word.');
      console.log('   Ahora los documentos se verán mucho mejor y más legibles.');
    } else {
      console.log('\n✅ No se encontraron colores problemáticos para corregir.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar corrección
console.log('='.repeat(50));
console.log('🎨 CORRECCIÓN DE COLORES PARA WORD');
console.log('='.repeat(50));
console.log('Este script corrige colores problemáticos en feedbacks HTML');
console.log('para mejorar la legibilidad en documentos Word.\n');

fixColorsForWord();