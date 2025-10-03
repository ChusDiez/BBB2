// BackExams/scripts/clean-duplicate-imp7-questions.js
// Script para limpiar preguntas duplicadas del imprescindible 7

import Questions from '../models/questions.model.js';
import Historics from '../models/historics.model.js';

async function cleanDuplicateImp7Questions() {
  try {
    console.log('🧹 Iniciando limpieza de preguntas duplicadas del Imprescindible 7...');

    // 1. Obtener el histórico actual del IMP 7 (el más reciente)
    const currentHistoric = await Historics.findOne({
      where: { 
        name: '7_IMP',
        type: 'IMP'
      },
      order: [['createdAt', 'DESC']]
    });

    if (!currentHistoric) {
      console.log('❌ No se encontró histórico actual del IMP 7');
      return;
    }

    console.log(`📋 Histórico actual: ID ${currentHistoric.idExam}, creado: ${currentHistoric.createdAt}`);
    
    // 2. Obtener las IDs de preguntas del histórico actual
    const currentQuestionIds = currentHistoric.questions
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    console.log(`📝 Preguntas del histórico actual: ${currentQuestionIds.length} preguntas (IDs: ${Math.min(...currentQuestionIds)} - ${Math.max(...currentQuestionIds)})`);

    // 3. Contar todas las preguntas del tema 7
    const allTopic7Questions = await Questions.findAll({
      where: { topic: 7 },
      order: [['createdAt', 'ASC']]
    });

    console.log(`📊 Total preguntas tema 7 en BD: ${allTopic7Questions.length}`);

    // 4. Identificar preguntas a eliminar (las que NO están en el histórico actual)
    const questionsToDelete = allTopic7Questions.filter(q => 
      !currentQuestionIds.includes(q.id)
    );

    console.log(`❌ Preguntas a eliminar: ${questionsToDelete.length}`);

    if (questionsToDelete.length === 0) {
      console.log('✅ No hay preguntas duplicadas que eliminar');
      return;
    }

    // 5. Mostrar resumen de lo que se va a eliminar
    const idsToDelete = questionsToDelete.map(q => q.id);
    const minIdToDelete = Math.min(...idsToDelete);
    const maxIdToDelete = Math.max(...idsToDelete);
    
    console.log(`🗑️  Se eliminarán preguntas con IDs: ${minIdToDelete} - ${maxIdToDelete}`);
    console.log(`📅 Fechas de creación: ${questionsToDelete[0]?.createdAt} - ${questionsToDelete[questionsToDelete.length-1]?.createdAt}`);

    // 6. Eliminar las preguntas duplicadas
    const deletedCount = await Questions.destroy({
      where: {
        id: idsToDelete
      }
    });

    console.log(`✅ Eliminadas ${deletedCount} preguntas duplicadas`);

    // 7. Verificar estado final
    const finalCount = await Questions.count({
      where: { topic: 7 }
    });

    console.log(`📊 Preguntas finales tema 7: ${finalCount} (deberían ser 40)`);

    // 8. Eliminar histórico huérfano si existe
    const orphanHistorics = await Historics.findAll({
      where: {
        name: '7_IMP',
        type: 'IMP',
        idExam: { [require('sequelize').Op.ne]: currentHistoric.idExam }
      }
    });

    if (orphanHistorics.length > 0) {
      for (const orphan of orphanHistorics) {
        await orphan.destroy();
        console.log(`🗑️  Eliminado histórico huérfano: ID ${orphan.idExam}`);
      }
    }

    console.log('✅ Limpieza de duplicados completada');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanDuplicateImp7Questions()
    .then(() => {
      console.log('🎉 Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error ejecutando script:', error);
      process.exit(1);
    });
}

export default cleanDuplicateImp7Questions;

