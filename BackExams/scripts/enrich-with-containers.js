// BackExams/scripts/enrich-with-containers.js - VERSIÓN CORREGIDA
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import AIEnrichmentService from '../services/aiEnrichment.services.js';
import startTables from '../utils/initializeDatabase.js';

async function enrichWithContainers() {
  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);
  const provider = args[0] || 'openai';
  const limit = args[1] ? parseInt(args[1]) : null;
  const startTopic = args[2] ? parseInt(args[2]) : 1;
  const endTopic = args[3] ? parseInt(args[3]) : 45;
  
  console.log('🚀 Iniciando enriquecimiento con contenedores por tema\n');
  console.log(`   Proveedor: ${provider.toUpperCase()}`);
  console.log(`   Límite: ${limit || 'Todas las preguntas'}`);
  console.log(`   Temas: ${startTopic} al ${endTopic}`);
  console.log(`   🔴 Jurídicas (1-26): Contenedor rojo`);
  console.log(`   🔵 Sociales (27-37): Contenedor azul`);
  console.log(`   🟢 Técnico-Científicas (38-45): Contenedor verde\n`);
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Inicializar servicio de IA
    const aiService = new AIEnrichmentService();
    
    // Verificar disponibilidad del proveedor
    const providers = aiService.getAvailableProviders();
    if (!providers[provider]) {
      console.error(`❌ El proveedor ${provider} no está configurado`);
      console.log('   Proveedores disponibles:', Object.keys(providers).filter(p => providers[p]).join(', '));
      process.exit(1);
    }
    
    // Obtener preguntas con feedback que NO tengan ya un contenedor
    const whereClause = {
      feedback: {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.notLike]: '%<div style=%' } // No tiene contenedor aún
        ]
      },
      topic: {
        [Op.between]: [startTopic, endTopic]
      }
    };
    
    const queryOptions = {
      where: whereClause,
      order: [['topic', 'ASC'], ['id', 'ASC']]
    };
    
    if (limit) {
      queryOptions.limit = limit;
    }
    
    const questions = await Questions.findAll(queryOptions);
    
    if (questions.length === 0) {
      console.log('✅ No hay preguntas con feedback pendientes de contenedor en el rango especificado');
      process.exit(0);
    }
    
    console.log(`📊 Encontradas ${questions.length} preguntas para enriquecer\n`);
    
    // Agrupar por tema para mostrar progreso
    const questionsByTopic = {};
    questions.forEach(q => {
      if (!questionsByTopic[q.topic]) {
        questionsByTopic[q.topic] = [];
      }
      questionsByTopic[q.topic].push(q);
    });
    
    console.log('📋 Distribución por temas:');
    Object.keys(questionsByTopic).sort((a, b) => parseInt(a) - parseInt(b)).forEach(topic => {
      const count = questionsByTopic[topic].length;
      const topicNum = parseInt(topic);
      let emoji = '⚪';
      if (topicNum <= 26) emoji = '🔴';
      else if (topicNum <= 37) emoji = '🔵';
      else if (topicNum <= 45) emoji = '🟢';
      
      console.log(`   ${emoji} Tema ${topic}: ${count} preguntas`);
    });
    
    // Confirmar antes de proceder
    console.log('\n⚠️  Este proceso añadirá contenedores con colores por bloque.');
    console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Procesar preguntas
    console.log('🔄 Iniciando proceso de enriquecimiento...\n');
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Procesar por lotes pequeños
    const batchSize = 3;
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(questions.length / batchSize);
      
      console.log(`\n📦 Procesando lote ${batchNumber}/${totalBatches}`);
      
      // Procesar lote en paralelo
      const promises = batch.map(async (question) => {
        try {
          processedCount++;
          const topicNum = parseInt(question.topic);
          let blockType = 'General';
          if (topicNum <= 26) blockType = 'Jurídicas';
          else if (topicNum <= 37) blockType = 'Sociales';
          else if (topicNum <= 45) blockType = 'Técnico-Científicas';
          
          console.log(`   🔄 [${processedCount}/${questions.length}] Tema ${question.topic} (${blockType}) - ID ${question.id}...`);
          
          // Llamar al servicio con todos los parámetros necesarios
          const enrichedFeedback = await aiService.enrichFeedback(
            question.feedback,
            question.question,
            question.correctAnswer,
            provider,
            question.topic // Pasar el tema para determinar colores
          );
          
          // Verificar que realmente se enriqueció y tiene el contenedor
          if (enrichedFeedback && 
              enrichedFeedback !== question.feedback && 
              enrichedFeedback.includes('<div style=')) {
            
            // Guardar directamente en la BD
            await Questions.update(
              { feedback: enrichedFeedback },
              { where: { id: question.id } }
            );
            
            console.log(`   ✅ [${processedCount}/${questions.length}] Tema ${question.topic} - ID ${question.id} enriquecida con contenedor`);
            successCount++;
            
            // Mostrar preview del primer cambio de cada bloque
            if (successCount <= 3) {
              console.log('\n📝 Preview del enriquecimiento:');
              console.log('   ' + enrichedFeedback.substring(0, 200) + '...\n');
            }
          } else {
            console.log(`   ⚠️  [${processedCount}/${questions.length}] Tema ${question.topic} - ID ${question.id} - Sin cambios o sin contenedor`);
          }
          
          return true;
        } catch (error) {
          console.error(`   ❌ Error en pregunta ID ${question.id}:`, error.message);
          errorCount++;
          errors.push({ id: question.id, topic: question.topic, error: error.message });
          return false;
        }
      });
      
      // Esperar a que termine el lote
      await Promise.all(promises);
      
      // Pausa entre lotes (excepto el último)
      if (i + batchSize < questions.length) {
        console.log(`   ⏳ Pausa de 2 segundos antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN FINAL:');
    console.log('='.repeat(50));
    console.log(`✅ Exitosas: ${successCount}`);
    console.log(`⚠️  Sin cambios: ${processedCount - successCount - errorCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📝 Total procesadas: ${processedCount}`);
    
    // Mostrar distribución por bloques procesados
    const processedByBlock = {
      juridicas: 0,
      sociales: 0,
      tecnicas: 0
    };
    
    questions.forEach(q => {
      const topicNum = parseInt(q.topic);
      if (topicNum <= 26) processedByBlock.juridicas++;
      else if (topicNum <= 37) processedByBlock.sociales++;
      else if (topicNum <= 45) processedByBlock.tecnicas++;
    });
    
    console.log('\n📊 Distribución de procesamiento:');
    console.log(`   🔴 Jurídicas: ${processedByBlock.juridicas} preguntas procesadas`);
    console.log(`   🔵 Sociales: ${processedByBlock.sociales} preguntas procesadas`);
    console.log(`   🟢 Técnico-Científicas: ${processedByBlock.tecnicas} preguntas procesadas`);
    
    // Mostrar errores si los hay
    if (errors.length > 0) {
      console.log('\n⚠️  Preguntas con errores:');
      errors.forEach(e => {
        console.log(`   • ID ${e.id} (Tema ${e.topic}): ${e.error}`);
      });
    }
    
    // Verificar cuántas quedan pendientes
    const pendingCount = await Questions.count({
      where: {
        feedback: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.notLike]: '%<div style=%' }
          ]
        },
        topic: {
          [Op.between]: [startTopic, endTopic]
        }
      }
    });
    
    console.log(`\n📌 Quedan ${pendingCount} preguntas pendientes de enriquecer con contenedores`);
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Ejecutar
console.log('='.repeat(60));
console.log('🎨 ENRIQUECIMIENTO DE FEEDBACK CON CONTENEDORES POR TEMA');
console.log('='.repeat(60));
console.log('Uso: node scripts/enrich-with-containers.js [provider] [limit] [startTopic] [endTopic]');
console.log('Ejemplo: node scripts/enrich-with-containers.js openai 50 1 26');
console.log('         (Enriquece 50 preguntas de temas 1-26 con OpenAI)\n');

enrichWithContainers();