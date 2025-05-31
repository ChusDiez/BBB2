// BackExams/services/aiEnrichment.services.js - SIN DUPLICACIONES
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
   * Build the prompt that will be sent to the LLM.
   * Keeping the template in a single place makes it easier to tweak
   * without touching the core logic.
   */
  buildPrompt(originalFeedback, question, correctAnswer) {
    return `Eres un asistente experto en educación que formatea retroalimentación de exámenes.

CONTEXT INFORMATION (NO incluir en la salida):
- Pregunta: ${question}
- Respuesta correcta: ${correctAnswer}

TEXTO A FORMATEAR:
${originalFeedback}

INSTRUCCIONES:
1. Devuelve SOLO el feedback enriquecido con HTML.
2. NO repitas la pregunta ni la respuesta correcta.
3. NO añadas información nueva.
4. NO incluyas prefijos como "PREGUNTA:", "RESPUESTA:", "FEEDBACK:".
5. NO utilices bloques de código ni comillas.

GUÍA DE ESTILO:
- Leyes completas: <span style="background-color: #fff3cd; padding: 2px 4px;">TEXTO</span>
- Artículos específicos: <span style="color: #0066cc; text-decoration: underline;">TEXTO</span>
- Conceptos técnicos clave: <span style="color: #28a745; text-decoration: underline; font-weight: 600;">TEXTO</span>
- Definiciones importantes: <span style="background-color: #f8f9ff; padding: 2px 4px;">TEXTO</span>
- Datos numéricos / estadísticas / porcentajes: <span style="color: #fd7e14; font-weight: 600;">TEXTO</span>
- Elementos críticos / excepciones: <span style="color: #dc3545; font-weight: 600;">TEXTO</span>
- Términos muy importantes: <mark style="background-color: #e9ecef;">TEXTO</mark>
- Texto importante: <strong>TEXTO</strong>
- Énfasis: <em>TEXTO</em>
- Subrayado: <u>TEXTO</u>

IMPORTANTE: Devuelve **SOLO** el HTML enriquecido, sin ningún otro texto.`;
  }

  async enrichFeedback(originalFeedback, question, correctAnswer, provider = 'openai') {
    if (!originalFeedback || originalFeedback.trim().length === 0) {
      return originalFeedback;
    }

    const prompt = this.buildPrompt(originalFeedback, question, correctAnswer);

    try {
      let enrichedText;
      
      if (provider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
        
        enrichedText = response.content[0].text.trim();
        
      } else if (provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'Eres un asistente especializado en formatear feedback de exámenes. Devuelve únicamente el HTML enriquecido siguiendo la guía de estilo. No repitas pregunta ni respuesta, no añadas información adicional, sin bloques de código ni comillas.'
          }, {
            role: 'user',
            content: prompt
          }],
          temperature: 0.2,
          max_tokens: 1024,
        });
        
        enrichedText = response.choices[0].message.content.trim();
        
      } else {
        throw new Error(`Proveedor de IA ${provider} no configurado`);
      }
      
      // Limpiar bloques de código si existen
      enrichedText = this.cleanMarkdownCodeBlocks(enrichedText);
      
      // VALIDACIÓN ADICIONAL: Eliminar cualquier prefijo no deseado que se haya colado
      enrichedText = enrichedText.replace(/^(PREGUNTA|RESPUESTA CORRECTA|FEEDBACK|RETROALIMENTACIÓN|FEEDBACK ORIGINAL):\s*/gi, '');
      
      // Si el texto comienza con estos patrones, eliminarlos
      enrichedText = enrichedText.replace(/^.*?PREGUNTA:.*?RESPUESTA CORRECTA:.*?FEEDBACK\s*ORIGINAL?\s*:\s*/is, '');
      
      // Eliminar si hay múltiples secciones
      if (enrichedText.includes('PREGUNTA:') || enrichedText.includes('RESPUESTA CORRECTA:')) {
        // Buscar el último ":" después de estos prefijos y tomar solo lo que viene después
        const lastColonIndex = Math.max(
          enrichedText.lastIndexOf('FEEDBACK:'),
          enrichedText.lastIndexOf('RETROALIMENTACIÓN:'),
          enrichedText.lastIndexOf('FEEDBACK ORIGINAL:')
        );
        
        if (lastColonIndex > -1) {
          enrichedText = enrichedText.substring(lastColonIndex + 1).trim();
        }
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
          provider
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

    const batchSize = 3;
    const results = [];
    
    for (let i = 0; i < enrichmentPromises.length; i += batchSize) {
      const batch = enrichmentPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      if (i + batchSize < enrichmentPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
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