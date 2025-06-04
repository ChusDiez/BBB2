// BackExams/scripts/validate-and-fix-html-v2.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function validateAndFixHtml() {
  console.log('🔍 Iniciando validación y corrección de HTML en feedbacks...\n');
  
  try {
    await startTables();
    
    // Obtener todas las preguntas con feedback que contenga posible HTML
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.or]: [
              { [Op.like]: '%<%' },
              { [Op.like]: '%>%' }
            ]}
          ]
        }
      }
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas con posible HTML\n`);
    
    // Buscar específicamente el problema del ejemplo
    const withUnclosedU = await Questions.findAll({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.like]: '%<u%' },
            { [Op.like]: '%art. 9%' },
            { [Op.like]: '%4/2015%' }
          ]
        }
      }
    });
    
    if (withUnclosedU.length > 0) {
      console.log(`🎯 Encontrada la pregunta del ejemplo (art. 9 LO 4/2015)\n`);
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    const htmlErrors = [];
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
    
    // Función mejorada para validar y corregir HTML
    const validateAndFixHtmlContent = (html) => {
      if (!html) return null;
      
      let fixed = html;
      
      // 1. Primero, corregir el problema específico del tag <u style="...>
      // Buscar patrones donde falta el cierre de comillas o el cierre del tag
      fixed = fixed.replace(/<u\s+style="([^">]+)(?!["'])([^>]*)>/g, (match, style, rest) => {
        console.log(`   🔧 Corrigiendo tag <u> mal formado`);
        // Si el estilo no termina con comilla, añadirla
        return `<u style="${style}">`;
      });
      
      // 2. Escapar caracteres < y > que no son parte de tags HTML válidos
      // Por ejemplo: "< 5" → "&lt; 5"
      fixed = fixed.replace(/(<)\s+(\d)/g, '&lt; $2');
      fixed = fixed.replace(/(\d)\s+(>)/g, '$1 &gt;');
      
      // 3. Detectar y corregir tags no cerrados (excepto auto-cerrados)
      const openTags = [];
      const tagRegex = /<(\/?)([\w]+)([^>]*)>/g;
      let match;
      const tagPositions = [];
      
      // Recolectar información sobre todos los tags
      while ((match = tagRegex.exec(fixed)) !== null) {
        const [fullMatch, isClosing, tagName, attributes] = match;
        const lowerTagName = tagName.toLowerCase();
        
        tagPositions.push({
          fullMatch,
          isClosing: !!isClosing,
          tagName: lowerTagName,
          position: match.index,
          isSelfClosing: selfClosingTags.includes(lowerTagName)
        });
      }
      
      // Analizar estructura de tags
      const unclosedTags = [];
      const tagStack = [];
      
      tagPositions.forEach(tag => {
        if (!tag.isClosing && !tag.isSelfClosing) {
          // Tag de apertura que necesita cierre
          tagStack.push(tag);
        } else if (tag.isClosing) {
          // Tag de cierre
          const lastIndex = tagStack.findLastIndex(t => t.tagName === tag.tagName);
          if (lastIndex >= 0) {
            tagStack.splice(lastIndex, 1);
          }
        }
      });
      
      // Los tags que quedan en el stack no están cerrados
      if (tagStack.length > 0) {
        console.log(`   ⚠️  Encontrados ${tagStack.length} tags no cerrados`);
        tagStack.reverse().forEach(tag => {
          console.log(`      - <${tag.tagName}> en posición ${tag.position}`);
          fixed += `</${tag.tagName}>`;
        });
      }
      
      // 4. Corregir atributos mal formados
      fixed = fixed.replace(/<(\w+)([^>]*)>/g, (match, tagName, attributes) => {
        if (!attributes || attributes.trim() === '') return match;
        
        let fixedAttrs = attributes;
        
        // Corregir style con comillas no cerradas
        fixedAttrs = fixedAttrs.replace(/style\s*=\s*"([^"]*?)(?=\s|>|$)/g, (m, styleContent) => {
          // Si no termina con comilla, añadirla
          if (!m.endsWith('"')) {
            return `style="${styleContent}"`;
          }
          return m;
        });
        
        // Corregir otros atributos con comillas no cerradas
        fixedAttrs = fixedAttrs.replace(/(\w+)\s*=\s*["']([^"']*?)(?=\s|>|$)/g, (m, attr, value) => {
          if (!m.endsWith('"') && !m.endsWith("'")) {
            return `${attr}="${value}"`;
          }
          return m;
        });
        
        return `<${tagName}${fixedAttrs}>`;
      });
      
      // 5. Validación final de sintaxis CSS en estilos
      fixed = fixed.replace(/style="([^"]*)"/g, (match, styles) => {
        let fixedStyles = styles;
        
        // Asegurar que las propiedades CSS estén bien formadas
        fixedStyles = fixedStyles.split(';').map(prop => {
          const trimmed = prop.trim();
          if (!trimmed) return '';
          
          // Verificar que tenga el formato propiedad:valor
          if (!trimmed.includes(':')) return '';
          
          const [property, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          
          if (!property || !value) return '';
          
          return `${property.trim()}:${value}`;
        }).filter(s => s).join(';');
        
        return `style="${fixedStyles}"`;
      });
      
      return fixed;
    };
    
    // Función para verificar si el HTML es válido
    const isValidHtml = (html) => {
      try {
        const tagStack = [];
        const tagRegex = /<(\/?)([\w]+)([^>]*)>/g;
        let match;
        
        while ((match = tagRegex.exec(html)) !== null) {
          const [, isClosing, tagName] = match;
          const lowerTagName = tagName.toLowerCase();
          
          // Ignorar tags auto-cerrados
          if (selfClosingTags.includes(lowerTagName)) continue;
          
          if (!isClosing) {
            tagStack.push(lowerTagName);
          } else {
            const expected = tagStack.pop();
            if (expected !== lowerTagName) {
              return false;
            }
          }
        }
        
        return tagStack.length === 0;
      } catch (e) {
        return false;
      }
    };
    
    // Procesar cada pregunta
    for (const question of questions) {
      try {
        const originalFeedback = question.feedback;
        
        // Verificar si el HTML actual es válido
        const isValid = isValidHtml(originalFeedback);
        if (!isValid) {
          htmlErrors.push({
            id: question.id,
            preview: originalFeedback.substring(0, 100) + '...'
          });
        }
        
        const fixedFeedback = validateAndFixHtmlContent(originalFeedback);
        
        // Verificar si hubo cambios
        if (originalFeedback !== fixedFeedback) {
          // Validar que el HTML corregido sea válido
          if (isValidHtml(fixedFeedback)) {
            await question.update({ feedback: fixedFeedback });
            fixedCount++;
            
            console.log(`✅ Pregunta ID ${question.id} - HTML corregido y validado`);
            
            // Mostrar detalles si es la pregunta del ejemplo
            if (originalFeedback.includes('art. 9') && originalFeedback.includes('4/2015')) {
              console.log('\n📝 Corrección del ejemplo específico:');
              console.log('   ANTES:');
              console.log('   ' + originalFeedback.substring(0, 300) + '...\n');
              console.log('   DESPUÉS:');
              console.log('   ' + fixedFeedback.substring(0, 300) + '...\n');
            }
          } else {
            console.log(`⚠️  Pregunta ID ${question.id} - No se pudo corregir completamente`);
            errorCount++;
          }
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error en pregunta ID ${question.id}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de validación y corrección:');
    console.log(`   ✅ Feedbacks corregidos: ${fixedCount}`);
    console.log(`   ⏭️  Feedbacks sin cambios: ${questions.length - fixedCount - errorCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   ⚠️  HTML inválido detectado: ${htmlErrors.length}`);
    
    if (htmlErrors.length > 0 && htmlErrors.length <= 10) {
      console.log('\n⚠️  Preguntas con HTML inválido:');
      htmlErrors.forEach(error => {
        console.log(`   • ID ${error.id}: ${error.preview}`);
      });
    }
    
    // Buscar específicamente tags <u> mal formados
    console.log('\n🔍 Análisis adicional - Tags <u> problemáticos:');
    const problematicU = questions.filter(q => {
      const feedback = q.feedback || '';
      return feedback.includes('<u') && (
        feedback.match(/<u\s+style="[^"]*[^">]>/g) || // Style sin cerrar comillas
        (feedback.match(/<u/g) || []).length !== (feedback.match(/<\/u>/g) || []).length // Número diferente de apertura y cierre
      );
    });
    
    console.log(`   Encontradas ${problematicU.length} preguntas con posibles problemas en tags <u>`);
    
    if (problematicU.length > 0 && problematicU.length <= 5) {
      problematicU.forEach(q => {
        console.log(`   • ID ${q.id}: ${q.feedback.substring(0, 80)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar validación
console.log('='.repeat(60));
console.log('🔧 VALIDACIÓN Y CORRECCIÓN DE HTML EN FEEDBACKS V2');
console.log('='.repeat(60));
console.log('Este script:');
console.log('  • Detecta HTML inválido (tags no cerrados, atributos mal formados)');
console.log('  • Maneja correctamente tags auto-cerrados como <br>');
console.log('  • Corrige específicamente tags <u> mal formados');
console.log('  • Escapa caracteres < y > que no son parte de tags');
console.log('  • Valida la estructura final\n');

validateAndFixHtml();