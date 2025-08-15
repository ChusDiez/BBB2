/* eslint-disable consistent-return */
import express from 'express';
import multiparty from 'multiparty';
import fs from 'fs';
import UploadService from '../services/upload.services.js';
import EvolcampusImportService from '../services/evolcampusImport.services.js';

const router = express.Router();

const uploadService = new UploadService();
const evolcampusImportService = new EvolcampusImportService();

router.get('/', async (req, res, next) => {
  res.send('This works - File loader');
});

router.post('/', async (req, res, next) => {
  try {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, { files }) => {
      const results = await Promise.allSettled(
        files.map((file) => uploadService.insertCSV(file)),
      );
      res.status(201).json(results);
    });
  } catch (e) {
    return res.status(500).json(e);
  }
});

/**
 * Endpoint para generar preview de importación desde Evolcampus
 * POST /api/upload/preview-evolcampus
 * Body: archivo CSV + tema
 */
router.post('/preview-evolcampus', async (req, res) => {
  try {
    const form = new multiparty.Form();
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ Error parseando form:', err);
        return res.status(400).json({
          success: false,
          message: 'Error procesando el archivo',
          error: err.message
        });
      }

      // Validar que se recibió el archivo y el tema
      const uploadedFiles = files.file || files.csv || [];
      const topic = fields.topic && fields.topic[0];

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ningún archivo CSV'
        });
      }

      if (!topic) {
        return res.status(400).json({
          success: false,
          message: 'El tema es obligatorio'
        });
      }

      const file = uploadedFiles[0];
      
      try {
        // Generar preview sin guardar en base de datos
        const preview = await evolcampusImportService.generatePreview(file.path, parseInt(topic));
        
        // Limpiar archivo temporal
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        res.status(200).json({
          success: true,
          fileName: file.originalFilename,
          ...preview
        });

      } catch (previewError) {
        console.error('❌ Error generando preview:', previewError);
        
        // Limpiar archivo temporal en caso de error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        res.status(400).json({
          success: false,
          message: previewError.message,
          fileName: file.originalFilename
        });
      }
    });

  } catch (error) {
    console.error('❌ Error en preview-evolcampus:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * Endpoint para confirmar importación desde Evolcampus
 * POST /api/upload/confirm-evolcampus
 * Body: {questions: Array, fileName: string, userId?: string}
 */
router.post('/confirm-evolcampus', async (req, res) => {
  try {
    const { questions, fileName, userId } = req.body;

    // Validaciones básicas
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron preguntas para importar'
      });
    }

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del archivo es obligatorio'
      });
    }

    // Confirmar importación
    const result = await evolcampusImportService.confirmImport(questions, fileName, userId);

    res.status(201).json({
      success: true,
      message: `Importación completada exitosamente`,
      ...result
    });

  } catch (error) {
    console.error('❌ Error en confirm-evolcampus:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error procesando la importación'
    });
  }
});

/**
 * Endpoint para obtener historial de importaciones
 * GET /api/upload/import-history?limit=50
 */
router.get('/import-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await evolcampusImportService.getImportHistory(limit);
    
    res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo historial de importaciones'
    });
  }
});

/**
 * Endpoint para obtener detalles de una importación específica
 * GET /api/upload/import-details/:logId
 */
router.get('/import-details/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const details = await evolcampusImportService.getImportDetails(parseInt(logId));
    
    res.status(200).json({
      success: true,
      details
    });
  } catch (error) {
    console.error('❌ Error obteniendo detalles:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Importación no encontrada'
    });
  }
});

export default router;
