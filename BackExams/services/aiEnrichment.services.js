// BackExams/services/aiEnrichment.services.js - COLORES MEJORADOS PARA WORD
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

  async enrichFeedback(originalFeedback, question, correctAnswer, provider = 'openai') {
    if (!originalFeedback || originalFeedback.trim().length === 0) {
      return originalFeedback;
    }

    const prompt = `Eres un asistente experto en educación y diseño de documentos. Tu tarea es enriquecer el siguiente feedback de una pregunta de examen con HTML semánticamente estructurado y optimizado para documentos Word.

PREGUNTA: ${question}
RESPUESTA CORRECTA: ${correctAnswer}
FEEDBACK ORIGINAL: ${originalFeedback}

INSTRUCCIONES DE FORMATO MEJORADAS PARA WORD:
1. NO cambies, añadas o elimines ninguna palabra del texto original
2. Aplica estos estilos HTML optimizados para documentos Word:

ELEMENTOS ESTRUCTURALES (colores oscuros para buena legibilidad):
- Leyes completas (Ley 8/2011, LO 4/2015, RD 704/2011): <span style="background-color: #ffffcc; padding: 1px 4px; border-radius: 2px; font-weight: 600;">TEXTO</span>
- Artículos específicos (art. 36.23, artículo 4.3): <span style="color: #003399; text-decoration: underline; font-weight: 600;">TEXTO</span>
- Conceptos técnicos clave: <span style="color: #006600; text-decoration: underline; font-weight: 500;">TEXTO</span>

ELEMENTOS SEMÁNTICOS:
- Definiciones importantes: <span style="background-color: #f0f8ff; padding: 1px 4px; border-radius: 2px; font-weight: 500;">TEXTO</span>
- Datos numéricos/estadísticas/porcentajes: <span style="color: #cc5500; font-weight: 700;">TEXTO</span>
- Elementos críticos/excepciones: <span style="color: #990000; font-weight: 700;">TEXTO</span>
- Términos muy importantes destacados por contexto: <mark style="background-color: #f5f5f5; padding: 1px 3px; font-weight: 500;">TEXTO</mark>

ELEMENTOS BÁSICOS:
- Texto muy importante: <strong>TEXTO</strong>
- Énfasis medio: <em>TEXTO</em>
- Subrayado simple: <u>TEXTO</u>
- Saltos de línea: <br> donde sea necesario
- Listas: <ul><li>TEXTO</li></ul> si hay enumeraciones
- Citas textuales: <blockquote style="border-left: 3px solid #003399; padding-left: 10px; margin: 5px 0; font-style: italic;">TEXTO</blockquote>

3. Mantén la estructura y párrafos originales, usando <br> para saltos de línea simples

4. EVITA colores muy claros como #fff3cd que se ven mal en Word. Usa colores más oscuros y contrastados.

PALETA DE COLORES OPTIMIZADA PARA WORD:
- Azul oscuro: #003399 (para artículos y títulos)
- Verde oscuro: #006600 (para conceptos técnicos)
- Naranja oscuro: #cc5500 (para datos numéricos)
- Rojo oscuro: #990000 (para elementos críticos)
- Fondos claros pero legibles: #ffffcc, #f0f8ff, #f5f5f5

EJEMPLOS DE APLICACIÓN MEJORADOS:
- "Ley 8/2011" → <span style="background-color: #ffffcc; padding: 1px 4px; border-radius: 2px; font-weight: 600;">Ley 8/2011</span>
- "art. 36.23" → <span style="color: #003399; text-decoration: underline; font-weight: 600;">art. 36.23</span>
- "50%" → <span style="color: #cc5500; font-weight: 700;">50%</span>
- "operador crítico" → <span style="color: #006600; text-decoration: underline; font-weight: 500;">operador crítico</span>

IMPORTANTE: Devuelve ÚNICAMENTE el HTML sin formato adicional, sin bloques de código markdown, sin comillas, sin explicaciones. Solo el HTML puro optimizado para Word.`;

    try {
      if (provider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2500,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
        
        let enrichedText = response.content[0].text.trim();
        enrichedText = this.cleanMarkdownCodeBlocks(enrichedText);
        return enrichedText;
        
      } else if (provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'Eres un asistente que enriquece texto con HTML semánticamente estructurado para documentos educativos de Word. Usa colores oscuros y contrastados, evita colores muy claros. IMPORTANTE: Devuelve SOLO el HTML, sin bloques de código markdown, sin comillas, sin explicaciones. Solo el HTML puro optimizado para Word.'
          }, {
            role: 'user',
            content: prompt
          }],
          temperature: 0.2,
          max_tokens: 2500,
        });
        
        let enrichedText = response.choices[0].message.content.trim();
        enrichedText = this.cleanMarkdownCodeBlocks(enrichedText);
        return enrichedText;
        
      } else {
        throw new Error(`Proveedor de IA ${provider} no configurado`);
      }
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