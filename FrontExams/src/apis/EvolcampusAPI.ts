import { UploadClient } from './configs/axiosConfig';

/**
 * API para manejar importaciones desde Evolcampus
 */
export interface EvolcampusPreviewResponse {
  success: boolean;
  fileName: string;
  questions: EvolcampusQuestion[];
  stats: ImportStats;
  errors: string[];
  hasMoreErrors: boolean;
}

export interface EvolcampusQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctAnswer: 'A' | 'B' | 'C';
  topic: number;
  block: '1' | '2' | '3';
  feedback?: string;
  isDuplicate: boolean;
  existingId?: number;
  status: 'new' | 'update';
}

export interface ImportStats {
  total: number;
  new: number;
  duplicates: number;
  errors: number;
  topic: number;
  block: '1' | '2' | '3';
  processingTime: number;
}

export interface ImportSummary {
  total: number;
  newQuestions: number;
  updatedQuestions: number;
  errors: number;
  processingTime: number;
}

export interface ImportResult {
  success: boolean;
  summary: ImportSummary;
  logId: number;
  message?: string;
}

export interface ImportLog {
  id: number;
  fileName: string;
  topic: number;
  block: '1' | '2' | '3';
  totalQuestions: number;
  newQuestions: number;
  updatedQuestions: number;
  status: 'pending' | 'completed' | 'failed' | 'partial';
  processingTime?: number;
  createdAt: string;
}

export interface ImportHistoryResponse {
  success: boolean;
  history: ImportLog[];
}

export interface ImportDetailsResponse {
  success: boolean;
  details: ImportLog & {
    skippedQuestions: number;
    errorQuestions: number;
    userId?: string;
    importedData?: any;
    errors?: string[];
  };
}

export interface EnrichmentStats {
  totalQuestions: number;
  questionsWithFeedback: number;
  enrichedSuccessfully: number;
  enrichmentErrors: number;
  skipped: number;
}

export interface EnrichmentResponse {
  success: boolean;
  questions: EvolcampusQuestion[];
  stats: EnrichmentStats;
  provider: string;
}

/**
 * Clase para manejar las operaciones de importación de Evolcampus
 */
class EvolcampusAPI {
  /**
   * Genera un preview de la importación sin guardar en base de datos
   * @param file - Archivo CSV a procesar
   * @param topic - Tema a asignar (1-45)
   * @returns Promise con el preview de las preguntas
   */
  async generatePreview(file: File, topic: number): Promise<EvolcampusPreviewResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('topic', topic.toString());

      const response = await UploadClient.post('preview-evolcampus', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 segundos timeout para archivos grandes
      });

      return response.data;
    } catch (error: any) {
      console.error('Error generando preview:', error);
      
      // Manejar errores específicos
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Archivo CSV inválido o tema no especificado');
      } else if (error.response?.status === 500) {
        throw new Error('Error interno del servidor procesando el archivo');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout procesando el archivo - el archivo puede ser demasiado grande');
      } else {
        throw new Error('Error conectando con el servidor');
      }
    }
  }

  /**
   * Confirma e importa las preguntas seleccionadas
   * @param questions - Array de preguntas a importar
   * @param fileName - Nombre del archivo original
   * @param userId - ID del usuario (opcional)
   * @returns Promise con el resultado de la importación
   */
  async confirmImport(
    questions: EvolcampusQuestion[], 
    fileName: string, 
    userId?: string
  ): Promise<ImportResult> {
    try {
      const response = await UploadClient.post('confirm-evolcampus', {
        questions,
        fileName,
        userId,
      }, {
        timeout: 60000, // 60 segundos para importaciones grandes
      });

      return response.data;
    } catch (error: any) {
      console.error('Error confirmando importación:', error);
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Datos de importación inválidos');
      } else if (error.response?.status === 500) {
        throw new Error('Error interno del servidor durante la importación');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout durante la importación - demasiadas preguntas para procesar');
      } else {
        throw new Error('Error conectando con el servidor');
      }
    }
  }

  /**
   * Obtiene el historial de importaciones
   * @param limit - Número máximo de registros (default: 50)
   * @returns Promise con el historial de importaciones
   */
  async getImportHistory(limit: number = 50): Promise<ImportHistoryResponse> {
    try {
      const response = await UploadClient.get('import-history', {
        params: { limit },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo historial:', error);
      throw new Error('Error obteniendo historial de importaciones');
    }
  }

  /**
   * Obtiene detalles de una importación específica
   * @param logId - ID del log de importación
   * @returns Promise con los detalles de la importación
   */
  async getImportDetails(logId: number): Promise<ImportDetailsResponse> {
    try {
      const response = await UploadClient.get(`import-details/${logId}`);

      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo detalles:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Importación no encontrada');
      } else {
        throw new Error('Error obteniendo detalles de la importación');
      }
    }
  }

  /**
   * Enriquece el feedback de las preguntas con IA
   * @param questions - Array de preguntas para enriquecer
   * @param provider - Proveedor de IA ('openai' o 'anthropic')
   * @returns Promise con las preguntas enriquecidas
   */
  async enrichFeedback(
    questions: EvolcampusQuestion[], 
    provider: 'openai' | 'anthropic' = 'openai'
  ): Promise<EnrichmentResponse> {
    try {
      const response = await UploadClient.post('enrich-feedback-evolcampus', {
        questions,
        provider,
      }, {
        timeout: 120000, // 2 minutos para el enriquecimiento con IA
      });

      return response.data;
    } catch (error: any) {
      console.error('Error enriqueciendo feedback:', error);
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Datos inválidos para enriquecimiento');
      } else if (error.response?.status === 500) {
        throw new Error('Error interno del servidor durante el enriquecimiento');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout durante el enriquecimiento - proceso demorado');
      } else {
        throw new Error('Error conectando con el servidor');
      }
    }
  }

  /**
   * Calcula el bloque según el tema
   * @param topic - Número del tema (1-45)
   * @returns Bloque ('1', '2', '3') o null si es inválido
   */
  static calculateBlock(topic: number): '1' | '2' | '3' | null {
    if (topic >= 1 && topic <= 26) return '1';
    if (topic >= 27 && topic <= 37) return '2';
    if (topic >= 38 && topic <= 45) return '3';
    return null;
  }

  /**
   * Valida que un tema esté en el rango correcto
   * @param topic - Número del tema a validar
   * @returns true si es válido, false si no
   */
  static isValidTopic(topic: number): boolean {
    return Number.isInteger(topic) && topic >= 1 && topic <= 45;
  }

  /**
   * Valida el formato de un archivo CSV
   * @param file - Archivo a validar
   * @returns true si es válido, false si no
   */
  static isValidCSVFile(file: File): boolean {
    return file && file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
  }

  /**
   * Formatea el tiempo de procesamiento para mostrar
   * @param milliseconds - Tiempo en milisegundos
   * @returns String formateado (ej: "2.5s", "1.2min")
   */
  static formatProcessingTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      return `${(milliseconds / 60000).toFixed(1)}min`;
    }
  }

  /**
   * Formatea una fecha para mostrar
   * @param dateString - Fecha en formato ISO
   * @returns String formateado para mostrar
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Hace un momento';
    } else if (diffMins < 60) {
      return `Hace ${diffMins} minutos`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} horas`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
}

export default EvolcampusAPI;
