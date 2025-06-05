/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState } from 'react';
import UploadAPI from '../apis/UploadAPI';

export default function useUploadFiles() {
  const [files, setFiles] = useState<Array<any>>([]);
  const [result, setResult] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);

  const submitFiles = async () => {
    if (files.length === 0) return;
    
    setIsLoading(true);
    try {
      const newFiles = files.map(({ file }) => file as File);
      const data = await UploadAPI.uploadFiles(newFiles);
      setResult(data);
    } catch (error) {
      console.error('Error al cargar archivos:', error);
      // Crear un resultado de error si la petición falla completamente
      setResult([{
        status: 'rejected',
        reason: {
          fileName: 'Error de conexión',
          message: 'No se pudo conectar con el servidor',
          error: error
        }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    files,
    setFiles,
    result,
    submitFiles,
    isLoading,
  };
}
