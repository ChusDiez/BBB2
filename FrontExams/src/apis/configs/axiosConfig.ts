import axios from 'axios';

// Usar variable de entorno o valor por defecto
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

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