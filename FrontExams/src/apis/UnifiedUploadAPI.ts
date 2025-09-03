import axios from 'axios';
import { UnifiedUploadOptions, UploadResult, ScheduledExam } from '../types/unifiedUpload';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

const UnifiedUploadClient = axios.create({
  baseURL: `${baseURL}/unified-upload/`,
});

export default class UnifiedUploadAPI {
  /**
   * Upload directo (comportamiento actual)
   */
  static async uploadDirect(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    
    const { data } = await UnifiedUploadClient.post('direct', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return data.data;
  }

  /**
   * Upload RF con ventana temporal
   */
  static async uploadRFExam(file: File, options: UnifiedUploadOptions): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    
    if (options.rfWindow) {
      formData.append('examName', options.rfWindow.examName);
      formData.append('startDate', options.rfWindow.startDate);
      // Solo añadir endDate si no está vacío (para auto-liberación)
      if (options.rfWindow.endDate) {
        formData.append('endDate', options.rfWindow.endDate);
      }
    }
    
    if (options.globalRelease) {
      formData.append('globalReleaseDate', options.globalRelease.releaseDate);
      formData.append('autoRelease', String(options.globalRelease.autoRelease));
    }
    
    formData.append('immediatelyAvailable', String(options.immediatelyAvailable || false));
    
    const { data } = await UnifiedUploadClient.post('rf-exam', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return data.data;
  }

  /**
   * Upload preguntas futuras
   */
  static async uploadFutureQuestions(file: File, options: UnifiedUploadOptions): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    
    if (options.globalRelease) {
      formData.append('releaseDate', options.globalRelease.releaseDate);
      formData.append('autoRelease', String(options.globalRelease.autoRelease));
    }
    
    const { data } = await UnifiedUploadClient.post('future-questions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return data.data;
  }

  /**
   * Upload examen personalizado
   */
  static async uploadCustomExam(file: File, options: UnifiedUploadOptions): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    
    if (options.customExam) {
      formData.append('examName', options.customExam.examName);
      formData.append('examType', options.customExam.examType);
      formData.append('availabilityType', options.customExam.availabilityType);
    }
    
    formData.append('immediatelyAvailable', String(options.immediatelyAvailable || false));
    
    const { data } = await UnifiedUploadClient.post('custom-exam', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return data.data;
  }

  /**
   * Obtener exámenes programados
   */
  static async getScheduledExams(): Promise<ScheduledExam[]> {
    const { data } = await UnifiedUploadClient.get('scheduled');
    return data.data;
  }

  /**
   * Eliminar examen programado
   */
  static async deleteScheduledExam(examId: number): Promise<void> {
    await UnifiedUploadClient.delete(`scheduled/${examId}`);
  }

  /**
   * Activar examen programado manualmente
   */
  static async activateScheduledExam(examId: number): Promise<void> {
    await UnifiedUploadClient.post(`scheduled/${examId}/activate`);
  }
}

