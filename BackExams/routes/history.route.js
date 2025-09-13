// BackExams/routes/history.route.js - VERSIÓN COMPLETA
/* eslint-disable consistent-return */
import express from 'express';
import fs from 'fs';
import HistoricService from '../services/historic.services.js';
import QuestionService from '../services/questions.services.js';
import ExamService from '../services/exam.services.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

const questionService = new QuestionService();
const historicService = new HistoricService();
const examService = new ExamService();

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const data = await historicService.getAllRecords();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/download', authenticateUser, async (req, res, next) => {
  const { id: historicId, type, feedback } = req.query;
  
  try {
    console.log(`🔄 Iniciando descarga - ID: ${historicId}, Tipo: ${type}, Feedback: ${feedback}`);
    
    // Obtener datos del histórico
    const historic = await historicService.getRecordById(historicId);
    if (!historic) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }
    
    const { name, questions: questionIds } = historic;
    console.log(`📋 Recreando examen "${name}" con ${questionIds.length} preguntas`);
    
    // Recrear las preguntas
    const questions = await questionService.recreateExamQuestions(questionIds);
    
    if (questions.length === 0) {
      return res.status(400).json({ error: 'No se pudieron obtener las preguntas del examen' });
    }
    
    console.log(`✅ ${questions.length} preguntas obtenidas exitosamente`);
    
    // Manejar diferentes tipos de archivo
    if (type === 'csv') {
      await handleCsvDownload(res, questions, name, examService);
    } else if (type === 'doc') {
      const hasFeedback = feedback === 'true';
      await handleDocDownload(res, questions, name, hasFeedback, examService);
    } else if (type === 'html') {
      const hasFeedback = feedback === 'true';
      await handleHtmlDownload(res, questions, name, hasFeedback, examService);
    } else {
      return res.status(400).json({ error: 'Tipo de archivo no válido. Use "csv", "doc" o "html"' });
    }
    
  } catch (error) {
    console.error('❌ Error en descarga:', error);
    next(error);
  }
});

router.post('/delete', authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.body;
    const removed = await historicService.removeRecord(id);
    const historic = await historicService.getAllRecords();
    res.json({ removed, historic });
  } catch (error) {
    next(error);
  }
});

