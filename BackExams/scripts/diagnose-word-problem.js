// BackExams/scripts/diagnose-word-problem.js
// Script para diagnosticar por qué los documentos Word salen corruptos

import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';
import docx from 'docx';
import fs from 'fs/promises';
import createDocument from '../config/document.js';
import { htmlToDocxElements } from '../utils/htmlToDocx.js';

const { Packer } = docx;

async function diagnoseWordProblem() {
  console.log('🔍 Diagnosticando problemas con documentos Word...\n');
  
  try {
    await startTables();
    
    // 1. Obtener una pregunta problemática con feedback HTML
    const problemQuestions = await Questions.findAll({
      where: {
        feedback: {
          [Questions.sequelize.Op.and]: [
            { [Questions.sequelize.Op.ne]: null },
            { [Questions.sequelize.Op.like]: '%<%' } // Tiene HTML
          ]
        }
      },
      limit: 3
    });
    
    if (problemQuestions.length === 0) {
      console.log('❌ No se encontraron preguntas con feedback HTML');
      return;
    }
    
    console.log(`📊 Encontradas ${problemQuestions.length} preguntas con HTML\n`);
    
    // 2. Analizar el contenido problemático
    for (const question of problemQuestions) {
      console.log(`\nPREGUNTA ID ${question.id}:`);
      console.log('='.repeat(50));
      
      // Mostrar feedback original
      console.log('FEEDBACK ORIGINAL:');
      console.log(question.feedback.substring(0, 200) + '...\n');
      
      // Detectar problemas potenciales
      const problems = [];
      
      // Caracteres problemáticos
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(question.feedback)) {
        problems.push('⚠️  Contiene caracteres de control');
      }
      
      // HTML mal formado
      const openTags = (question.feedback.match(/<[^/>]+>/g) || []).length;
      const closeTags = (question.feedback.match(/<\/[^>]+>/g) || []).length;
      if (openTags !== closeTags) {
        problems.push(`⚠️  Tags no balanceados: ${openTags} abiertos vs ${closeTags} cerrados`);
      }
      
      // Caracteres Unicode problemáticos
      if (/[\u200B-\u200D\uFEFF\u2028\u2029]/.test(question.feedback)) {
        problems.push('⚠️  Contiene caracteres Unicode invisibles');
      }
      
      // Scripts o estilos
      if (/<script|<style/i.test(question.feedback)) {
        problems.push('⚠️  Contiene scripts o estilos');
      }
      
      if (problems.length > 0) {
        console.log('PROBLEMAS DETECTADOS:');
        problems.forEach(p => console.log(`   ${p}`));
      } else {
        console.log('✅ No se detectaron problemas obvios');
      }
      
      // 3. Intentar convertir a elementos docx
      console.log('\nINTENTANDO CONVERSIÓN A DOCX:');
      try {
        const elements = htmlToDocxElements(question.feedback);
        console.log(`✅ Conversión exitosa: ${elements.length} elementos creados`);
      } catch (convError) {
        console.log(`❌ Error en conversión: ${convError.message}`);
      }
    }
    
    // 4. Intentar generar un documento de prueba
    console.log('\n' + '='.repeat(50));
    console.log('GENERANDO DOCUMENTO DE PRUEBA:\n');
    
    try {
      // Crear documento con las preguntas problemáticas
      const testDoc = createDocument(problemQuestions.slice(0, 2), true);
      
      // Generar buffer
      console.log('Generando buffer...');
      const buffer = await Packer.toBuffer(testDoc);
      console.log(`✅ Buffer generado: ${buffer.length} bytes`);
      
      // Verificar contenido del buffer
      if (buffer.length < 1000) {
        console.log('⚠️  Buffer muy pequeño, posible problema');
      }
      
      // Guardar archivo de prueba
      const testPath = './test-document.docx';
      await fs.writeFile(testPath, buffer);
      console.log(`✅ Documento de prueba guardado: ${testPath}`);
      
      // Verificar archivo
      const stats = await fs.stat(testPath);
      console.log(`   Tamaño: ${stats.size} bytes`);
      
      // Verificar header del archivo
      const header = await fs.readFile(testPath, { 
        encoding: null, 
        flag: 'r',
        start: 0,
        end: 4
      });
      
      const isPK = header[0] === 0x50 && header[1] === 0x4B;
      console.log(`   Header PK (ZIP): ${isPK ? '✅ Válido' : '❌ Inválido'}`);
      
    } catch (docError) {
      console.log(`❌ Error generando documento: ${docError.message}`);
      console.log('Stack:', docError.stack);
    }
    
    // 5. Probar con feedback simplificado
    console.log('\n' + '='.repeat(50));
    console.log('PROBANDO CON FEEDBACK SIMPLIFICADO:\n');
    
    const simplifiedQuestions = problemQuestions.map(q => ({
      ...q.dataValues,
      feedback: q.feedback
        .replace(/<[^>]+>/g, '') // Eliminar todo HTML
        .replace(/\s+/g, ' ')     // Normalizar espacios
        .trim()
    }));
    
    try {
      const simpleDoc = createDocument(simplifiedQuestions.slice(0, 2), true);
      const simpleBuffer = await Packer.toBuffer(simpleDoc);
      
      const simplePath = './test-document-simple.docx';
      await fs.writeFile(simplePath, simpleBuffer);
      
      console.log(`✅ Documento simplificado creado: ${simplePath}`);
      console.log(`   Tamaño: ${simpleBuffer.length} bytes`);
      
    } catch (simpleError) {
      console.log(`❌ Error incluso con texto simple: ${simpleError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar diagnóstico
console.log('🩺 DIAGNÓSTICO DE PROBLEMAS CON DOCUMENTOS WORD');
console.log('='.repeat(50));
diagnoseWordProblem();