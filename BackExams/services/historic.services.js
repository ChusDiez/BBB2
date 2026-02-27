import Historic from '../models/historicExams.model.js';
import ImpAvailability from '../models/impAvailability.model.js';
import ImpStatusMonitor from '../models/impStatusMonitor.model.js';
import ImpTestSessions from '../models/impTestSessions.model.js';
import ImpQuestionAttempts from '../models/impQuestionAttempts.model.js';

class HistoricService {
  async addRecord(name, questions, examType, type) {
    if (questions.length === 0) {
      return '#';
    }
    const questionIDs = questions.map(({ id }) => id);
    const data = await Historic.create({
      name,
      questions: questionIDs,
      amount: questions.length,
      category: examType,
      type,
    });

    return data.idExam;
  }

  async getAllRecords() {
    const data = await Historic.findAll({
      order: [['idExam', 'DESC']],
    });
    return data;
  }

  async getRecordById(idExam) {
    const result = await Historic.findOne({
      where: {
        idExam,
      },
    });
    return result;
  }

  async getQuestionsFromHistoric(idMap) {
    const records = await Promise.allSettled(idMap.map(
      (id) => this.getRecordById(Number(id)),
    ));
    const questions = [];
    records.forEach(
      ({ status, value }) => status === 'fulfilled' && questions.push(...value.questions),
    );
    return questions;
  }

  async removeRecord(idExam) {
    try {
      // 1. Primero verificar si existe el historic
      const historic = await this.getRecordById(idExam);
      if (!historic) {
        return false;
      }

      // 2. Si es un IMP (type === 'IMP'), eliminar registros relacionados
      if (historic.type === 'IMP') {
        const themeName = historic.name; // ej: "17_IMP"
        const themeNumber = parseInt(themeName.split('_')[0]);

        // a) Primero obtener todas las sesiones relacionadas con este IMP
        const sessions = await ImpTestSessions.findAll({
          where: {
            historic_id: idExam,
          },
          attributes: ['id'],
        });

        // b) Si hay sesiones, eliminar los intentos de preguntas asociados
        if (sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);
          await ImpQuestionAttempts.destroy({
            where: {
              session_id: sessionIds,
            },
          });
          console.log(`Eliminados ${sessionIds.length} intentos de preguntas para IMP ${themeName}`);
        }

        // c) Eliminar las sesiones de test
        await ImpTestSessions.destroy({
          where: {
            historic_id: idExam,
          },
        });

        // d) Eliminar de imp_availability_control
        await ImpAvailability.destroy({
          where: {
            historic_id: idExam,
          },
        });

        // e) Eliminar de imp_status_monitor
        await ImpStatusMonitor.destroy({
          where: {
            theme_number: themeNumber,
          },
        });

        console.log(`Eliminados todos los registros IMP relacionados para ${themeName} (historic_id: ${idExam})`);
      }

      // 3. Finalmente eliminar el historic
      const rowsRemoved = await Historic.destroy({
        where: {
          idExam,
        },
      });

      return rowsRemoved > 0;
    } catch (error) {
      console.error(`Error eliminando historic ${idExam}:`, error);
      throw new Error(`No se pudo eliminar el examen: ${error.message}`);
    }
  }
}

export default HistoricService;