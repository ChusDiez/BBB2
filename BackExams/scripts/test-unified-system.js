// BackExams/scripts/test-unified-system.js
import UnifiedUploadService from '../services/unifiedUpload.services.js';
import TemporalManagementService from '../services/temporalManagement.services.js';
import RFMigrationService from './migrate-existing-rfs.js';
import SpecificExam from '../models/specificExams.model.js';
import Historic from '../models/historicExams.model.js';
import Questions from '../models/questions.model.js';

/**
 * 🧪 SCRIPT DE PRUEBA DEL SISTEMA UNIFICADO
 * 
 * Este script verifica que todos los componentes del sistema
 * unificado estén funcionando correctamente.
 */

class UnifiedSystemTester {
  constructor() {
    this.uploadService = new UnifiedUploadService();
    this.temporalService = new TemporalManagementService();
    this.migrationService = new RFMigrationService();
  }

  /**
   * 🚀 EJECUTAR TODAS LAS PRUEBAS
   */
  async runAllTests() {
    console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA UNIFICADO\n');
    console.log('='.repeat(60));

    const tests = [
      { name: 'Conexión a Base de Datos', fn: () => this.testDatabaseConnection() },
      { name: 'Modelos Sequelize', fn: () => this.testModels() },
      { name: 'Servicios de Upload', fn: () => this.testUploadServices() },
      { name: 'Servicio Temporal', fn: () => this.testTemporalService() },
      { name: 'Servicio de Migración', fn: () => this.testMigrationService() },
      { name: 'Estado de RF Existentes', fn: () => this.testExistingRFs() },
    ];

    const results = [];

    for (const test of tests) {
      console.log(`\n🔍 Probando: ${test.name}`);
      console.log('-'.repeat(40));
      
      try {
        const result = await test.fn();
        console.log(`✅ ${test.name}: PASÓ`);
        results.push({ name: test.name, status: 'PASÓ', result });
      } catch (error) {
        console.error(`❌ ${test.name}: FALLÓ`);
        console.error(`   Error: ${error.message}`);
        results.push({ name: test.name, status: 'FALLÓ', error: error.message });
      }
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'PASÓ').length;
    const failed = results.filter(r => r.status === 'FALLÓ').length;

    console.log(`✅ Pruebas pasadas: ${passed}`);
    console.log(`❌ Pruebas fallidas: ${failed}`);
    console.log(`📊 Total: ${results.length}`);

    if (failed > 0) {
      console.log('\n❌ PRUEBAS FALLIDAS:');
      results.filter(r => r.status === 'FALLÓ').forEach(r => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
    }

    console.log('\n🎉 PRUEBAS COMPLETADAS');
    return { passed, failed, results };
  }

  /**
   * 🗄️ PROBAR CONEXIÓN A BASE DE DATOS
   */
  async testDatabaseConnection() {
    // Verificar que podemos hacer queries básicas
    const questionCount = await Questions.count();
    const historicCount = await Historic.count();
    
    console.log(`   📊 Preguntas en BD: ${questionCount}`);
    console.log(`   📊 Históricos en BD: ${historicCount}`);
    
    if (questionCount === 0) {
      throw new Error('No hay preguntas en la base de datos');
    }
    
    return { questionCount, historicCount };
  }

  /**
   * 🏗️ PROBAR MODELOS SEQUELIZE
   */
  async testModels() {
    // Verificar que los modelos están correctamente definidos
    const models = [
      { name: 'Questions', model: Questions },
      { name: 'Historic', model: Historic },
      { name: 'SpecificExam', model: SpecificExam },
    ];

    const results = {};

    for (const { name, model } of models) {
      try {
        // Intentar una query simple
        const count = await model.count();
        console.log(`   ✅ ${name}: ${count} registros`);
        results[name] = count;
      } catch (error) {
        console.error(`   ❌ ${name}: Error - ${error.message}`);
        throw new Error(`Modelo ${name} no funciona: ${error.message}`);
      }
    }

    // Verificar estructura de Questions (globally_available)
    const sampleQuestion = await Questions.findOne();
    if (sampleQuestion) {
      const hasGloballyAvailable = sampleQuestion.dataValues.hasOwnProperty('globally_available');
      console.log(`   🔍 Questions.globally_available existe: ${hasGloballyAvailable}`);
      if (!hasGloballyAvailable) {
        throw new Error('Columna globally_available no existe en Questions');
      }
    }

    return results;
  }

  /**
   * 📤 PROBAR SERVICIOS DE UPLOAD
   */
  async testUploadServices() {
    // Verificar que los servicios están correctamente inicializados
    const services = ['uploadDirect', 'uploadRFExam', 'uploadFutureQuestions', 'uploadCustomExam'];
    
    for (const serviceName of services) {
      if (typeof this.uploadService[serviceName] !== 'function') {
        throw new Error(`Método ${serviceName} no existe en UnifiedUploadService`);
      }
      console.log(`   ✅ ${serviceName}: Método disponible`);
    }

    // Verificar métodos de ayuda
    const helpers = ['determineGlobalAvailability', 'generateHistoricName', 'needsSpecificExamRecord'];
    
    for (const helperName of helpers) {
      if (typeof this.uploadService[helperName] !== 'function') {
        throw new Error(`Helper ${helperName} no existe`);
      }
      console.log(`   ✅ ${helperName}: Helper disponible`);
    }

    return { services, helpers };
  }

  /**
   * 🕒 PROBAR SERVICIO TEMPORAL
   */
  async testTemporalService() {
    // Verificar métodos del servicio temporal
    const methods = ['start', 'stop', 'getServiceStatus', 'manualReleaseExam', 'manualActivateExam'];
    
    for (const methodName of methods) {
      if (typeof this.temporalService[methodName] !== 'function') {
        throw new Error(`Método ${methodName} no existe en TemporalManagementService`);
      }
      console.log(`   ✅ ${methodName}: Método disponible`);
    }

    // Obtener estado del servicio
    const status = await this.temporalService.getServiceStatus();
    console.log(`   📊 Servicio temporal corriendo: ${status.isRunning}`);
    console.log(`   📊 Trabajos programados: ${status.scheduledJobsCount || 0}`);

    return status;
  }

  /**
   * 🔄 PROBAR SERVICIO DE MIGRACIÓN
   */
  async testMigrationService() {
    // Verificar métodos del servicio de migración
    const methods = ['verifyMigrationStatus', 'migrateExistingRFs', 'findRFHistorics'];
    
    for (const methodName of methods) {
      if (typeof this.migrationService[methodName] !== 'function') {
        throw new Error(`Método ${methodName} no existe en RFMigrationService`);
      }
      console.log(`   ✅ ${methodName}: Método disponible`);
    }

    // Verificar estado de migración
    const status = await this.migrationService.verifyMigrationStatus();
    console.log(`   📊 RF en historics: ${status.rfInHistorics}`);
    console.log(`   📊 RF en specific_exams: ${status.rfInSpecificExams}`);
    console.log(`   🔍 Necesita migración: ${status.needsMigration}`);

    return status;
  }

  /**
   * 📊 PROBAR ESTADO DE RF EXISTENTES
   */
  async testExistingRFs() {
    // Buscar RF en historics
    const rfHistorics = await Historic.findAll({
      where: {
        name: {
          [Historic.sequelize.Op.regexp]: '^RF[0-9]+$'
        }
      },
      order: [['name', 'ASC']],
      limit: 10
    });

    console.log(`   📊 RF encontrados en historics: ${rfHistorics.length}`);
    
    if (rfHistorics.length > 0) {
      console.log('   📋 Primeros RF encontrados:');
      rfHistorics.slice(0, 5).forEach(rf => {
        console.log(`      - ${rf.name} (${rf.amount} preguntas)`);
      });
    }

    // Buscar RF en specific_exams
    const rfSpecificExams = await SpecificExam.findAll({
      where: { exam_type: 'rf' },
      limit: 10
    });

    console.log(`   📊 RF migrados en specific_exams: ${rfSpecificExams.length}`);

    if (rfSpecificExams.length > 0) {
      console.log('   📋 RF migrados:');
      rfSpecificExams.slice(0, 5).forEach(exam => {
        console.log(`      - ${exam.exam_name} (Status: ${exam.status})`);
      });
    }

    // Verificar distribución de globally_available
    const globalStats = await Questions.findAll({
      attributes: [
        'globally_available',
        [Questions.sequelize.fn('COUNT', Questions.sequelize.col('id')), 'count']
      ],
      group: ['globally_available'],
      raw: true
    });

    console.log('   📊 Distribución globally_available:');
    globalStats.forEach(stat => {
      console.log(`      - ${stat.globally_available}: ${stat.count} preguntas`);
    });

    return {
      rfInHistorics: rfHistorics.length,
      rfInSpecificExams: rfSpecificExams.length,
      globalStats
    };
  }

  /**
   * 🎯 PROBAR FUNCIONALIDAD ESPECÍFICA
   */
  async testSpecificFunctionality() {
    console.log('\n🎯 PROBANDO FUNCIONALIDADES ESPECÍFICAS');
    console.log('='.repeat(60));

    // Test 1: Determinar disponibilidad global
    console.log('\n🔍 Test: determineGlobalAvailability');
    const testCases = [
      { uploadType: 'direct', expected: true },
      { uploadType: 'rf_exam', immediatelyAvailable: false, expected: false },
      { uploadType: 'future_questions', expected: false },
      { uploadType: 'custom_exam', immediatelyAvailable: true, expected: true },
    ];

    for (const testCase of testCases) {
      const result = this.uploadService.determineGlobalAvailability(testCase);
      const passed = result === testCase.expected;
      console.log(`   ${passed ? '✅' : '❌'} ${testCase.uploadType}: ${result} (esperado: ${testCase.expected})`);
    }

    // Test 2: Generar nombres de históricos
    console.log('\n🔍 Test: generateHistoricName');
    const nameTests = [
      { uploadType: 'direct', expected: /^UPLOAD_/ },
      { uploadType: 'rf_exam', rfWindow: { examName: 'RF19' }, expected: 'RF19' },
      { uploadType: 'future_questions', expected: /^FUTURE_/ },
      { uploadType: 'custom_exam', customExam: { examName: 'Test Constitución' }, expected: 'Test Constitución' },
    ];

    for (const testCase of nameTests) {
      const result = this.uploadService.generateHistoricName(testCase);
      const passed = typeof testCase.expected === 'string' 
        ? result === testCase.expected
        : testCase.expected.test(result);
      console.log(`   ${passed ? '✅' : '❌'} ${testCase.uploadType}: "${result}"`);
    }

    // Test 3: Necesidad de specific_exam
    console.log('\n🔍 Test: needsSpecificExamRecord');
    const recordTests = [
      { uploadType: 'direct', expected: false },
      { uploadType: 'rf_exam', expected: true },
      { uploadType: 'future_questions', expected: true },
      { uploadType: 'custom_exam', expected: true },
    ];

    for (const testCase of recordTests) {
      const result = this.uploadService.needsSpecificExamRecord(testCase);
      const passed = result === testCase.expected;
      console.log(`   ${passed ? '✅' : '❌'} ${testCase.uploadType}: ${result} (esperado: ${testCase.expected})`);
    }
  }
}

// 🚀 EJECUTAR PRUEBAS SI SE LLAMA DIRECTAMENTE
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new UnifiedSystemTester();
  
  try {
    const results = await tester.runAllTests();
    
    // Ejecutar pruebas específicas si todas pasaron
    if (results.failed === 0) {
      await tester.testSpecificFunctionality();
    }
    
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Error fatal en pruebas:', error);
    process.exit(1);
  }
}

export default UnifiedSystemTester;
