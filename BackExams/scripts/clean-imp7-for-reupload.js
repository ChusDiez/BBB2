// BackExams/scripts/clean-imp7-for-reupload.js
// Script para limpiar registros del imprescindible 7 y permitir nueva subida

import ImpQuestionAttempts from '../models/impQuestionAttempts.model.js';
import ImpTestSessions from '../models/impTestSessions.model.js';
import ImpStatusMonitor from '../models/impStatusMonitor.model.js';
import ImpAvailability from '../models/impAvailability.model.js';
import Historics from '../models/historics.model.js';

async function cleanImp7Records() {
  try {
    console.log('🧹 Iniciando limpieza de registros del Imprescindible 7...');

    // 1. Obtener las sesiones de test del tema 7
    const imp7Sessions = await ImpTestSessions.findAll({
      where: { theme_number: 7 }
    });

    console.log(`📋 Encontradas ${imp7Sessions.length} sesiones de test para tema 7`);

    // 2. Borrar intentos de preguntas asociados a esas sesiones
    if (imp7Sessions.length > 0) {
      const sessionIds = imp7Sessions.map(session => session.id);
      const deletedAttempts = await ImpQuestionAttempts.destroy({
        where: { session_id: sessionIds }
      });
      console.log(`❌ Eliminados ${deletedAttempts} intentos de preguntas`);
    }

    // 3. Borrar las sesiones de test
    const deletedSessions = await ImpTestSessions.destroy({
      where: { theme_number: 7 }
    });
    console.log(`❌ Eliminadas ${deletedSessions} sesiones de test`);

    // 4. Borrar el monitor de estado
    const deletedMonitors = await ImpStatusMonitor.destroy({
      where: { theme_number: 7 }
    });
    console.log(`❌ Eliminados ${deletedMonitors} monitores de estado`);

    // 5. Borrar el control de disponibilidad
    const deletedAvailability = await ImpAvailability.destroy({
      where: { theme_number: 7 }
    });
    console.log(`❌ Eliminados ${deletedAvailability} controles de disponibilidad`);

    // 6. Buscar y borrar el histórico del examen
    const historicRecord = await Historics.findOne({
      where: { 
        name: '7_IMP',
        type: 'IMP'
      }
    });

    if (historicRecord) {
      await historicRecord.destroy();
      console.log(`❌ Eliminado histórico del examen (ID: ${historicRecord.idExam})`);
    } else {
      console.log('ℹ️  No se encontró histórico del examen 7_IMP');
    }

    console.log('✅ Limpieza completada. Ahora puedes subir el imprescindible 7 de nuevo.');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanImp7Records()
    .then(() => {
      console.log('🎉 Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error ejecutando script:', error);
      process.exit(1);
    });
}

export default cleanImp7Records;

