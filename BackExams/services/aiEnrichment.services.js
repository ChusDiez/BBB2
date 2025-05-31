// BackExams/services/aiEnrichment.services.js
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class AIEnrichmentService {
  constructor() {
    // Debug: verificar qué keys están configuradas
    console.log('🔍 Verificando proveedores de IA:');
    console.log('   OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ No configurada');
    console.log('   Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? '✅ Configurada' : '❌ No configurada');
    
    // Inicializar clientes según configuración
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
   * Limpia los bloques de código markdown de la respuesta
   * @param {string} text - El texto a limpiar
   * @returns {string} - El texto sin bloques de código
   */
  cleanMarkdownCodeBlocks(text) {
    // Eliminar ```html al inicio y ``` al final
    let cleanedText = text;
    
    // Patrón para detectar bloques de código markdown
    const codeBlockPattern = /^```(?:html)?\s*\n?([\s\S]*?)\n?```$/;
    const match = cleanedText.match(codeBlockPattern);
    
    if (match && match[1]) {
      cleanedText = match[1];
    }
    
    // También eliminar si solo están al principio o al final
    cleanedText = cleanedText.replace(/^```(?:html)?\s*\n?/, '');
    cleanedText = cleanedText.replace(/\n?```$/, '');
    
    return cleanedText.trim();
  }

  /**
   * Enriquece el feedback con HTML usando IA
   * @param {string} originalFeedback - El feedback original
   * @param {string} question - La pregunta para contexto
   * @param {string} correctAnswer - La respuesta correcta
   * @param {string} provider - 'openai' o 'anthropic'
   * @returns {Promise<string>} - El feedback enriquecido con HTML
   */
  async enrichFeedback(originalFeedback, question, correctAnswer, provider = 'openai') {
    if (!originalFeedback || originalFeedback.trim().length === 0) {
      return originalFeedback;
    }

    const prompt = `Eres un asistente experto en educación. Tu tarea es enriquecer el siguiente feedback de una pregunta de examen con HTML para hacerlo más claro y visualmente atractivo, PERO sin cambiar el contenido del texto original.

PREGUNTA: ${question}
RESPUESTA CORRECTA: ${correctAnswer}
FEEDBACK ORIGINAL: ${originalFeedback}

INSTRUCCIONES:
1. NO cambies, añadas o elimines ninguna palabra del texto original
2. Solo añade etiquetas HTML para mejorar la presentación
3. Usa las siguientes etiquetas cuando sea apropiado:
   - <strong> o <b> para conceptos clave o respuestas
   - <em> o <i> para énfasis
   - <u> para subrayar términos importantes
   - <mark> para resaltar información crítica
   - <br> para saltos de línea donde sea necesario
   - <ul> y <li> si hay listas
   - <blockquote> para citas legales o referencias
   - <code> para artículos de ley o números
   - <span style="color: ..."> para colorear partes importantes (usa colores apropiados)
4. Mantén la estructura y párrafos originales
5. Si hay referencias a leyes o artículos, márcalos con <code>
6. Si hay explicaciones de por qué las otras opciones son incorrectas, resáltalas apropiadamente

IMPORTANTE: Devuelve ÚNICAMENTE el HTML sin ningún formato adicional. NO uses bloques de código markdown (\`\`\`), NO añadas "html" al principio, NO uses comillas. Solo el HTML puro.`;

    try {
      if (provider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
        
        // Limpiar la respuesta de posibles bloques de código
        let enrichedText = response.content[0].text.trim();
        enrichedText = this.cleanMarkdownCodeBlocks(enrichedText);
        return enrichedText;
        
      } else if (provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'Eres un asistente que enriquece texto con HTML. IMPORTANTE: Devuelve SOLO el HTML, sin bloques de código markdown (sin ```), sin comillas, sin explicaciones. Solo el HTML puro.'
          }, {
            role: 'user',
            content: prompt
          }],
          temperature: 0.3,
          max_tokens: 2000,
        });
        
        // Limpiar la respuesta de posibles bloques de código
        let enrichedText = response.choices[0].message.content.trim();
        enrichedText = this.cleanMarkdownCodeBlocks(enrichedText);
        return enrichedText;
        
      } else {
        throw new Error(`Proveedor de IA ${provider} no configurado`);
      }
    } catch (error) {
      console.error('Error al enriquecer feedback:', error);
      // En caso de error, devolver el feedback original
      return originalFeedback;
    }
  }

  /**
   * Enriquece múltiples feedbacks en lote
   * @param {Array} questions - Array de preguntas con sus feedbacks
   * @param {string} provider - 'openai' o 'anthropic'
   * @returns {Promise<Array>} - Array de feedbacks enriquecidos
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

    // Procesar en lotes para no sobrecargar la API
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < enrichmentPromises.length; i += batchSize) {
      const batch = enrichmentPromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      // Pequeña pausa entre lotes para respetar rate limits
      if (i + batchSize < enrichmentPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Verifica qué proveedores están disponibles
   * @returns {Object} - Estado de los proveedores
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