import axios from 'axios';
import { supabase } from '../../lib/supabase';

// Usar variable de entorno o valor por defecto con /api/v1
const baseURL = process.env.REACT_APP_API_URL ? 
  `${process.env.REACT_APP_API_URL}/api/v1` : 
  'http://localhost:8000/api/v1';

// Interceptor para agregar token de autenticación a todas las requests
const addAuthInterceptor = (axiosInstance: any) => {
  axiosInstance.interceptors.request.use(
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
};

export const CategoriesClient = axios.create({
  baseURL: `${baseURL}/categories/`,
});

export const QuestionsClient = axios.create({
  baseURL: `${baseURL}/questions/`,
});

export const HistoricClient = axios.create({
  baseURL: `${baseURL}/historic/`,
});

export const UploadClient = axios.create({
  baseURL: `${baseURL}/upload/`,
});

export const AdminClient = axios.create({
  baseURL: `${baseURL}/admin/`,
});

export const DashboardClient = axios.create({
  baseURL: `${baseURL}/dashboard/`,
});

// Aplicar interceptor de autenticación a todos los clientes
addAuthInterceptor(CategoriesClient);
addAuthInterceptor(QuestionsClient);
addAuthInterceptor(HistoricClient);
addAuthInterceptor(UploadClient);
addAuthInterceptor(AdminClient);
addAuthInterceptor(DashboardClient);