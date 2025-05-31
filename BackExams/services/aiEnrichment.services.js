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

// Luego, modifica el método enrichFeedback para usar esta corrección:
async enrichFeedback(originalFeedback, question, correctAnswer, provider = 'openai') {
  if (!originalFeedback || originalFeedback.trim().length === 0) {
    return originalFeedback;
  }

  // ... código del prompt existente ...

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
      enrichedText = this.fixHtmlSyntax(enrichedText); // AÑADIR ESTA LÍNEA
      return enrichedText;
      
    } else if (provider === 'openai' && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Eres un asistente que enriquece texto con HTML semánticamente estructurado para documentos educativos de Word. Usa colores oscuros y contrastados, evita colores muy claros. IMPORTANTE: Devuelve SOLO el HTML, sin bloques de código markdown, sin comillas, sin explicaciones. Solo el HTML puro optimizado para Word. USA PUNTO Y COMA (;) para separar propiedades CSS, NO comas.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.2,
        max_tokens: 2500,
      });
      
      let enrichedText = response.choices[0].message.content.trim();
      enrichedText = this.cleanMarkdownCodeBlocks(enrichedText);
      enrichedText = this.fixHtmlSyntax(enrichedText); // AÑADIR ESTA LÍNEA
      return enrichedText;
      
    } else {
      throw new Error(`Proveedor de IA ${provider} no configurado`);
    }
  } catch (error) {
    console.error('Error al enriquecer feedback:', error);
    return originalFeedback;
  }
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

IMPORTANTE SINTAXIS HTML:
- USA PUNTO Y COMA (;) para separar propiedades CSS, NUNCA comas (,)
- USA COMILLAS DOBLES (") para atributos, no comillas simples (')
- NO pongas punto y coma al final del último estilo
- Formato correcto: style="propiedad1: valor1; propiedad2: valor2"

INSTRUCCIONES:
1. Devuelve SOLO el feedback enriquecido con HTML.
2. NO repitas la pregunta ni la respuesta correcta.
3. NO añadas información nueva.
4. NO incluyas prefijos como "PREGUNTA:", "RESPUESTA:", "FEEDBACK:".
5. NO utilices bloques de código ni comillas.

ELEMENTOS ESTRUCTURALES (colores OSCUROS y CONTRASTADOS):
- Leyes completas (Ley 8/2011, LO 4/2015, RD 704/2011): <span style="background-color: #FFD700; color: #000000; padding: 2px 6px; border-radius: 3px; font-weight: 700; border: 1px solid #DAA520">TEXTO</span>
- Artículos específicos (art. 36.23, artículo 4.3): <span style="background-color: #87CEEB; color: #000080; padding: 2px 6px; border-radius: 3px; font-weight: 700; border: 1px solid #4682B4">TEXTO</span>
- Conceptos técnicos clave: <span style="background-color: #98FB98; color: #006400; padding: 2px 6px; border-radius: 3px; font-weight: 600; border: 1px solid #32CD32">TEXTO</span>

ELEMENTOS SEMÁNTICOS DESTACADOS:
- Definiciones importantes: <span style="background-color: #FFE4E1; color: #8B0000; padding: 2px 6px; border-radius: 3px; font-weight: 600; border: 1px solid #CD5C5C">TEXTO</span>
- Datos numéricos/estadísticas/porcentajes: <span style="background-color: #FFA500; color: #FFFFFF; padding: 2px 6px; border-radius: 3px; font-weight: 700; border: 1px solid #FF8C00">TEXTO</span>
- Elementos críticos/excepciones: <span style="background-color: #FF6347; color: #FFFFFF; padding: 2px 6px; border-radius: 3px; font-weight: 700; border: 1px solid #DC143C">TEXTO</span>
- Términos muy importantes: <mark style="background-color: #FFFF00; color: #000000; padding: 2px 6px; font-weight: 600; border: 1px solid #FFD700">TEXTO</mark>
ELEMENTOS BÁSICOS MEJORADOS:
- Texto muy importante: <strong style="color: #000080">TEXTO</strong>
- Énfasis medio: <em style="color: #8B4513">TEXTO</em>
- Subrayado simple: <u style="color: #4B0082; text-decoration-color: #4B0082">TEXTO</u>

EJEMPLOS DE SINTAXIS CORRECTA:
✅ CORRECTO: <span style="background-color: #FFD700; color: #000000; padding: 2px 6px">Ley 8/2011</span>
❌ INCORRECTO: <span style='background-color: #FFD700, color: #000000, padding: 2px 6px,'>Ley 8/2011</span>

✅ CORRECTO: <strong style="color: #000080">Presidencia</strong>
❌ INCORRECTO: <strong style='color: #000080,'>Presidencia</strong>

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