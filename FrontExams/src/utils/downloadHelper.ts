// FrontExams/src/utils/downloadHelper.ts
import { supabase } from '../lib/supabase';
import { API_URL } from '../config/api';

/**
 * Descarga un archivo autenticado desde el backend
 * @param endpoint - Endpoint relativo (ej: `/historic/download?id=123&type=doc`)
 * @param filename - Nombre sugerido para el archivo descargado
 */
export const downloadWithAuth = async (endpoint: string, filename?: string) => {
  try {
    console.log('🔍 Iniciando descarga autenticada...');
    
    // Obtener token de sesión
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('📋 Sesión obtenida:', {
      hasSession: !!session,
      hasToken: !!session?.access_token,
      userEmail: session?.user?.email,
      error: error?.message
    });
    
    if (!session?.access_token) {
      console.error('❌ No hay sesión activa o token');
      throw new Error('No hay sesión activa');
    }

    console.log('🚀 Haciendo petición a:', `${API_URL}${endpoint}`);
    console.log('🔑 Token (primeros 50 chars):', session.access_token.substring(0, 50) + '...');

    // Hacer petición autenticada
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error en descarga: ${response.status} ${response.statusText}`);
    }

    // Obtener el blob del archivo
    const blob = await response.blob();
    
    // Crear URL temporal para descarga
    const url = window.URL.createObjectURL(blob);
    
    // Crear elemento <a> temporal para activar descarga
    const link = document.createElement('a');
    link.href = url;
    
    // Intentar obtener filename del header Content-Disposition
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        link.download = filenameMatch[1].replace(/['"]/g, '');
      }
    } else if (filename) {
      link.download = filename;
    }
    
    // Activar descarga
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    alert(`Error al descargar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

/**
 * Helper específico para descargas de históricos
 */
export const downloadHistoric = (idExam: number, type: 'csv' | 'doc', feedback?: boolean) => {
  const params = new URLSearchParams({
    id: idExam.toString(),
    type,
  });
  
  if (feedback) {
    params.append('feedback', 'true');
  }
  
  const endpoint = `/historic/download?${params.toString()}`;
  const extension = type.toUpperCase();
  const feedbackSuffix = feedback ? '_feedback' : '';
  const filename = `examen_${idExam}${feedbackSuffix}.${type}`;
  
  return downloadWithAuth(endpoint, filename);
};
