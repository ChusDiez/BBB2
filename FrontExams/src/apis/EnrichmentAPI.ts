// FrontExams/src/apis/EnrichmentAPI.ts
import axios from 'axios';
import { supabase } from '../lib/supabase';

// Usar la misma configuración que otros APIs
const baseURL = process.env.REACT_APP_API_URL ? 
  `${process.env.REACT_APP_API_URL}/api/v1` : 
  'http://localhost:8000/api/v1';

const EnrichmentClient = axios.create({
  baseURL: `${baseURL}/enrichment/`,
});

// Interceptor para agregar token de autenticación
EnrichmentClient.interceptors.request.use(
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