// BackExams/scripts/migrate-existing-rfs.js
import Historic from '../models/historicExams.model.js';
import SpecificExam from '../models/specificExams.model.js';
import Questions from '../models/questions.model.js';
import { Op } from 'sequelize';

/**
 * 🔄 MIGRACIÓN DE RF EXISTENTES AL NUEVO SISTEMA
 * 
 * Este script migra los RF1-RF18 existentes al nuevo sistema unified:
 * - RF1-RF17: globally_available = TRUE (ya liberados)
 * - RF18: globally_available = FALSE (aún no liberado)
 * - Todos: Crear registros en specific_exams
 * 
 * ⚠️ EJECUTAR SOLO UNA VEZ ⚠️
 */

class RFMigrationService {
  
  /**
   * 🎯 FUNCIÓN PRINCIPAL DE MIGRACIÓN
   */
  async migrateExistingRFs() {
    try {
      console.log('🔄 Iniciando migración de RF existentes...\n');
      
      // 1. Buscar todos los historics que son RFs
      const rfHistorics = await this.findRFHistorics();
      
      if (rfHistorics.length === 0) {
        console.log('ℹ️ No se encontraron RF para migrar');
        return { success: true, migrated: 0 };
      }
      
      console.log(`📊 Encontrados ${rfHistorics.length} RF para migrar\n`);
      
      // 2. Migrar cada RF
      const results = [];
      
      for (const historic of rfHistorics) {
        const result = await this.migrateRF(historic);
        results.push(result);
      }
      
      // 3. Resumen de migración
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log('\n📋 RESUMEN DE MIGRACIÓN:');
      console.log(`✅ Exitosos: ${successful}`);
      console.log(`❌ Fallidos: ${failed}`);
      console.log(`📊 Total: ${results.length}`);
      
      if (failed > 0) {
        console.log('\n❌ RF con errores:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`   ${r.rfName}: ${r.error}`);
        });
      }
      
      return {
        success: failed === 0,
        total: results.length,
        successful,
        failed,
        results
      };
      
    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  }

