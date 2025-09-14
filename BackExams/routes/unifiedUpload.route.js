// BackExams/routes/unifiedUpload.route.js
import express from 'express';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import UnifiedUploadService from '../services/unifiedUpload.services.js';
import ImpUploadService from '../services/impUpload.services.js';
import TemporalManagementService from '../services/temporalManagement.services.js';
import RFMigrationService from '../scripts/migrate-existing-rfs.js';
import { authenticateUser, ipAllowlist, originAllowlist } from '../middlewares/auth.middleware.js';

const router = express.Router();
const uploadService = new UnifiedUploadService();
const impUploadService = new ImpUploadService();
const temporalService = new TemporalManagementService();
const migrationService = new RFMigrationService();

/**
 * 🎯 RUTAS PARA EL SISTEMA UNIFICADO DE SUBIDA
 */

/**
 * 1️⃣ SUBIDA DIRECTA (comportamiento actual)
 * POST /api/v1/unified-upload/direct
 */
router.post('/direct', ipAllowlist, originAllowlist, (process.env.SECURE_UPLOAD_ROUTES === 'true' ? authenticateUser : (req, _res, next) => next()), async (req, res) => {
  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      keepExtensions: true,
      uploadDir: './uploads/'
    });

    const [fields, files] = await form.parse(req);
    const file = files.csvFile?.[0];

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'No se encontró archivo CSV'
      });
    }

    const result = await uploadService.uploadDirect(file.filepath, {
      fileName: file.originalFilename
    });

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      error: false,
      data: result
    });

  } catch (error) {
    console.error('Error en subida directa:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error en subida directa'
    });
  }
});

/**
 * 2️⃣ RF CON VENTANA ESPECÍFICA
 * POST /api/v1/unified-upload/rf-exam
 */
router.post('/rf-exam', ipAllowlist, originAllowlist, (process.env.SECURE_UPLOAD_ROUTES === 'true' ? authenticateUser : (req, _res, next) => next()), async (req, res) => {
  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: './uploads/'
    });

    const [fields, files] = await form.parse(req);
    const file = files.csvFile?.[0];

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'No se encontró archivo CSV'
      });
    }

    // Parsear campos del formulario
    const rfOptions = {
      examName: fields.examName?.[0],
      startDate: fields.startDate?.[0] ? new Date(fields.startDate[0]) : null,
      endDate: fields.endDate?.[0] ? new Date(fields.endDate[0]) : null,
      globalReleaseDate: fields.globalReleaseDate?.[0] ? new Date(fields.globalReleaseDate[0]) : null,
      autoRelease: fields.autoRelease?.[0] === 'true',
      immediatelyAvailable: fields.immediatelyAvailable?.[0] === 'true'
    };

    if (!rfOptions.examName) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere el nombre del RF'
      });
    }

    const result = await uploadService.uploadRFExam(file.filepath, rfOptions);

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      error: false,
      data: result
    });

  } catch (error) {
    console.error('Error en subida RF:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error en subida RF'
    });
  }
});

/**
 * 2️⃣.5 IMP CON CONTROL TEMPORAL
 * POST /api/v1/unified-upload/imp-exam
 */
router.post('/imp-exam', ipAllowlist, originAllowlist, (process.env.SECURE_UPLOAD_ROUTES === 'true' ? authenticateUser : (req, _res, next) => next()), async (req, res) => {
  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: './uploads/'
    });

    const [fields, files] = await form.parse(req);
    const file = files.csvFile?.[0];

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'No se encontró archivo CSV'
      });
    }

    // Parsear campos del formulario
    const impOptions = {
      themeNumber: fields.themeNumber?.[0] ? parseInt(fields.themeNumber[0]) : null,
      themeName: fields.themeName?.[0],
      windowStartDate: fields.windowStartDate?.[0] || null,
      autoRelease: fields.autoRelease?.[0] === 'true',
      immediatelyAvailable: fields.immediatelyAvailable?.[0] === 'true',
    };

    const result = await impUploadService.uploadImpExam(file.filepath, impOptions);

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      error: false,
      data: result
    });

  } catch (error) {
    console.error('Error en subida IMP:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error en subida IMP'
    });
  }
});

