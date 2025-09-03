// BackExams/utils/initializeTemporalService.js
import TemporalManagementService from '../services/temporalManagement.services.js';

let temporalServiceInstance = null;

/**
 * 🕒 INICIALIZAR SERVICIO DE GESTIÓN TEMPORAL
 * 
 * Este servicio debe iniciarse cuando arranca el servidor
 * para manejar automáticamente:
 * - Apertura/cierre de ventanas de RF
 * - Liberación automática al pool global
 * - Activación de exámenes programados
 */
export function initializeTemporalService() {
  try {
    if (temporalServiceInstance) {
      console.log('⚠️ Servicio temporal ya está inicializado');
      return temporalServiceInstance;
    }

    console.log('🕒 Inicializando servicio de gestión temporal...');
    
    temporalServiceInstance = new TemporalManagementService();
    temporalServiceInstance.start();
    
    console.log('✅ Servicio de gestión temporal inicializado correctamente');
    
    return temporalServiceInstance;
    
  } catch (error) {
    console.error('❌ Error inicializando servicio temporal:', error);
    throw error;
  }
}

/**
 * 🛑 DETENER SERVICIO TEMPORAL
 */
export function stopTemporalService() {
  if (temporalServiceInstance) {
    temporalServiceInstance.stop();
    temporalServiceInstance = null;
    console.log('🛑 Servicio temporal detenido');
  }
}

/**
 * 📊 OBTENER INSTANCIA DEL SERVICIO
 */
export function getTemporalServiceInstance() {
  return temporalServiceInstance;
}

/**
 * 🔄 GRACEFUL SHUTDOWN
 * Para manejar el cierre limpio del servidor
 */
export function setupGracefulShutdown() {
  const gracefulShutdown = (signal) => {
    console.log(`\n📡 Recibida señal ${signal}, cerrando servicios...`);
    
    try {
      stopTemporalService();
      console.log('✅ Servicios cerrados correctamente');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error durante el cierre:', error);
      process.exit(1);
    }
  };

  // Manejar señales de cierre
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Manejar errores no capturados
  process.on('uncaughtException', (error) => {
    console.error('💥 Error no capturado:', error);
    stopTemporalService();
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promise rechazada no manejada:', reason);
    stopTemporalService();
    process.exit(1);
  });
}

export default {
  initializeTemporalService,
  stopTemporalService,
  getTemporalServiceInstance,
  setupGracefulShutdown
};
