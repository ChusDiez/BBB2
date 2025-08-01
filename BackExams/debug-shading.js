// Debug del problema de fondo negro
import { Op } from 'sequelize';
import startTables from './utils/initializeDatabase.js';
import Questions from './models/questions.model.js';

async function debugShadingIssue() {
  await startTables();
  
  console.log('🔍 DIAGNÓSTICO: Problema de fondo negro en retroalimentación');
  console.log('='.repeat(65));
  
  // Obtener una pregunta con feedback problemático
  const question = await Questions.findOne({
    where: { 
      feedback: { 
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.like]: '%background-color%' }
        ]
      }
    }
  });
  
  if (!question) {
    console.log('❌ No se encontró pregunta con background-color');
    process.exit(0);
  }
  
  console.log(`📋 Pregunta ID: ${question.id}`);
  console.log('📋 Feedback original:');
  console.log(question.feedback.substring(0, 300) + '...');
  
  // Extraer el div principal y sus estilos
  const divMatch = question.feedback.match(/<div[^>]+style=["']([^"']+)["'][^>]*>/);
  if (divMatch) {
    console.log('\n🎨 Estilos encontrados en el div:');
    console.log('   ' + divMatch[1]);
    
    // Analizar background-color específicamente
    const bgMatch = divMatch[1].match(/background-color\s*:\s*([^;]+)/);
    if (bgMatch) {
      console.log('\n🎯 Background-color detectado:');
      console.log(`   Valor original: "${bgMatch[1]}"`);
      
      // Simular la normalización
      const color = bgMatch[1].trim();
      console.log(`   Color limpio: "${color}"`);
      
      // Ver qué devuelve nuestra función de normalización
      const hexMatch = color.match(/#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/);
      if (hexMatch) {
        let hex = hexMatch[1].toUpperCase();
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        console.log(`   Hex normalizado: "${hex}"`);
        console.log(`   ¿Es válido?: ${/^[A-F0-9]{6}$/.test(hex) ? 'SÍ' : 'NO'}`);
        
        // El problema: verificar si este color es muy claro
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        console.log(`   RGB: (${r}, ${g}, ${b})`);
        console.log(`   ¿Es color claro?: ${r > 200 && g > 200 && b > 200 ? 'SÍ' : 'NO'}`);
        
      } else {
        console.log('   ❌ No se pudo extraer hex del color');
      }
    }
  } else {
    console.log('❌ No se encontró div con estilos');
  }
  
  console.log('\n💡 Posibles causas del fondo negro:');
  console.log('   1. ShadingType.SOLID con "auto" puede causar problemas');
  console.log('   2. Color de texto blanco sobre fondo claro');
  console.log('   3. Word invierte colores en algunos casos');
  console.log('   4. Conflicto entre shading y highlight');
  
  process.exit(0);
}

debugShadingIssue();