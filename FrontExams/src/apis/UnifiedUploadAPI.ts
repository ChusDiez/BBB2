import axios from 'axios';
import { supabase } from '../lib/supabase';
import { UnifiedUploadOptions, UploadResult, ScheduledExam, ImpUploadOptions } from '../types/unifiedUpload';

// Usar la misma configuración que otros APIs
const baseURL = process.env.REACT_APP_API_URL ? 
  `${process.env.REACT_APP_API_URL}/api/v1` : 
  'http://localhost:8000/api/v1';

const UnifiedUploadClient = axios.create({
  baseURL: `${baseURL}/unified-upload/`,
});

// Interceptor para agregar token de autenticación
UnifiedUploadClient.interceptors.request.use(
  async (config: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

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
      formData.append('promocionId', String(options.rfWindow.promocionId));
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
   * Upload examen IMP
   */
  static async uploadImpExam(file: File, options: ImpUploadOptions): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('themeNumber', String(options.themeNumber));
    formData.append('themeName', options.themeName);
    formData.append('impVariant', String(options.impVariant)); // 🆕 NUEVO
    formData.append('windowStartDate', options.windowStartDate);
    formData.append('autoRelease', String(options.autoRelease));
    formData.append('immediatelyAvailable', String(options.immediatelyAvailable || true));

    const { data } = await UnifiedUploadClient.post('imp-exam', formData, {
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
