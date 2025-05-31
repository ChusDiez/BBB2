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

    const prompt = `Eres un asistente experto en educación. Tu tarea es tomar el siguiente texto de feedback y ÚNICAMENTE añadirle formato HTML para mejorar su presentación visual.

TEXTO A FORMATEAR:
${originalFeedback}

REGLAS ESTRICTAS:
1. NUNCA añadas texto nuevo, títulos, prefijos como "PREGUNTA:", "RESPUESTA CORRECTA:", "FEEDBACK:", etc.
2. NUNCA incluyas la pregunta ni la respuesta correcta en tu respuesta
3. Solo devuelve el texto original con etiquetas HTML añadidas
4. Usa estas etiquetas HTML cuando sea apropiado:
   - <strong> o <b> para conceptos clave
   - <em> o <i> para énfasis
   - <u> para subrayar términos importantes
   - <mark> para resaltar información crítica
   - <br> para saltos de línea donde sea necesario
   - <ul> y <li> si hay listas
   - <blockquote> para citas legales
   - <code> para artículos de ley o números
   - <span style="color: ..."> para colorear (usa colores apropiados)
5. Respeta EXACTAMENTE el texto original, solo añade formato

CRÍTICO: Tu respuesta debe ser SOLO el texto del feedback con formato HTML. Nada más. No añadas ningún texto que no esté en el feedback original.`;

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
            content: 'Eres un asistente que formatea texto con HTML. NUNCA añadas texto nuevo como "PREGUNTA:", "RESPUESTA:", "FEEDBACK:", etc. Solo devuelve el texto original con formato HTML añadido. No uses bloques de código markdown, no uses comillas, solo HTML puro.'
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
    console.log(`📋 Iniciando enriquecimiento de ${questions.length} preguntas con ${provider}`);
    
    const results = [];
    const batchSize = 3; // Reducimos el tamaño del lote para más estabilidad
    
    // Procesar las preguntas en lotes secuenciales
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      console.log(`   Procesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(questions.length/batchSize)} (preguntas ${i + 1}-${Math.min(i + batchSize, questions.length)})`);
      
      // Procesar cada pregunta del lote
      const batchPromises = batch.map(async (q) => {
        if (!q.feedback || q.feedback.trim().length === 0) {
          return {
            id: q.id,
            enrichedFeedback: q.feedback,
            status: 'skipped',
            reason: 'No hay feedback para enriquecer'
          };
        }

        // Verificar si el feedback ya está enriquecido (contiene HTML)
        if (q.feedback.includes('<') && q.feedback.includes('>')) {
          return {
            id: q.id,
            enrichedFeedback: q.feedback,
            status: 'skipped',
            reason: 'El feedback ya parece estar enriquecido con HTML'
          };
        }

        try {
          const enrichedFeedback = await this.enrichFeedback(
            q.feedback,
            q.question,
            q.correctAnswer,
            provider
          );
          
          console.log(`      ✅ Pregunta ID ${q.id} enriquecida`);
          
          return {
            id: q.id,
            enrichedFeedback,
            status: 'success'
          };
        } catch (error) {
          console.error(`      ❌ Error en pregunta ID ${q.id}:`, error.message);
          return {
            id: q.id,
            enrichedFeedback: q.feedback,
            status: 'error',
            error: error.message
          };
        }
      });
      
      // Esperar a que termine el lote actual
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Pausa entre lotes para respetar rate limits (2 segundos para OpenAI, 1 para Anthropic)
      if (i + batchSize < questions.length) {
        const delay = provider === 'openai' ? 2000 : 1000;
        console.log(`   ⏸️  Pausando ${delay/1000}s antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Resumen final
    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log('\n📊 Resumen del enriquecimiento:');
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ⏭️  Omitidos: ${skippedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);

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