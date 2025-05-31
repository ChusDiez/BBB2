// FrontExams/src/apis/EnrichmentAPI.ts
import axios from 'axios';

// Crear cliente específico para enrichment
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';
const EnrichmentClient = axios.create({
  baseURL: `${baseURL}/enrichment/`,
});

export interface EnrichmentPreviewParams {
  feedback: string;
  question?: string;
  correctAnswer?: string;
  provider?: 'openai' | 'anthropic';
}

export interface EnrichmentBatchParams {
  questionIds: number[];
  provider?: 'openai' | 'anthropic';
}

const EnrichmentAPI = {
  // Obtener proveedores disponibles
  getProviders() {
    return EnrichmentClient.get('providers');
  },

  // Vista previa del enriquecimiento
  preview(params: EnrichmentPreviewParams) {
    return EnrichmentClient.post('preview', params);
  },

  // Enriquecer una sola pregunta
  enrichSingle(questionId: number, provider: 'openai' | 'anthropic' = 'openai') {
    return EnrichmentClient.post('single', { questionId, provider });
  },

  // Enriquecer múltiples preguntas
  enrichBatch(params: EnrichmentBatchParams) {
    return EnrichmentClient.post('batch', params);
  }
};

export default EnrichmentAPI;