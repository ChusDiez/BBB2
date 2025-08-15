import { useState, useCallback } from 'react';
import EvolcampusAPI, {
  EvolcampusPreviewResponse,
  EvolcampusQuestion,
  ImportResult
} from '../apis/EvolcampusAPI';

/**
 * Hook personalizado para manejar la importación de CSV desde Evolcampus
 * Encapsula toda la lógica de estado y operaciones relacionadas
 */
export const useEvolcampusImport = () => {
  // Estados principales
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [previewData, setPreviewData] = useState<EvolcampusPreviewResponse | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);

  const evolcampusAPI = new EvolcampusAPI();

  // Validaciones
  const validateStep1 = useCallback((): string | null => {
    if (!file) return 'Por favor selecciona un archivo CSV';
    if (!EvolcampusAPI.isValidCSVFile(file)) return 'El archivo debe ser un CSV válido';
    if (!topic) return 'Por favor especifica el tema';
    
    const topicNum = parseInt(topic);
    if (!EvolcampusAPI.isValidTopic(topicNum)) return 'El tema debe ser un número entre 1 y 45';
    
    return null;
  }, [file, topic]);

  const validateStep2 = useCallback((): string | null => {
    if (!previewData) return 'No hay datos de preview disponibles';
    if (selectedQuestions.size === 0) return 'Debes seleccionar al menos una pregunta para importar';
    return null;
  }, [previewData, selectedQuestions]);

  // Operaciones principales
  const generatePreview = useCallback(async (): Promise<boolean> => {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await evolcampusAPI.generatePreview(file!, parseInt(topic));
      setPreviewData(result);
      
      // Seleccionar todas las preguntas por defecto
      const allQuestionIds = new Set(result.questions.map((_, index) => index));
      setSelectedQuestions(allQuestionIds);
      
      setActiveStep(1);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [file, topic, validateStep1, evolcampusAPI]);

  const confirmImport = useCallback(async (): Promise<boolean> => {
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const questionsToImport = Array.from(selectedQuestions).map(
        index => previewData!.questions[index]
      );

      const result = await evolcampusAPI.confirmImport(
        questionsToImport,
        previewData!.fileName
      );

      setImportResult(result);
      setSuccess(
        `Importación completada: ${result.summary.newQuestions} nuevas, ${result.summary.updatedQuestions} actualizadas`
      );
      setActiveStep(2);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [previewData, selectedQuestions, validateStep2, evolcampusAPI]);

  // Manejo de archivos
  const handleFileSelect = useCallback((selectedFile: File) => {
    if (EvolcampusAPI.isValidCSVFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Por favor selecciona un archivo CSV válido');
    }
  }, []);

  const handleFileDrop = useCallback((droppedFile: File) => {
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  // Manejo de tema
  const handleTopicChange = useCallback((newTopic: string) => {
    setTopic(newTopic);
    if (newTopic && !EvolcampusAPI.isValidTopic(parseInt(newTopic))) {
      setError('El tema debe ser un número entre 1 y 45');
    } else {
      setError(null);
    }
  }, []);

  // Manejo de selección de preguntas
  const handleQuestionToggle = useCallback((index: number) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (previewData) {
      const allIds = new Set(previewData.questions.map((_, index) => index));
      setSelectedQuestions(allIds);
    }
  }, [previewData]);

  const handleDeselectAll = useCallback(() => {
    setSelectedQuestions(new Set());
  }, []);

  const handleSelectByStatus = useCallback((status: 'new' | 'duplicate') => {
    if (previewData) {
      const filteredIds = new Set(
        previewData.questions
          .map((question, index) => ({ question, index }))
          .filter(({ question }) => 
            status === 'new' ? !question.isDuplicate : question.isDuplicate
          )
          .map(({ index }) => index)
      );
      setSelectedQuestions(filteredIds);
    }
  }, [previewData]);

  // Manejo de edición
  const handleEditQuestion = useCallback((index: number) => {
    setEditingQuestion(index);
  }, []);

  const handleSaveEdit = useCallback((index: number, updatedQuestion: Partial<EvolcampusQuestion>) => {
    if (previewData) {
      const updatedQuestions = [...previewData.questions];
      updatedQuestions[index] = { ...updatedQuestions[index], ...updatedQuestion };
      setPreviewData({ ...previewData, questions: updatedQuestions });
      setEditingQuestion(null);
    }
  }, [previewData]);

  const handleCancelEdit = useCallback(() => {
    setEditingQuestion(null);
  }, []);

  // Navegación y reset
  const handleNext = useCallback(async () => {
    if (activeStep === 0) {
      return await generatePreview();
    } else if (activeStep === 1) {
      return await confirmImport();
    }
    return false;
  }, [activeStep, generatePreview, confirmImport]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      setError(null);
    }
  }, [activeStep]);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setFile(null);
    setTopic('');
    setPreviewData(null);
    setSelectedQuestions(new Set());
    setEditingQuestion(null);
    setError(null);
    setSuccess(null);
    setImportResult(null);
    setLoading(false);
  }, []);

  // Utilidades
  const getStepTitle = useCallback((step: number): string => {
    const titles = [
      'Subir archivo y especificar tema',
      'Preview y edición de preguntas',
      'Confirmación y resultados'
    ];
    return titles[step] || '';
  }, []);

  const getSelectedQuestionsData = useCallback((): EvolcampusQuestion[] => {
    if (!previewData) return [];
    return Array.from(selectedQuestions).map(index => previewData.questions[index]);
  }, [previewData, selectedQuestions]);

  const getStatsSummary = useCallback(() => {
    if (!previewData) return null;

    const selectedData = getSelectedQuestionsData();
    return {
      total: previewData.stats.total,
      selected: selectedQuestions.size,
      newSelected: selectedData.filter(q => !q.isDuplicate).length,
      duplicatesSelected: selectedData.filter(q => q.isDuplicate).length,
      errors: previewData.stats.errors,
      topic: previewData.stats.topic,
      block: previewData.stats.block,
      processingTime: previewData.stats.processingTime
    };
  }, [previewData, selectedQuestions, getSelectedQuestionsData]);

  const canProceedToNext = useCallback((): boolean => {
    if (activeStep === 0) return validateStep1() === null;
    if (activeStep === 1) return validateStep2() === null;
    return false;
  }, [activeStep, validateStep1, validateStep2]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const calculateBlock = useCallback((topicValue: string): string | null => {
    const topicNum = parseInt(topicValue);
    return EvolcampusAPI.calculateBlock(topicNum);
  }, []);

  // Enriquecimiento con IA
  const enrichFeedbackWithAI = useCallback(async (provider: 'openai' | 'anthropic' = 'openai'): Promise<boolean> => {
    if (!previewData) {
      setError('No hay datos de preview disponibles para enriquecer');
      return false;
    }

    const selectedData = getSelectedQuestionsData();
    const questionsWithFeedback = selectedData.filter(q => q.feedback && q.feedback.trim());

    if (questionsWithFeedback.length === 0) {
      setError('No hay feedback disponible para enriquecer en las preguntas seleccionadas');
      return false;
    }

    setEnrichmentLoading(true);
    setError(null);

    try {
      console.log(`🤖 Enriqueciendo ${questionsWithFeedback.length} feedbacks con ${provider}`);
      
      const result = await evolcampusAPI.enrichFeedback(selectedData, provider);
      
      // Actualizar las preguntas en previewData con las versiones enriquecidas
      const updatedQuestions = [...previewData.questions];
      
      result.questions.forEach((enrichedQ, resultIndex) => {
        // Encontrar el índice original de la pregunta
        Array.from(selectedQuestions).forEach(originalIndex => {
          const originalQ = previewData.questions[originalIndex];
          if (originalQ.question === enrichedQ.question) {
            updatedQuestions[originalIndex] = enrichedQ;
          }
        });
      });

      setPreviewData({
        ...previewData,
        questions: updatedQuestions
      });

      setSuccess(
        `✨ Enriquecimiento completado: ${result.stats.enrichedSuccessfully} feedback(s) mejorados con IA`
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error durante el enriquecimiento: ${errorMessage}`);
      return false;
    } finally {
      setEnrichmentLoading(false);
    }
  }, [previewData, selectedQuestions, getSelectedQuestionsData, evolcampusAPI]);

  return {
    // Estados
    activeStep,
    loading,
    file,
    topic,
    previewData,
    selectedQuestions,
    editingQuestion,
    error,
    success,
    importResult,
    enrichmentLoading,

    // Operaciones principales
    generatePreview,
    confirmImport,

    // Manejo de archivos
    handleFileSelect,
    handleFileDrop,

    // Manejo de tema
    handleTopicChange,

    // Manejo de selección
    handleQuestionToggle,
    handleSelectAll,
    handleDeselectAll,
    handleSelectByStatus,

    // Manejo de edición
    handleEditQuestion,
    handleSaveEdit,
    handleCancelEdit,

    // Navegación
    handleNext,
    handleBack,
    handleReset,

    // Utilidades
    getStepTitle,
    getSelectedQuestionsData,
    getStatsSummary,
    canProceedToNext,
    clearMessages,
    calculateBlock,

    // Validaciones
    validateStep1,
    validateStep2,

    // Enriquecimiento con IA
    enrichFeedbackWithAI,

    // API helpers
    api: evolcampusAPI
  };
};
