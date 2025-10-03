// BackExams/scripts/update-imp7-questions.js
// Script para actualizar las IDs de preguntas del IMP 7 a las del rango 9182-9221

import Historics from '../models/historics.model.js';
import ImpAvailability from '../models/impAvailability.model.js';

async function updateImp7Questions() {
  try {
    console.log('🔄 Actualizando IDs de preguntas del Imprescindible 7...');

    // Definir las IDs de preguntas del histórico ID 50 (las que tienes disponibles)
    const availableQuestions = '9221,9197,9193,9192,9190,9189,9186,9185,9183,9182,9217,9216,9214,9213,9210,9209,9207,9206,9202,9201,9199,9198,9194,9191,9187,9184,9218,9215,9211,9208,9203,9200,9195,9188,9219,9212,9204,9196,9220,9205';

    // 1. Actualizar el histórico actual (ID 51) con las preguntas disponibles
    const updatedHistoric = await Historics.update(
      { 
        questions: availableQuestions,
        updatedAt: new Date()
      },
      { 
        where: { 
          idExam: 51, 
          name: '7_IMP' 
        }
      }
    );

    console.log(`✅ Histórico actualizado: ${updatedHistoric[0]} registro(s)`);

    // 2. Actualizar el control de disponibilidad para que apunte al histórico correcto
    const updatedAvailability = await ImpAvailability.update(
      {
        historic_id: 51, // Mantener referencia al histórico actual
        updated_at: new Date()
      },
      {
        where: { theme_number: 7 }
      }
    );

    console.log(`✅ Control de disponibilidad actualizado: ${updatedAvailability[0]} registro(s)`);

    // 3. Eliminar el histórico huérfano (ID 50) ya que no se necesita
    const deletedHistoric = await Historics.destroy({
      where: {
        idExam: 50,
        name: '7_IMP'
      }
    });

    console.log(`🗑️  Histórico huérfano eliminado: ${deletedHistoric} registro(s)`);

    // 4. Verificar el resultado final
    const finalHistoric = await Historics.findOne({
      where: { name: '7_IMP', type: 'IMP' }
    });

    if (finalHistoric) {
      const questionIds = finalHistoric.questions.split(',');
      console.log(`📊 Estado final:`);
      console.log(`   - Histórico ID: ${finalHistoric.idExam}`);
      console.log(`   - Total preguntas: ${questionIds.length}`);
      console.log(`   - Rango IDs: ${Math.min(...questionIds.map(id => parseInt(id)))} - ${Math.max(...questionIds.map(id => parseInt(id)))}`);
      console.log(`   - Preguntas: ${finalHistoric.questions}`);
    }

    console.log('✅ Actualización completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateImp7Questions()
    .then(() => {
      console.log('🎉 Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error ejecutando script:', error);
      process.exit(1);
    });
}

export default updateImp7Questions;