  /**
   * 🔍 BUSCAR HISTORICS QUE SON RFs
   */
  async findRFHistorics() {
    try {
      // Buscar historics cuyo nombre contiene "RF" seguido de números
      const rfHistorics = await Historic.findAll({
        where: {
          name: {
            [Op.regexp]: '^RF[0-9]+$'  // Patrón: RF seguido de números
          }
        },
        order: [['name', 'ASC']]
      });

      console.log('🔍 RF encontrados:');
      rfHistorics.forEach(rf => {
        console.log(`   ${rf.name} (ID: ${rf.idExam}) - ${rf.amount} preguntas`);
      });
      
      return rfHistorics;
      
    } catch (error) {
      console.error('❌ Error buscando RF:', error);
      
      // Fallback: buscar por patrones comunes de nombres
      console.log('🔄 Intentando búsqueda alternativa...');
      
      const alternativeSearch = await Historic.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: 'RF%' } },
            { name: { [Op.like]: '%RF%' } },
            { type: 'RF' }
          ]
        }
      });
      
      console.log(`📊 Búsqueda alternativa encontró ${alternativeSearch.length} registros`);
      return alternativeSearch;
    }
  }

  /**
   * 🔄 MIGRAR UN RF ESPECÍFICO
   */
  async migrateRF(historic) {
    try {
      console.log(`🔄 Migrando ${historic.name}...`);
      
      // 1. Extraer número de RF del nombre
      const rfNumber = this.extractRFNumber(historic.name);
      
      // 2. Determinar el estado según las reglas de negocio
      const migrationData = this.determineMigrationData(rfNumber, historic);
      
      // 3. Verificar si ya existe en specific_exams
      const existingExam = await SpecificExam.findOne({
        where: { historic_id: historic.idExam }
      });
      
      if (existingExam) {
        console.log(`   ⚠️ ${historic.name} ya existe en specific_exams (ID: ${existingExam.id})`);
        return {
          success: true,
          rfName: historic.name,
          action: 'already_exists',
          specificExamId: existingExam.id
        };
      }
      
      // 4. Actualizar globally_available en questions
      await this.updateQuestionsAvailability(historic, migrationData.globallyAvailable);
      
      // 5. Crear registro en specific_exams
      const specificExam = await SpecificExam.create({
        exam_name: historic.name,
        exam_type: 'rf',
        historic_id: historic.idExam,
        status: migrationData.status,
        immediately_available: migrationData.globallyAvailable,
        total_questions: historic.amount,
        released_to_global: migrationData.globallyAvailable,
        auto_release: false,  // Los RF existentes no tienen auto-release
        created_at: historic.created_at || new Date()
      });
      
      console.log(`   ✅ ${historic.name} migrado exitosamente`);
      console.log(`      - globally_available: ${migrationData.globallyAvailable}`);
      console.log(`      - status: ${migrationData.status}`);
      console.log(`      - specific_exam ID: ${specificExam.id}`);
      
      return {
        success: true,
        rfName: historic.name,
        rfNumber: rfNumber,
        action: 'migrated',
        specificExamId: specificExam.id,
        globallyAvailable: migrationData.globallyAvailable,
        questionsUpdated: historic.amount
      };
      
    } catch (error) {
      console.error(`   ❌ Error migrando ${historic.name}:`, error);
      return {
        success: false,
        rfName: historic.name,
        error: error.message
      };
    }
  }

  /**
   * 🔢 EXTRAER NÚMERO DE RF DEL NOMBRE
   */
  extractRFNumber(name) {
    const match = name.match(/RF(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * 🎯 DETERMINAR DATOS DE MIGRACIÓN SEGÚN REGLAS DE NEGOCIO
   */
  determineMigrationData(rfNumber, historic) {
    // Según tu especificación:
    // - RF1-RF17: globally_available = TRUE (ya liberados)
    // - RF18: globally_available = FALSE (aún no liberado)
    
    if (rfNumber === null) {
      // Si no podemos extraer el número, asumir liberado
      console.log(`   ⚠️ No se pudo extraer número de ${historic.name}, asumiendo liberado`);
      return {
        globallyAvailable: true,
        status: 'released'
      };
    }
    
    if (rfNumber <= 17) {
      // RF1-RF17: Ya liberados
      return {
        globallyAvailable: true,
        status: 'released'
      };
    } else if (rfNumber === 18) {
      // RF18: Aún no liberado
      return {
        globallyAvailable: false,
        status: 'closed'  // Asumimos que ya pasó su ventana
      };
    } else {
      // RF19+: Deberían ser nuevos, pero si existen, tratarlos como no liberados
      return {
        globallyAvailable: false,
        status: 'draft'
      };
    }
  }

  /**
   * 🔄 ACTUALIZAR DISPONIBILIDAD DE PREGUNTAS
   */
  async updateQuestionsAvailability(historic, globallyAvailable) {
    try {
      // historic.questions es un array (getter del modelo)
      const questionIds = historic.questions;
      
      if (!questionIds || questionIds.length === 0) {
        console.log(`   ⚠️ No hay preguntas en ${historic.name}`);
        return 0;
      }
      
      // Actualizar globally_available
      const result = await Questions.update(
        { globally_available: globallyAvailable },
        {
          where: {
            id: {
              [Op.in]: questionIds
            }
          }
        }
      );
      
      console.log(`   📊 Actualizadas ${result[0]} preguntas (globally_available: ${globallyAvailable})`);
      return result[0];
      
    } catch (error) {
      console.error(`   ❌ Error actualizando preguntas de ${historic.name}:`, error);
      throw error;
    }
  }

  /**
   * 🔍 VERIFICAR ESTADO ACTUAL DE MIGRACIÓN
   */
  async verifyMigrationStatus() {
    try {
      console.log('🔍 Verificando estado actual de migración...\n');
      
      // 1. Contar RF en historics
      const rfHistorics = await this.findRFHistorics();
      
      // 2. Contar RF en specific_exams
      const rfSpecificExams = await SpecificExam.findAll({
        where: { exam_type: 'rf' },
        include: [{
          model: Historic,
          as: 'historic',
          required: false
        }]
      });
      
      // 3. Verificar preguntas por disponibilidad
      const questionStats = await Questions.findAll({
        attributes: [
          'globally_available',
          [Questions.sequelize.fn('COUNT', Questions.sequelize.col('id')), 'count']
        ],
        group: ['globally_available'],
        raw: true
      });
      
      console.log('📊 ESTADO ACTUAL:');
      console.log(`   RF en historics: ${rfHistorics.length}`);
      console.log(`   RF en specific_exams: ${rfSpecificExams.length}`);
      console.log('   Preguntas por disponibilidad:');
      
      questionStats.forEach(stat => {
        console.log(`     globally_available = ${stat.globally_available}: ${stat.count} preguntas`);
      });
      
      // 4. Mostrar detalles de RF migrados
      if (rfSpecificExams.length > 0) {
        console.log('\n📋 RF en specific_exams:');
        rfSpecificExams.forEach(exam => {
          console.log(`   ${exam.exam_name} - Status: ${exam.status} - Global: ${exam.released_to_global}`);
        });
      }
      
      return {
        rfInHistorics: rfHistorics.length,
        rfInSpecificExams: rfSpecificExams.length,
        questionStats,
        needsMigration: rfHistorics.length > rfSpecificExams.length
      };
      
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
      throw error;
    }
  }

  /**
   * 🧹 ROLLBACK DE MIGRACIÓN (para testing)
   */
  async rollbackMigration() {
    try {
      console.log('🔄 Iniciando rollback de migración...\n');
      
      // ⚠️ PELIGROSO: Solo para desarrollo/testing
      console.log('⚠️ ADVERTENCIA: Esta operación eliminará todos los registros de specific_exams de tipo RF');
      
      // Eliminar RF de specific_exams
      const deletedCount = await SpecificExam.destroy({
        where: { exam_type: 'rf' }
      });
      
      console.log(`✅ Eliminados ${deletedCount} registros de specific_exams`);
      
      // Opcionalmente, resetear globally_available de todas las preguntas
      // (Comentado por seguridad)
      /*
      await Questions.update(
        { globally_available: true },
        { where: {} }
      );
      console.log('✅ Reseteado globally_available de todas las preguntas');
      */
      
      console.log('✅ Rollback completado');
      
      return { success: true, deletedRecords: deletedCount };
      
    } catch (error) {
      console.error('❌ Error en rollback:', error);
      throw error;
    }
  }
}

// 🚀 EJECUTAR MIGRACIÓN SI SE LLAMA DIRECTAMENTE
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrationService = new RFMigrationService();
  
  try {
    // Verificar estado actual
    await migrationService.verifyMigrationStatus();
    
    console.log('\n' + '='.repeat(50));
    console.log('¿Proceder con la migración? (y/N):');
    
    // Para uso en script, ejecutar directamente
    // En producción, esto se haría a través de una ruta o comando
    const result = await migrationService.migrateExistingRFs();
    
    if (result.success) {
      console.log('\n🎉 Migración completada exitosamente!');
    } else {
      console.log('\n❌ Migración completada con errores');
    }
    
  } catch (error) {
    console.error('💥 Error fatal en migración:', error);
    process.exit(1);
  }
}

export default RFMigrationService;