// Función para manejar descarga de CSV
async function handleCsvDownload(res, questions, name, examService) {
  let filePath = null;
  
  try {
    console.log('📄 Generando archivo CSV...');
    filePath = await examService.createCsvExam(questions);
    
    // Verificar que el archivo existe y tiene contenido
    const fileStatus = await examService.checkFileStatus(filePath);
    if (!fileStatus.exists || fileStatus.size === 0) {
      throw new Error('El archivo CSV no se generó correctamente');
    }
    
    console.log(`✅ CSV generado: ${filePath} (${fileStatus.size} bytes)`);
    
    // Configurar headers - Limpiar nombre para CSV (igual que Word/HTML)
    let cleanName = name;
    cleanName = cleanName.replace(/\.(csv|docx?|xlsx?|pdf)$/i, '');
    cleanName = cleanName.replace(/\.csv/gi, '');
    
    // Sanitizar nombre para el sistema de archivos (más permisivo)
    const safeName = cleanName
      .replace(/[<>:"/\\|?*]/g, '_')  // Solo reemplazar caracteres prohibidos en nombres de archivo
      .replace(/\s+/g, '_')          // Reemplazar espacios múltiples con un guión bajo
      .replace(/_{2,}/g, '_')        // Reemplazar múltiples guiones bajos con uno solo
      .trim();
    
    console.log(`📝 Nombre original: "${name}"`);
    console.log(`📝 Nombre limpio: "${cleanName}"`);
    console.log(`📝 Nombre seguro: "${safeName}"`);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
    res.setHeader('Content-Length', fileStatus.size);
    
    // Crear stream y pipe al response
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error en stream de CSV:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error leyendo el archivo' });
      }
    });
    
    fileStream.on('end', () => {
      console.log('✅ Descarga de CSV completada');
      // Eliminar archivo después de un delay
      setTimeout(() => {
        examService.removeExam(filePath);
      }, 1000);
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error generando CSV:', error);
    if (filePath) {
      examService.removeExam(filePath);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generando archivo CSV' });
    }
  }
}

// Función para manejar descarga de DOC
async function handleDocDownload(res, questions, name, hasFeedback, examService) {
  let filePath = null;
  
  try {
    console.log(`📄 Generando documento Word (Feedback: ${hasFeedback ? 'Sí' : 'No'})...`);
    
    // Limpiar el nombre del archivo
    let cleanName = name;
    cleanName = cleanName.replace(/\.(csv|docx?|xlsx?|pdf)$/i, '');
    cleanName = cleanName.replace(/\.csv/gi, '');
    
    console.log(`📝 Nombre original: "${name}"`);
    console.log(`📝 Nombre limpio: "${cleanName}"`);
    
    filePath = await examService.createDocExam(questions, hasFeedback);
    
    // Verificar que el archivo existe y tiene contenido
    const fileStatus = await examService.checkFileStatus(filePath);
    if (!fileStatus.exists || fileStatus.size === 0) {
      throw new Error('El documento Word no se generó correctamente');
    }
    
    console.log(`✅ Word generado: ${filePath} (${fileStatus.size} bytes)`);
    
    // Configurar headers para Word con nombre limpio
    const safeName = cleanName
      .replace(/[<>:"/\\|?*]/g, '_')  // Solo reemplazar caracteres prohibidos en nombres de archivo
      .replace(/\s+/g, '_')          // Reemplazar espacios múltiples con un guión bajo
      .replace(/_{2,}/g, '_')        // Reemplazar múltiples guiones bajos con uno solo
      .trim();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`);
    res.setHeader('Content-Length', fileStatus.size);
    
    // Headers adicionales para evitar problemas de cache/bloqueo
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Crear stream y pipe al response
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error en stream de Word:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error leyendo el archivo' });
      }
    });
    
    fileStream.on('end', () => {
      console.log('✅ Descarga de Word completada');
      // Eliminar archivo después de un delay más largo para Word
      setTimeout(() => {
        examService.removeExam(filePath);
      }, 5000);
    });
    
    // Manejo de cierre de conexión
    res.on('close', () => {
      console.log('🔌 Conexión cerrada por el cliente');
      fileStream.destroy();
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error generando Word:', error);
    if (filePath) {
      setTimeout(() => examService.removeExam(filePath), 1000);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generando documento Word' });
    }
  }
}

// Función para manejar descarga de HTML
async function handleHtmlDownload(res, questions, name, hasFeedback, examService) {
  let filePath = null;
  
  try {
    console.log(`🌐 Generando archivo HTML (Feedback: ${hasFeedback ? 'Sí' : 'No'})...`);
    
    // Limpiar nombre
    let cleanName = name.replace(/\.(csv|docx?|xlsx?|pdf|html?)$/i, '');
    
    filePath = await examService.createHtmlExam(questions, hasFeedback);
    
    // Verificar que el archivo existe y tiene contenido
    const fileStatus = await examService.checkFileStatus(filePath);
    if (!fileStatus.exists || fileStatus.size === 0) {
      throw new Error('El archivo HTML no se generó correctamente');
    }
    
    console.log(`✅ HTML generado: ${filePath} (${fileStatus.size} bytes)`);
    
    // Configurar headers para HTML
    const safeName = cleanName
      .replace(/[<>:"/\\|?*]/g, '_')  // Solo reemplazar caracteres prohibidos en nombres de archivo
      .replace(/\s+/g, '_')          // Reemplazar espacios múltiples con un guión bajo
      .replace(/_{2,}/g, '_')        // Reemplazar múltiples guiones bajos con uno solo
      .trim();
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.html"`);
    res.setHeader('Content-Length', fileStatus.size);
    
    // Headers adicionales
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Crear stream y pipe al response
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('❌ Error en stream de HTML:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error leyendo el archivo' });
      }
    });
    
    fileStream.on('end', () => {
      console.log('✅ Descarga de HTML completada');
      // Eliminar archivo después de un delay
      setTimeout(() => {
        examService.removeExam(filePath);
      }, 1000);
    });
    
    // Manejo de cierre de conexión
    res.on('close', () => {
      console.log('🔌 Conexión cerrada por el cliente');
      fileStream.destroy();
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error generando HTML:', error);
    if (filePath) {
      setTimeout(() => examService.removeExam(filePath), 1000);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generando archivo HTML' });
    }
  }
}

export default router;