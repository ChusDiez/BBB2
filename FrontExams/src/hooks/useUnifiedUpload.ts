import { useState, useCallback } from 'react';
import UnifiedUploadAPI from '../apis/UnifiedUploadAPI';
import { UnifiedUploadFormData, UnifiedUploadOptions, UploadResult, ScheduledExam } from '../types/unifiedUpload';

export default function useUnifiedUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para formatear fecha y hora en ISO string
  const formatDateTime = useCallback((date: string, time: string): string => {
    if (!date || !time) return '';
    return new Date(`${date}T${time}:00`).toISOString();
  }, []);

  // Función principal de upload
  const uploadFile = useCallback(async (formData: UnifiedUploadFormData) => {
    if (!formData.file) {
      setError('No se ha seleccionado ningún archivo');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      let result: UploadResult;
      const options: UnifiedUploadOptions = {
        uploadType: formData.uploadType,
        immediatelyAvailable: formData.immediatelyAvailable,
      };

      switch (formData.uploadType) {
        case 'direct':
          result = await UnifiedUploadAPI.uploadDirect(formData.file);
          break;

        case 'rf_exam':
          options.rfWindow = {
            examName: formData.rfExamName,
            startDate: formatDateTime(formData.rfStartDate, formData.rfStartTime),
            endDate: formData.rfUseAutoRelease ? '' : formatDateTime(formData.rfEndDate, formData.rfEndTime),
          };
          
          if (formData.rfUseAutoRelease) {
            options.globalRelease = {
              releaseDate: formatDateTime(formData.rfAutoReleaseDate, formData.rfAutoReleaseTime),
              autoRelease: true,
            };
          }
          
          result = await UnifiedUploadAPI.uploadRFExam(formData.file, options);
          break;

        case 'future_questions':
          options.globalRelease = {
            releaseDate: formatDateTime(formData.futureReleaseDate, formData.futureReleaseTime),
            autoRelease: formData.futureAutoRelease,
          };
          result = await UnifiedUploadAPI.uploadFutureQuestions(formData.file, options);
          break;

        case 'custom_exam':
          options.customExam = {
            examName: formData.customExamName,
            examType: formData.customExamType,
            availabilityType: formData.customAvailabilityType,
          };
          result = await UnifiedUploadAPI.uploadCustomExam(formData.file, options);
          break;

        case 'imp_exam': {
          const themeNumber = parseInt(formData.impThemeNumber);
          if (isNaN(themeNumber)) {
            throw new Error('Número de tema inválido');
          }
          const windowStartISO = formData.impWindowStartDate
            ? new Date(`${formData.impWindowStartDate}T00:00:00`).toISOString()
            : '';
          result = await UnifiedUploadAPI.uploadImpExam(formData.file, {
            themeNumber,
            themeName: formData.impThemeName,
            windowStartDate: windowStartISO,
            autoRelease: formData.impAutoRelease,
            immediatelyAvailable: formData.immediatelyAvailable,
          });
          break;
        }

        default:
          throw new Error('Tipo de upload no válido');
      }

      setUploadResult(result);
      
      // Recargar exámenes programados si es necesario
      if (formData.uploadType !== 'direct') {
        await loadScheduledExams();
      }
      
    } catch (error: any) {
      console.error('Error en upload:', error);
      setError(error.response?.data?.message || error.message || 'Error desconocido en la subida');
    } finally {
      setIsUploading(false);
    }
  }, [formatDateTime]);

  // Cargar exámenes programados
  const loadScheduledExams = useCallback(async () => {
    setIsLoadingScheduled(true);
    try {
      const exams = await UnifiedUploadAPI.getScheduledExams();
      setScheduledExams(exams);
    } catch (error: any) {
      console.error('Error cargando exámenes programados:', error);
      setError('Error al cargar exámenes programados');
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  // Eliminar examen programado
  const deleteScheduledExam = useCallback(async (examId: number) => {
    try {
      await UnifiedUploadAPI.deleteScheduledExam(examId);
      await loadScheduledExams(); // Recargar lista
    } catch (error: any) {
      console.error('Error eliminando examen:', error);
      setError('Error al eliminar el examen');
    }
  }, [loadScheduledExams]);

  // Activar examen programado
  const activateScheduledExam = useCallback(async (examId: number) => {
    try {
      await UnifiedUploadAPI.activateScheduledExam(examId);
      await loadScheduledExams(); // Recargar lista
    } catch (error: any) {
      console.error('Error activando examen:', error);
      setError('Error al activar el examen');
    }
  }, [loadScheduledExams]);

  // Limpiar resultados
  const clearResults = useCallback(() => {
    setUploadResult(null);
    setError(null);
  }, []);

  return {
    // Estado
    isUploading,
    uploadResult,
    scheduledExams,
    isLoadingScheduled,
    error,
    
    // Funciones
    uploadFile,
    loadScheduledExams,
    deleteScheduledExam,
    activateScheduledExam,
    clearResults,
  };
}
