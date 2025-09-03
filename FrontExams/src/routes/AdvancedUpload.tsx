import React, { useState, useEffect } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import 'filepond/dist/filepond.min.css';
import useUnifiedUpload from '../hooks/useUnifiedUpload';
import { UnifiedUploadFormData, UploadType } from '../types/unifiedUpload';
import ScheduledExamsTable from '../components/ScheduledExamsTable';

// Registrar plugins de FilePond
registerPlugin(FilePondPluginFileValidateType);

export default function AdvancedUpload() {
  const {
    isUploading,
    uploadResult,
    scheduledExams,
    isLoadingScheduled,
    error,
    uploadFile,
    loadScheduledExams,
    deleteScheduledExam,
    activateScheduledExam,
    clearResults,
  } = useUnifiedUpload();

  const [formData, setFormData] = useState<UnifiedUploadFormData>({
    uploadType: 'direct',
    file: null,
    
    // RF Exam
    rfExamName: '',
    rfStartDate: '',
    rfStartTime: '09:00',
    rfEndDate: '',
    rfEndTime: '18:00',
    rfUseAutoRelease: false,
    rfAutoReleaseDate: '',
    rfAutoReleaseTime: '23:59',
    
    // Future Questions
    futureReleaseDate: '',
    futureReleaseTime: '09:00',
    futureAutoRelease: true,
    
    // Custom Exam
    customExamName: '',
    customExamType: 'practice',
    customAvailabilityType: 'permanent',
    
    // General
    immediatelyAvailable: false,
  });

  // Cargar exámenes programados al montar
  useEffect(() => {
    loadScheduledExams();
  }, [loadScheduledExams]);

  // Obtener fecha mínima (hoy)
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field: keyof UnifiedUploadFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar archivo
  const handleFileChange = (fileItems: any[]) => {
    const file = fileItems.length > 0 ? fileItems[0].file : null;
    handleInputChange('file', file);
  };

  // Manejar submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await uploadFile(formData);
  };

  // Validar formulario
  const isFormValid = () => {
    if (!formData.file) return false;
    
    switch (formData.uploadType) {
      case 'direct':
        return true;
        
      case 'rf_exam':
        const hasBasicRfData = formData.rfExamName.trim() !== '' && formData.rfStartDate !== '';
        if (formData.rfUseAutoRelease) {
          return hasBasicRfData && formData.rfAutoReleaseDate !== '';
        } else {
          return hasBasicRfData && formData.rfEndDate !== '';
        }
               
      case 'future_questions':
        return formData.futureReleaseDate !== '';
        
      case 'custom_exam':
        return formData.customExamName.trim() !== '';
        
      default:
        return false;
    }
  };

  const renderUploadTypeSelector = () => (
    <div className="mb-4">
      <label className="form-label fw-semibold">Tipo de subida</label>
      <div className="row g-3">
        {[
          { 
            value: 'direct', 
            title: '📤 Subida Directa', 
            desc: 'Preguntas disponibles inmediatamente' 
          },
          { 
            value: 'rf_exam', 
            title: '📅 Examen RF', 
            desc: 'Disponible en ventana temporal específica' 
          },
          { 
            value: 'future_questions', 
            title: '🕒 Preguntas Futuras', 
            desc: 'Subir ahora, liberar después' 
          },
          { 
            value: 'custom_exam', 
            title: '🎯 Examen Personalizado', 
            desc: 'Test específico independiente' 
          },
        ].map(({ value, title, desc }) => (
          <div key={value} className="col-md-6 col-lg-3">
            <div 
              className={`card h-100 cursor-pointer ${formData.uploadType === value ? 'border-primary bg-primary bg-opacity-10' : ''}`}
              onClick={() => handleInputChange('uploadType', value as UploadType)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body text-center p-3">
                <h6 className="card-title small mb-2">{title}</h6>
                <p className="card-text small text-muted mb-0">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFileUpload = () => (
    <div className="mb-4">
      <label className="form-label fw-semibold">Archivo CSV</label>
      <FilePond
        files={formData.file ? [formData.file] : []}
        onupdatefiles={handleFileChange}
        allowMultiple={false}
        acceptedFileTypes={['text/csv', '.csv']}
        name="csvFile"
        labelIdle='<h5 class="fw-semibold">Arrastra tu archivo CSV aquí o <span class="filepond--label-action">búscalo</span></h5><p class="small text-muted mt-2">Solo archivos CSV permitidos</p>'
      />
    </div>
  );

  const renderRFExamFields = () => {
    if (formData.uploadType !== 'rf_exam') return null;
    
    return (
      <div className="mb-4">
        <h6 className="fw-semibold mb-3">⚙️ Configuración Examen RF</h6>
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Nombre del examen</label>
            <input
              type="text"
              className="form-control"
              value={formData.rfExamName}
              onChange={(e) => handleInputChange('rfExamName', e.target.value)}
              placeholder="Ej: RF19 - Weekly Simulation"
              required
            />
          </div>
          
          <div className="col-md-6">
            <label className="form-label">Fecha de inicio</label>
            <div className="row g-2">
              <div className="col-8">
                <input
                  type="date"
                  className="form-control"
                  value={formData.rfStartDate}
                  onChange={(e) => handleInputChange('rfStartDate', e.target.value)}
                  min={getTodayDate()}
                  required
                />
              </div>
              <div className="col-4">
                <input
                  type="time"
                  className="form-control"
                  value={formData.rfStartTime}
                  onChange={(e) => handleInputChange('rfStartTime', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Toggle entre fecha fin y auto-liberación */}
          <div className="col-12">
            <label className="form-label">Tipo de finalización</label>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="rfEndType"
                id="rfEndDate"
                checked={!formData.rfUseAutoRelease}
                onChange={() => handleInputChange('rfUseAutoRelease', false)}
              />
              <label className="form-check-label" htmlFor="rfEndDate">
                Fecha de fin específica
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="rfEndType"
                id="rfAutoRelease"
                checked={formData.rfUseAutoRelease}
                onChange={() => handleInputChange('rfUseAutoRelease', true)}
              />
              <label className="form-check-label" htmlFor="rfAutoRelease">
                Auto-liberación al pool global (sin fecha fin)
              </label>
            </div>
          </div>
          
          {!formData.rfUseAutoRelease && (
            <div className="col-md-6">
              <label className="form-label">Fecha de fin</label>
              <div className="row g-2">
                <div className="col-8">
                  <input
                    type="date"
                    className="form-control"
                    value={formData.rfEndDate}
                    onChange={(e) => handleInputChange('rfEndDate', e.target.value)}
                    min={formData.rfStartDate || getTodayDate()}
                    required
                  />
                </div>
                <div className="col-4">
                  <input
                    type="time"
                    className="form-control"
                    value={formData.rfEndTime}
                    onChange={(e) => handleInputChange('rfEndTime', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          
          {formData.rfUseAutoRelease && (
            <div className="col-md-6">
              <label className="form-label">Fecha de auto-liberación</label>
              <div className="row g-2">
                <div className="col-8">
                  <input
                    type="date"
                    className="form-control"
                    value={formData.rfAutoReleaseDate}
                    onChange={(e) => handleInputChange('rfAutoReleaseDate', e.target.value)}
                    min={formData.rfStartDate || getTodayDate()}
                    required
                  />
                </div>
                <div className="col-4">
                  <input
                    type="time"
                    className="form-control"
                    value={formData.rfAutoReleaseTime}
                    onChange={(e) => handleInputChange('rfAutoReleaseTime', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-text">
                El examen estará disponible desde el inicio hasta esta fecha, luego se liberará automáticamente al pool global
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFutureQuestionsFields = () => {
    if (formData.uploadType !== 'future_questions') return null;
    
    return (
      <div className="mb-4">
        <h6 className="fw-semibold mb-3">⚙️ Configuración Preguntas Futuras</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Fecha de liberación</label>
            <div className="row g-2">
              <div className="col-8">
                <input
                  type="date"
                  className="form-control"
                  value={formData.futureReleaseDate}
                  onChange={(e) => handleInputChange('futureReleaseDate', e.target.value)}
                  min={getTodayDate()}
                  required
                />
              </div>
              <div className="col-4">
                <input
                  type="time"
                  className="form-control"
                  value={formData.futureReleaseTime}
                  onChange={(e) => handleInputChange('futureReleaseTime', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="form-check mt-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="futureAutoRelease"
                checked={formData.futureAutoRelease}
                onChange={(e) => handleInputChange('futureAutoRelease', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="futureAutoRelease">
                Liberación automática
              </label>
              <div className="form-text">Se liberarán automáticamente en la fecha especificada</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomExamFields = () => {
    if (formData.uploadType !== 'custom_exam') return null;
    
    return (
      <div className="mb-4">
        <h6 className="fw-semibold mb-3">⚙️ Configuración Examen Personalizado</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Nombre del examen</label>
            <input
              type="text"
              className="form-control"
              value={formData.customExamName}
              onChange={(e) => handleInputChange('customExamName', e.target.value)}
              placeholder="Ej: Simulacro Final"
              required
            />
          </div>
          
          <div className="col-md-6">
            <label className="form-label">Tipo de examen</label>
            <select
              className="form-select"
              value={formData.customExamType}
              onChange={(e) => handleInputChange('customExamType', e.target.value)}
            >
              <option value="practice">Práctica</option>
              <option value="official">Oficial</option>
              <option value="mock">Simulacro</option>
              <option value="review">Repaso</option>
            </select>
          </div>
          
          <div className="col-12">
            <label className="form-label">Disponibilidad</label>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="customAvailability"
                id="permanent"
                checked={formData.customAvailabilityType === 'permanent'}
                onChange={() => handleInputChange('customAvailabilityType', 'permanent')}
              />
              <label className="form-check-label" htmlFor="permanent">
                Permanente (siempre disponible)
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="customAvailability"
                id="temporary"
                checked={formData.customAvailabilityType === 'temporary'}
                onChange={() => handleInputChange('customAvailabilityType', 'temporary')}
              />
              <label className="form-check-label" htmlFor="temporary">
                Temporal (programado)
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (error) {
      return (
        <div className="alert alert-danger" role="alert">
          <h6 className="alert-heading">❌ Error en la subida</h6>
          <p className="mb-0">{error}</p>
          <button className="btn btn-sm btn-outline-danger mt-2" onClick={clearResults}>
            Cerrar
          </button>
        </div>
      );
    }

    if (uploadResult) {
      return (
        <div className={`alert ${uploadResult.success ? 'alert-success' : 'alert-warning'}`} role="alert">
          <h6 className="alert-heading">
            {uploadResult.success ? '✅ Subida exitosa' : '⚠️ Subida con problemas'}
          </h6>
          <p>{uploadResult.message}</p>
          <ul className="mb-0">
            <li>Procesadas: {uploadResult.totalProcessed || 0}</li>
            <li>Insertadas: {uploadResult.totalInserted || 0}</li>
            <li>Duplicadas: {uploadResult.duplicates || 0}</li>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <li>Errores: {uploadResult.errors.length}</li>
            )}
          </ul>
          <button className="btn btn-sm btn-outline-success mt-2" onClick={clearResults}>
            Cerrar
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-semibold fs-4 mb-0">📤 Carga Avanzada de Preguntas</h1>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="bg-white rounded p-4 shadow-sm mb-4">
            <form onSubmit={handleSubmit}>
              {renderUploadTypeSelector()}
              {renderFileUpload()}
              {renderRFExamFields()}
              {renderFutureQuestionsFields()}
              {renderCustomExamFields()}
              
              {formData.uploadType !== 'direct' && (
                <div className="mb-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="immediatelyAvailable"
                      checked={formData.immediatelyAvailable}
                      onChange={(e) => handleInputChange('immediatelyAvailable', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="immediatelyAvailable">
                      Hacer disponible inmediatamente
                    </label>
                    <div className="form-text">
                      Las preguntas estarán disponibles para generación de exámenes desde ahora
                    </div>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-items-center"
                  disabled={!isFormValid() || isUploading}
                >
                  {isUploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-up me-2"></i>
                      Subir Preguntas
                    </>
                  )}
                </button>
              </div>
            </form>

            {renderResults()}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="bg-white rounded p-4 shadow-sm">
            <h5 className="fw-semibold mb-3">📅 Exámenes Programados</h5>
            <ScheduledExamsTable
              exams={scheduledExams}
              isLoading={isLoadingScheduled}
              onDelete={deleteScheduledExam}
              onActivate={activateScheduledExam}
              onRefresh={loadScheduledExams}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

