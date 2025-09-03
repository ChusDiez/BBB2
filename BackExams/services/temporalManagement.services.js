// BackExams/services/temporalManagement.services.js
import cron from 'node-cron';
import SpecificExam from '../models/specificExams.model.js';
import Historic from '../models/historicExams.model.js';
import Questions from '../models/questions.model.js';
import { Op } from 'sequelize';

/**
 * 🕒 SERVICIO DE GESTIÓN TEMPORAL
 * 
 * Maneja la automatización de:
 * - Apertura/cierre de ventanas de RF
 * - Liberación automática al pool global
 * - Activación de exámenes programados
 */
class TemporalManagementService {
  constructor() {
    this.scheduledJobs = new Map();
    this.isRunning = false;
  }

  /**
   * 🚀 INICIAR SERVICIO DE GESTIÓN TEMPORAL
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Servicio temporal ya está ejecutándose');
      return;
    }

    console.log('🕒 Iniciando servicio de gestión temporal...');
    
    // Cron job cada 10 minutos para verificar cambios
    cron.schedule('*/10 * * * *', async () => {
      await this.processScheduledTasks();
    });

    // Cron job cada hora para verificar liberaciones automáticas
    cron.schedule('0 * * * *', async () => {
      await this.processAutoReleases();
    });

    // Cron job diario a las 00:01 para limpiar tareas completadas
    cron.schedule('1 0 * * *', async () => {
      await this.cleanupCompletedTasks();
    });

    this.isRunning = true;
    console.log('✅ Servicio de gestión temporal iniciado');
  }

  /**
   * 🛑 DETENER SERVICIO
   */
  stop() {
    this.scheduledJobs.forEach((job, id) => {
      job.destroy();
    });
    this.scheduledJobs.clear();
    this.isRunning = false;
    console.log('🛑 Servicio de gestión temporal detenido');
  }

  /**
   * 📋 PROCESAR TAREAS PROGRAMADAS
   * Ejecuta cada 10 minutos
   */
  async processScheduledTasks() {
    try {
      console.log('🔄 Procesando tareas programadas...');
      
      const now = new Date();
      
      // Buscar exámenes que deben abrirse (ventana start)
      await this.openRFWindows(now);
      
      // Buscar exámenes que deben cerrarse (ventana end)
      await this.closeRFWindows(now);
      
      // Buscar exámenes que deben activarse
      await this.activateScheduledExams(now);
      
    } catch (error) {
      console.error('❌ Error procesando tareas programadas:', error);
    }
  }

  /**
   * 🌍 PROCESAR LIBERACIONES AUTOMÁTICAS
   * Ejecuta cada hora
   */
  async processAutoReleases() {
    try {
      console.log('🌍 Procesando liberaciones automáticas...');
      
      const now = new Date();
      
      // Buscar exámenes que deben liberarse al pool global
      const examensToRelease = await SpecificExam.findAll({
        where: {
          auto_release: true,
          released_to_global: false,
          global_release_date: {
            [Op.lte]: now
          }
        }
      });

      for (const exam of examensToRelease) {
        await this.releaseToGlobalPool(exam);
      }
      
    } catch (error) {
      console.error('❌ Error procesando liberaciones automáticas:', error);
    }
  }

  /**
   * 🚪 ABRIR VENTANAS DE RF
   */
  async openRFWindows(now) {
    const examensToOpen = await SpecificExam.findAll({
      where: {
        exam_type: 'rf',
        status: 'draft',
        window_start_date: {
          [Op.lte]: now
        },
        window_end_date: {
          [Op.gt]: now
        }
      }
    });

    for (const exam of examensToOpen) {
      try {
        // Cambiar estado a active
        await exam.update({ status: 'active' });
        
        // Si immediately_available es true, hacer preguntas disponibles
        if (exam.immediately_available) {
          await this.makeQuestionsAvailable(exam.historic_id, true);
        }
        
        console.log(`✅ Abierta ventana para RF: ${exam.exam_name}`);
        
      } catch (error) {
        console.error(`❌ Error abriendo ventana para ${exam.exam_name}:`, error);
      }
    }
  }

  /**
   * 🚪 CERRAR VENTANAS DE RF
   */
  async closeRFWindows(now) {
    const examensToClose = await SpecificExam.findAll({
      where: {
        exam_type: 'rf',
        status: 'active',
        window_end_date: {
          [Op.lte]: now
        }
      }
    });

    for (const exam of examensToClose) {
      try {
        // Cambiar estado a closed
        await exam.update({ status: 'closed' });
        
        // Si no hay auto_release, quitar del pool global
        if (!exam.auto_release) {
          await this.makeQuestionsAvailable(exam.historic_id, false);
        }
        
        console.log(`✅ Cerrada ventana para RF: ${exam.exam_name}`);
        
      } catch (error) {
        console.error(`❌ Error cerrando ventana para ${exam.exam_name}:`, error);
      }
    }
  }

  /**
   * 🎯 ACTIVAR EXÁMENES PROGRAMADOS
   */
  async activateScheduledExams(now) {
    // Por ahora, esta funcionalidad es básica
    // Se puede extender para exámenes con fechas de activación específicas
    const examensToActivate = await SpecificExam.findAll({
      where: {
        status: 'draft',
        window_start_date: {
          [Op.lte]: now
        }
      }
    });

    for (const exam of examensToActivate) {
      if (exam.exam_type !== 'rf') {  // Los RF se manejan en openRFWindows
        try {
          await exam.update({ status: 'active' });
          
          if (exam.immediately_available) {
            await this.makeQuestionsAvailable(exam.historic_id, true);
          }
          
          console.log(`✅ Activado examen: ${exam.exam_name}`);
          
        } catch (error) {
          console.error(`❌ Error activando examen ${exam.exam_name}:`, error);
        }
      }
    }
  }

  /**
   * 🌍 LIBERAR AL POOL GLOBAL
   */
  async releaseToGlobalPool(exam) {
    try {
      // Marcar como liberado
      await exam.update({ 
        released_to_global: true,
        status: 'released'
      });
      
      // Hacer preguntas globally_available
      await this.makeQuestionsAvailable(exam.historic_id, true);
      
      console.log(`✅ Liberado al pool global: ${exam.exam_name} (${exam.total_questions} preguntas)`);
      
    } catch (error) {
      console.error(`❌ Error liberando ${exam.exam_name}:`, error);
    }
  }

  /**
   * 🎯 HACER PREGUNTAS DISPONIBLES/NO DISPONIBLES
   */
  async makeQuestionsAvailable(historicId, available) {
    try {
      // Obtener preguntas del historic
      const historic = await Historic.findByPk(historicId);
      if (!historic) {
        throw new Error(`Historic ${historicId} no encontrado`);
      }
      
      // historic.questions es un array (getter/setter del modelo)
      const questionIds = historic.questions;
      
      if (!questionIds || questionIds.length === 0) {
        console.warn(`⚠️ No hay preguntas en historic ${historicId}`);
        return;
      }
      
      // Actualizar globally_available
      const result = await Questions.update(
        { globally_available: available },
        {
          where: {
            id: {
              [Op.in]: questionIds
            }
          }
        }
      );
      
      console.log(`✅ Actualizadas ${result[0]} preguntas. globally_available: ${available}`);
      
    } catch (error) {
      console.error(`❌ Error actualizando disponibilidad de preguntas:`, error);
      throw error;
    }
  }

  /**
   * 🧹 LIMPIAR TAREAS COMPLETADAS
   */
  async cleanupCompletedTasks() {
    try {
      console.log('🧹 Limpiando tareas completadas...');
      
      // Por ahora, solo log. Se puede implementar cleanup de registros antiguos
      const oldExams = await SpecificExam.findAll({
        where: {
          status: 'released',
          created_at: {
            [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 días
          }
        }
      });
      
      console.log(`📊 Encontrados ${oldExams.length} exámenes liberados hace más de 30 días`);
      
    } catch (error) {
      console.error('❌ Error en cleanup:', error);
    }
  }

  /**
   * 📊 OBTENER ESTADO DEL SERVICIO
   */
  async getServiceStatus() {
    try {
      const now = new Date();
      
      // Contar exámenes por estado
      const stats = await SpecificExam.findAll({
        attributes: [
          'status',
          [SpecificExam.sequelize.fn('COUNT', SpecificExam.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Próximas tareas
      const upcomingTasks = await SpecificExam.findAll({
        where: {
          [Op.or]: [
            {
              window_start_date: {
                [Op.gt]: now,
                [Op.lt]: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // próximos 7 días
              }
            },
            {
              global_release_date: {
                [Op.gt]: now,
                [Op.lt]: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // próximos 7 días
              }
            }
          ]
        },
        order: [['window_start_date', 'ASC'], ['global_release_date', 'ASC']],
        limit: 10
      });

      return {
        isRunning: this.isRunning,
        currentTime: now,
        examStats: stats,
        upcomingTasks: upcomingTasks,
        scheduledJobsCount: this.scheduledJobs.size
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estado del servicio:', error);
      return {
        isRunning: this.isRunning,
        error: error.message
      };
    }
  }

  /**
   * 🎯 MÉTODOS MANUALES DE GESTIÓN
   */

  /**
   * Liberar manualmente un examen específico
   */
  async manualReleaseExam(examId) {
    try {
      const exam = await SpecificExam.findByPk(examId);
      if (!exam) {
        throw new Error(`Examen ${examId} no encontrado`);
      }
      
      await this.releaseToGlobalPool(exam);
      return { success: true, message: `Examen ${exam.exam_name} liberado manualmente` };
      
    } catch (error) {
      console.error('❌ Error en liberación manual:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Activar manualmente un examen específico
   */
  async manualActivateExam(examId) {
    try {
      const exam = await SpecificExam.findByPk(examId);
      if (!exam) {
        throw new Error(`Examen ${examId} no encontrado`);
      }
      
      await exam.update({ status: 'active' });
      
      if (exam.immediately_available) {
        await this.makeQuestionsAvailable(exam.historic_id, true);
      }
      
      return { success: true, message: `Examen ${exam.exam_name} activado manualmente` };
      
    } catch (error) {
      console.error('❌ Error en activación manual:', error);
      return { success: false, error: error.message };
    }
  }
}

export default TemporalManagementService;
