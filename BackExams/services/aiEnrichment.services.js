// BackExams/services/aiEnrichment.services.js - VERSIÓN COMPLETA CON CONTENEDORES
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class AIEnrichmentService {
  constructor() {
    console.log('🔍 Verificando proveedores de IA:');
    console.log('   OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ No configurada');
    console.log('   Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? '✅ Configurada' : '❌ No configurada');
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Determina el esquema de colores según el tema
   * @param {number} topic - Número del tema
   * @returns {Object} - Colores de fondo y borde
   */
  getColorSchemeByTopic(topic) {
    const topicNum = parseInt(topic);
    
    if (topicNum >= 1 && topicNum <= 26) {
      // Temas Jurídicos - Rojo
      return {
        backgroundColor: '#fff5f5',  // Rojo muy claro
        borderColor: '#dc3545',      // Rojo
        blockName: 'JURÍDICAS'
      };
    } else if (topicNum >= 27 && topicNum <= 37) {
      // Temas Sociales - Azul
      return {
        backgroundColor: '#f0f8ff',  // Azul muy claro
        borderColor: '#0073e6',      // Azul
        blockName: 'CIENCIAS SOCIALES'
      };
    } else if (topicNum >= 38 && topicNum <= 45) {
      // Temas Técnico-Científicos - Verde
      return {
        backgroundColor: '#f0fff4',  // Verde muy claro
        borderColor: '#28a745',      // Verde
        blockName: 'TÉCNICO-CIENTÍFICAS'
      };
    } else {
      // Por defecto - Gris
      return {
        backgroundColor: '#f8f9fa',
        borderColor: '#6c757d',
        blockName: 'GENERAL'
      };
    }
  }

  cleanMarkdownCodeBlocks(text) {
    let cleanedText = text;
    const codeBlockPattern = /^```(?:html)?\s*\n?([\s\S]*?)\n?```$/;
    const match = cleanedText.match(codeBlockPattern);
    
    if (match && match[1]) {
      cleanedText = match[1];
    }
    
    cleanedText = cleanedText.replace(/^```(?:html)?\s*\n?/, '');
    cleanedText = cleanedText.replace(/\n?```$/, '');
    
    return cleanedText.trim();
  }

  fixHtmlSyntax(html) {
    if (!html) return html;
    
    let fixed = html;
    
    // Corregir comas por punto y coma en estilos
    // Buscar todos los atributos style y corregirlos
    fixed = fixed.replace(/style\s*=\s*['"]([^'"]+)['"]/gi, (match, styleContent) => {
      // Dentro del style, reemplazar comas por punto y coma
      let correctedStyle = styleContent
        .replace(/,\s*(?=[\w-]+:)/g, '; ') // Coma seguida de propiedad CSS
        .replace(/,\s*$/g, '') // Eliminar coma al final
        .replace(/,\s*'/g, "'") // Eliminar coma antes de comilla de cierre
        .replace(/;\s*;/g, ';') // Eliminar punto y coma duplicados
        .trim();
      
      // Asegurar que termine sin punto y coma extra
      if (correctedStyle.endsWith(';')) {
        correctedStyle = correctedStyle.slice(0, -1);
      }
      
      return `style="${correctedStyle}"`;
    });
    
    // Cambiar comillas simples por dobles en atributos
    fixed = fixed.replace(/(\w+)\s*=\s*'([^']*)'/g, '$1="$2"');
    
    return fixed;
  }

buildPrompt(originalFeedback, question, correctAnswer, colorScheme) {
  return `Eres un asistente experto en educación y derecho español que formatea retroalimentación de exámenes con precisión académica.

CONTEXTO DEL EXAMEN:
- Pregunta: ${question}
- Respuesta correcta: ${correctAnswer}
- Bloque temático: ${colorScheme.blockName}

TEXTO A ENRIQUECER:
${originalFeedback}

INSTRUCCIONES DE FORMATO:

1. CONTENEDOR OBLIGATORIO:
<div style="background-color:${colorScheme.backgroundColor};border-left:6px solid ${colorScheme.borderColor};font-family:Arial,sans-serif;margin:20px 0;padding:15px;">

2. IDENTIFICACIÓN INTELIGENTE DE ELEMENTOS:
Analiza el contexto para identificar correctamente:
- Referencias legales completas (incluyendo variantes como "L.O.", "RD", "Real Decreto-ley")
- Artículos con sus apartados (ej: "art. 36.2.a)", "artículo 4 bis")
- Conceptos jurídicos y técnicos relevantes al tema
- Fechas importantes y plazos legales
- Porcentajes y datos estadísticos

3. APLICACIÓN DE ESTILOS CONTEXTUAL:
- Leyes y normas: <span style="background-color:#FFD700;color:#000000;padding:2px 6px;border-radius:3px;font-weight:700;border:1px solid #DAA520">TEXTO</span>
- Artículos y referencias: <span style="background-color:#87CEEB;color:#000080;padding:2px 6px;border-radius:3px;font-weight:700;border:1px solid #4682B4">TEXTO</span>
- Conceptos clave del ${colorScheme.blockName}: <span style="background-color:#98FB98;color:#006400;padding:2px 6px;border-radius:3px;font-weight:600;border:1px solid #32CD32">TEXTO</span>

4. PRESERVACIÓN SEMÁNTICA:
- Mantén EXACTAMENTE el mismo contenido textual
- No corrijas ortografía ni gramática
- Preserva la estructura de párrafos original
- Si hay enumeraciones o listas, conviértelas a <ul> o <ol>

5. VALIDACIÓN TÉCNICA:
- Sintaxis CSS: usar SOLO punto y coma (;) entre propiedades
- Atributos HTML: usar SOLO comillas dobles (")
- Cerrar TODOS los tags correctamente
- NO incluir punto y coma al final del último estilo

FORMATO DE SALIDA:
Devuelve ÚNICAMENTE el HTML completo con el div contenedor. No incluyas explicaciones ni metadatos.`;
}

  async enrichFeedback(originalFeedback, question, correctAnswer, provider = 'openai', topic = null) {
    if (!originalFeedback || originalFeedback.trim().length === 0) {
      return originalFeedback;
    }

    // Obtener esquema de colores según el tema
    const colorScheme = this.getColorSchemeByTopic(topic || 1);
    
    const prompt = this.buildPrompt(originalFeedback, question, correctAnswer, colorScheme);

    try {
      let enrichedText;
      
      if (provider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2048,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
        
        enrichedText = response.content[0].text.trim();
        
      } else if (provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'Eres un asistente especializado en formatear feedback educativo. SIEMPRE debes envolver el contenido en un div contenedor con el estilo especificado. Devuelve únicamente el HTML completo. USA PUNTO Y COMA (;) para separar propiedades CSS, NO comas.'
          }, {
            role: 'user',
            content: prompt
          }],
          temperature: 0.1,
          max_tokens: 2048,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        });
        
        enrichedText = response.choices[0].message.content.trim();
        
      } else {
        throw new Error(`Proveedor de IA ${provider} no configurado`);
      }
      
      // Limpiar bloques de código si existen
      enrichedText = this.cleanMarkdownCodeBlocks(enrichedText);
      
      // Corregir sintaxis HTML si es necesario
      enrichedText = this.fixHtmlSyntax(enrichedText);
      
      // VALIDACIÓN ADICIONAL: Eliminar cualquier prefijo no deseado
      enrichedText = enrichedText.replace(/^(PREGUNTA|RESPUESTA CORRECTA|FEEDBACK|RETROALIMENTACIÓN|FEEDBACK ORIGINAL):\s*/gi, '');
      
      // Validar que tenga el div contenedor
      if (!enrichedText.includes('<div style=')) {
        console.warn('⚠️ La respuesta no incluye el div contenedor, añadiéndolo...');
        enrichedText = `<div style="background-color:${colorScheme.backgroundColor};border-left:6px solid ${colorScheme.borderColor};font-family:Arial,sans-serif;margin:20px 0;padding:15px;">
${enrichedText}
</div>`;
      }
      
      return enrichedText;
      
    } catch (error) {
      console.error('Error al enriquecer feedback:', error);
      return originalFeedback;
    }
  }

  async enrichMultipleFeedbacks(questions, provider = 'openai') {
    const enrichmentPromises = questions.map(async (q) => {
      if (!q.feedback || q.feedback.trim().length === 0) {
        return {
          id: q.id,
          enrichedFeedback: q.feedback,
          status: 'skipped',
          reason: 'No hay feedback para enriquecer'
        };
      }

      try {
        const enrichedFeedback = await this.enrichFeedback(
          q.feedback,
          q.question,
          q.correctAnswer,
          provider,
          q.topic // Pasar el tema para determinar colores
        );
        
        return {
          id: q.id,
          enrichedFeedback,
          status: 'success'
        };
      } catch (error) {
        return {
          id: q.id,
          enrichedFeedback: q.feedback,
          status: 'error',
          error: error.message
        };
      }
    });

    const batchSize = 3; // Reducido para mejor calidad
    const results = [];
    
    for (let i = 0; i < enrichmentPromises.length; i += batchSize) {
      const batch = enrichmentPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      if (i + batchSize < enrichmentPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Pausa más larga
      }
    }

    return results;
  }

  getAvailableProviders() {
    return {
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      hasAny: !!this.openai || !!this.anthropic
    };
  }
}

export default AIEnrichmentService;