/**
 * 3️⃣ PREGUNTAS FUTURAS
 * POST /api/v1/unified-upload/future-questions
 */
router.post('/future-questions', ipAllowlist, originAllowlist, (process.env.SECURE_UPLOAD_ROUTES === 'true' ? authenticateUser : (req, _res, next) => next()), async (req, res) => {
  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: './uploads/'
    });

    const [fields, files] = await form.parse(req);
    const file = files.csvFile?.[0];

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'No se encontró archivo CSV'
      });
    }

    const futureOptions = {
      releaseDate: fields.releaseDate?.[0] ? new Date(fields.releaseDate[0]) : null,
      autoRelease: fields.autoRelease?.[0] === 'true'
    };

    const result = await uploadService.uploadFutureQuestions(file.filepath, futureOptions);

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      error: false,
      data: result
    });

  } catch (error) {
    console.error('Error en subida futura:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error en subida futura'
    });
  }
});

/**
 * 4️⃣ EXAMEN PERSONALIZADO
 * POST /api/v1/unified-upload/custom-exam
 */
router.post('/custom-exam', ipAllowlist, originAllowlist, (process.env.SECURE_UPLOAD_ROUTES === 'true' ? authenticateUser : (req, _res, next) => next()), async (req, res) => {
  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: './uploads/'
    });

    const [fields, files] = await form.parse(req);
    const file = files.csvFile?.[0];

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'No se encontró archivo CSV'
      });
    }

    const customOptions = {
      examName: fields.examName?.[0],
      examType: fields.examType?.[0] || 'custom',
      availabilityType: fields.availabilityType?.[0] || 'permanent',
      immediatelyAvailable: fields.immediatelyAvailable?.[0] === 'true'
    };

    if (!customOptions.examName) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere el nombre del examen personalizado'
      });
    }

    const result = await uploadService.uploadCustomExam(file.filepath, customOptions);

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      error: false,
      data: result
    });

  } catch (error) {
    console.error('Error en examen personalizado:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error en examen personalizado'
    });
  }
});

/**
 * 🕒 GESTIÓN TEMPORAL
 */

/**
 * Obtener estado del servicio temporal
 * GET /api/v1/unified-upload/temporal/status
 */
