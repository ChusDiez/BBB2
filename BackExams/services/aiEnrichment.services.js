// BackExams/services/aiEnrichment.services.js
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
   * OPTIMIZADO PARA IMPRESIÓN EN PDF
   * @param {number} topic - Número del tema
   * @returns {Object} - Colores de fondo y borde
   */
  getColorSchemeByTopic(topic) {
    const topicNum = parseInt(topic);
    
    if (topicNum >= 1 && topicNum <= 26) {
      // Temas Jurídicos - Rojo (optimizado para impresión)
      return {
        backgroundColor: '#ffe6e6',  // Rojo más visible en PDF
        borderColor: '#cc0000',      // Rojo oscuro para mejor contraste
        blockName: 'JURÍDICAS'
      };
    } else if (topicNum >= 27 && topicNum <= 37) {
      // Temas Sociales - Azul (optimizado para impresión)
      return {
        backgroundColor: '#e6f2ff',  // Azul más visible en PDF
        borderColor: '#0052cc',      // Azul oscuro para mejor contraste
        blockName: 'CIENCIAS SOCIALES'
      };
    } else if (topicNum >= 38 && topicNum <= 45) {
      // Temas Técnico-Científicos - Verde (optimizado para impresión)
      return {
        backgroundColor: '#e6ffe6',  // Verde más visible en PDF
        borderColor: '#008000',      // Verde oscuro para mejor contraste
        blockName: 'TÉCNICO-CIENTÍFICAS'
      };
    } else {
      // Por defecto - Gris
      return {
        backgroundColor: '#f0f0f0',  // Gris más oscuro
        borderColor: '#333333',      // Gris muy oscuro
        blockName: 'GENERAL'
      };
    }
  }

  /**
   * Limpia bloques de código markdown de la respuesta
   */
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

  /**
   * Corrige errores comunes de sintaxis HTML/CSS
   */
  fixHtmlSyntax(html) {
    // Corregir uso de comas en lugar de punto y coma en CSS
    html = html.replace(/style="([^"]+)"/g, (match, styles) => {
      const fixedStyles = styles.replace(/,(?=\s*[a-zA-Z-]+:)/g, ';');
      return `style="${fixedStyles}"`;
    });
    
    // Asegurar que no haya punto y coma al final del último estilo
    html = html.replace(/;\s*"/g, '"');
    
    return html;
  }

  /**
   * Construye el prompt para el enriquecimiento
   */
  buildPrompt(originalFeedback, question, correctAnswer, colorScheme) {
    return `Eres un experto en educación especializado en formatear retroalimentación para exámenes. Tu tarea es enriquecer el siguiente feedback con HTML estructurado y optimizado para documentos Word que serán convertidos a PDF.

CONTEXTO DEL EXAMEN:
- PREGUNTA: ${question}
- RESPUESTA CORRECTA: ${correctAnswer}
- BLOQUE TEMÁTICO: ${colorScheme.blockName}
- FEEDBACK A ENRIQUECER: ${originalFeedback}

INSTRUCCIONES CRÍTICAS:

1. ESTRUCTURA OBLIGATORIA:
Debes SIEMPRE envolver TODO el contenido en un div contenedor con estos estilos EXACTOS:
<div style="background-color:${colorScheme.backgroundColor};border-left:6px solid ${colorScheme.borderColor};font-family:Arial,sans-serif;margin:20px 0;padding:15px;">
  [CONTENIDO ENRIQUECIDO AQUÍ]
</div>

2. PRESERVACIÓN DEL CONTENIDO:
- NO cambies, añadas o elimines NINGUNA palabra del texto original
- Mantén EXACTAMENTE la misma redacción
- Preserva números, fechas y referencias tal como están
- No corrijas ortografía ni gramática

3. APLICACIÓN DE ESTILOS CONTEXTUAL OPTIMIZADOS PARA IMPRESIÓN:
- Leyes y normas: <span style="background-color:#FFD700;color:#000000;padding:2px 6px;border-radius:3px;font-weight:700;border:1px solid #B8860B">TEXTO</span>
- Artículos y referencias: <span style="background-color:#87CEEB;color:#00008B;padding:2px 6px;border-radius:3px;font-weight:700;border:1px solid #4682B4">TEXTO</span>
- Conceptos clave del ${colorScheme.blockName}: <span style="background-color:#90EE90;color:#006400;padding:2px 6px;border-radius:3px;font-weight:600;border:1px solid #228B22">TEXTO</span>
- Definiciones importantes: <span style="background-color:#DDA0DD;color:#4B0082;padding:2px 6px;border-radius:3px;font-weight:600;border:1px solid #8B008B">TEXTO</span>
- Fechas y plazos: <span style="background-color:#FFB6C1;color:#8B0000;padding:2px 6px;border-radius:3px;font-weight:600;border:1px solid #DC143C">TEXTO</span>

4. ELEMENTOS ESTRUCTURALES:
- Usa <strong> para términos muy importantes
- Usa <em> para énfasis suave
- Si hay enumeraciones, conviértelas a <ul> o <ol> con margin-left:20px
- Separa párrafos con <p> tags

5. VALIDACIÓN TÉCNICA:
- Sintaxis CSS: usar SOLO punto y coma (;) entre propiedades
- Atributos HTML: usar SOLO comillas dobles (")
- Cerrar TODOS los tags correctamente
- NO incluir punto y coma al final del último estilo

FORMATO DE SALIDA:
Devuelve ÚNICAMENTE el HTML completo con el div contenedor. No incluyas explicaciones ni metadatos.`;
  }

  /**
   * Enriquece un feedback individual
   */
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
          model: 'claude-3-5-sonnet-20241022', // Claude Sonnet 4
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
            content: 'Eres un asistente especializado en formatear feedback educativo para documentos que serán impresos. SIEMPRE debes envolver el contenido en un div contenedor con el estilo especificado. Devuelve únicamente el HTML completo. USA PUNTO Y COMA (;) para separar propiedades CSS, NO comas. Los colores deben ser visibles al imprimir.'
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

  /**
   * Enriquece múltiples feedbacks en lote
   */
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

  /**
   * Obtiene los proveedores disponibles
   */
  getAvailableProviders() {
    return {
      openai: !!this.openai,
      anthropic: !!this.anthropic,
      hasAny: !!this.openai || !!this.anthropic
    };
  }
}

export default AIEnrichmentService;