router.get('/temporal/status', async (req, res) => {
  try {
    const status = await temporalService.getServiceStatus();
    res.status(200).json({
      error: false,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/**
 * Iniciar servicio temporal
 * POST /api/v1/unified-upload/temporal/start
 */
router.post('/temporal/start', (req, res) => {
  try {
    temporalService.start();
    res.status(200).json({
      error: false,
      message: 'Servicio temporal iniciado'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/**
 * Detener servicio temporal
 * POST /api/v1/unified-upload/temporal/stop
 */
router.post('/temporal/stop', (req, res) => {
  try {
    temporalService.stop();
    res.status(200).json({
      error: false,
      message: 'Servicio temporal detenido'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/**
 * Liberar examen manualmente
 * POST /api/v1/unified-upload/temporal/release/:examId
 */
router.post('/temporal/release/:examId', async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const result = await temporalService.manualReleaseExam(examId);
    
    if (result.success) {
      res.status(200).json({
        error: false,
        data: result
      });
    } else {
      res.status(400).json({
        error: true,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/**
 * Activar examen manualmente
 * POST /api/v1/unified-upload/temporal/activate/:examId
 */
router.post('/temporal/activate/:examId', async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const result = await temporalService.manualActivateExam(examId);
    
    if (result.success) {
      res.status(200).json({
        error: false,
        data: result
      });
    } else {
      res.status(400).json({
        error: true,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/**
 * 🔄 MIGRACIÓN DE RF EXISTENTES
 */

/**
 * Verificar estado de migración
 * GET /api/v1/unified-upload/migration/status
 */
router.get('/migration/status', async (req, res) => {
  try {
    const status = await migrationService.verifyMigrationStatus();
    res.status(200).json({
      error: false,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/**
 * Ejecutar migración de RF existentes
 * POST /api/v1/unified-upload/migration/execute
 */
router.post('/migration/execute', async (req, res) => {
  try {
    const result = await migrationService.migrateExistingRFs();
    res.status(200).json({
      error: false,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/**
 * 📅 GESTIÓN DE EXÁMENES PROGRAMADOS
 */

/**
 * Obtener exámenes programados
 * GET /api/v1/unified-upload/scheduled
 */
router.get('/scheduled', ipAllowlist, originAllowlist, (process.env.SECURE_UPLOAD_ROUTES === 'true' ? authenticateUser : (req, _res, next) => next()), async (req, res) => {
  try {
    const SpecificExam = (await import('../models/specificExams.model.js')).default;
    
    const exams = await SpecificExam.findAll({
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      error: false,
      data: exams
    });
  } catch (error) {
    console.error('Error obteniendo exámenes programados:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error obteniendo exámenes programados'
    });
  }
});

/**
 * Eliminar examen programado
 * DELETE /api/v1/unified-upload/scheduled/:examId
 */
router.delete('/scheduled/:examId', authenticateUser, async (req, res) => {
  try {
    const SpecificExam = (await import('../models/specificExams.model.js')).default;
    const examId = parseInt(req.params.examId);
    
    const exam = await SpecificExam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        error: true,
        message: 'Examen no encontrado'
      });
    }

    await exam.destroy();

    res.status(200).json({
      error: false,
      message: `Examen "${exam.exam_name}" eliminado correctamente`
    });
  } catch (error) {
    console.error('Error eliminando examen:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error eliminando examen'
    });
  }
});

/**
 * Activar examen programado
 * POST /api/v1/unified-upload/scheduled/:examId/activate
 */
router.post('/scheduled/:examId/activate', authenticateUser, async (req, res) => {
  try {
    const SpecificExam = (await import('../models/specificExams.model.js')).default;
    const examId = parseInt(req.params.examId);
    
    const exam = await SpecificExam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        error: true,
        message: 'Examen no encontrado'
      });
    }

    await exam.update({ status: 'active' });

    // Si está marcado para disponibilidad inmediata, activar preguntas
    if (exam.immediately_available) {
      const temporalService = (await import('../services/temporalManagement.services.js')).default;
      await temporalService.makeQuestionsAvailable(exam.historic_id, true);
    }

    res.status(200).json({
      error: false,
      message: `Examen "${exam.exam_name}" activado correctamente`
    });
  } catch (error) {
    console.error('Error activando examen:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error activando examen'
    });
  }
});

/**
 * 📊 UTILIDADES
 */

/**
 * Diagnosticar archivo CSV
 * POST /api/v1/unified-upload/diagnose
 */
router.post('/diagnose', async (req, res) => {
  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: './uploads/'
    });

    const [fields, files] = await form.parse(req);
    const file = files.csvFile?.[0];

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'No se encontró archivo CSV'
      });
    }

    // Capturar output del diagnóstico
    let diagnosticOutput = '';
    const originalLog = console.log;
    console.log = (...args) => {
      diagnosticOutput += args.join(' ') + '\n';
    };

    await uploadService.diagnoseCsvFile(file.filepath);

    // Restaurar console.log
    console.log = originalLog;

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      error: false,
      data: {
        fileName: file.originalFilename,
        diagnostic: diagnosticOutput
      }
    });

  } catch (error) {
    console.error('Error en diagnóstico:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error en diagnóstico'
    });
  }
});

/**
 * 🔄 COMPATIBILIDAD CON SISTEMA ANTERIOR
 * POST /api/v1/unified-upload/legacy
 * 
 * Esta ruta mantiene compatibilidad con el sistema anterior
 */
router.post('/legacy', async (req, res) => {
  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: './uploads/'
    });

    const [fields, files] = await form.parse(req);
    const file = files.csvFile?.[0];

    if (!file) {
      return res.status(400).json({
        error: true,
        message: 'No se encontró archivo CSV'
      });
    }

    // Usar el método de compatibilidad
    const result = await uploadService.insertCSV({
      path: file.filepath,
      originalFilename: file.originalFilename
    });

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

    res.status(200).json({
      error: false,
      data: result
    });

  } catch (error) {
    console.error('Error en modo compatibilidad:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Error en modo compatibilidad'
    });
  }
});

export default router;
