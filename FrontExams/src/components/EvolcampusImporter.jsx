import React, { useState, useCallback } from 'react';
import { useEvolcampusImport } from '../hooks/useEvolcampusImport';
import '../styles/evolcampus-import.scss';

/**
 * Componente principal para importar CSV desde Evolcampus
 * Maneja todo el flujo: upload -> preview -> confirmación
 */
const EvolcampusImporter = () => {
  // Hook personalizado con toda la lógica
  const {
    activeStep,
    loading,
    file,
    topic,
    previewData,
    selectedQuestions,
    editingQuestion,
    error,
    success,
    importResult,
    handleFileSelect,
    handleFileDrop,
    handleTopicChange,
    handleQuestionToggle,
    handleSelectAll,
    handleDeselectAll,
    handleEditQuestion,
    handleSaveEdit,
    handleCancelEdit,
    generatePreview,
    confirmImport,
    handleReset,
    calculateBlock,
    getStatsSummary,
    clearMessages,
    enrichFeedbackWithAI,
    enrichmentLoading
  } = useEvolcampusImport();

  // Estados locales para UI
  const [showAllSelected, setShowAllSelected] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const steps = ['Subir archivo y especificar tema', 'Preview y edición', 'Confirmación'];

  // Manejar drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileDrop(droppedFile);
    }
  }, [handleFileDrop]);

  const handleFileInputChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // Renderizar paso 1: Upload y configuración
  const renderStep1 = () => (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <h5 className="mb-4">Paso 1: Subir archivo CSV y especificar tema</h5>
          
          <div 
            className="upload-zone mb-4 p-4 border border-2 border-dashed text-center"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
            style={{ cursor: 'pointer', borderColor: '#0d6efd', borderRadius: '8px' }}
          >
            <i className="bi bi-cloud-arrow-up display-1 text-primary mb-3"></i>
            <h6 className="mb-2">
              {file ? file.name : 'Arrastra tu archivo CSV aquí o haz clic para seleccionar'}
            </h6>
            <small className="text-muted">
              Formato esperado: Evolcampus CSV con respuestas marcadas con "x"
            </small>
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="topic-input" className="form-label">Tema (1-45)</label>
            <input
              id="topic-input"
              type="number"
              className="form-control"
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              min="1"
              max="45"
              placeholder="Especifica el tema"
            />
            <div className="form-text">
              {topic ? `Bloque calculado: ${calculateBlock(topic) || 'Inválido'}` : 'Especifica el tema para calcular el bloque automáticamente'}
            </div>
          </div>

          <div className="text-center">
            <button
              className="btn btn-primary btn-lg"
              onClick={generatePreview}
              disabled={!file || !topic || loading}
            >
              <i className="bi bi-eye me-2"></i>
              Generar Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar tabla de preview editable
  const renderPreviewTable = () => {
    if (!previewData) return null;

    const filteredQuestions = showAllSelected 
      ? previewData.questions 
      : previewData.questions.filter((_, index) => selectedQuestions.has(index));

    return (
      <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <table className="table table-hover">
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: '50px' }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selectedQuestions.size === previewData.questions.length}
                  onChange={() => {
                    if (selectedQuestions.size === previewData.questions.length) {
                      handleDeselectAll();
                    } else {
                      handleSelectAll();
                    }
                  }}
                />
              </th>
              <th style={{ width: '100px' }}>Estado</th>
              <th style={{ minWidth: '300px' }}>Pregunta</th>
              <th style={{ width: '150px' }}>Opción A</th>
              <th style={{ width: '150px' }}>Opción B</th>
              <th style={{ width: '150px' }}>Opción C</th>
              <th style={{ width: '80px' }}>Correcta</th>
              <th style={{ width: '200px' }}>Feedback</th>
              <th style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map((question, displayIndex) => {
              const actualIndex = showAllSelected 
                ? displayIndex 
                : previewData.questions.findIndex(q => q === question);
              const isEditing = editingQuestion === actualIndex;
              const isSelected = selectedQuestions.has(actualIndex);

              return (
                <QuestionRow
                  key={actualIndex}
                  question={question}
                  index={actualIndex}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  onToggle={handleQuestionToggle}
                  onEdit={handleEditQuestion}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Renderizar paso 2: Preview y edición
  const renderStep2 = () => {
    const stats = getStatsSummary();
    
    return (
      <div>
        <h5 className="mb-4">Paso 2: Preview y edición de preguntas</h5>

        {/* Estadísticas */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-primary mb-1">{stats?.total || 0}</h3>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-success mb-1">{stats?.newSelected || 0}</h3>
                <small className="text-muted">Nuevas</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-warning mb-1">{stats?.duplicatesSelected || 0}</h3>
                <small className="text-muted">Duplicadas</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-info mb-1">{stats?.selected || 0}</h3>
                <small className="text-muted">Seleccionadas</small>
              </div>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
          <button onClick={handleSelectAll} className="btn btn-outline-primary btn-sm">
            Seleccionar todas
          </button>
          <button onClick={handleDeselectAll} className="btn btn-outline-secondary btn-sm">
            Deseleccionar todas
          </button>
          
          {/* Separador visual */}
          <div className="vr mx-2"></div>
          
          {/* Botones de enriquecimiento con IA */}
          <button 
            onClick={() => enrichFeedbackWithAI('openai')} 
            className="btn btn-outline-success btn-sm"
            disabled={enrichmentLoading || selectedQuestions.size === 0}
            title="Enriquecer feedback con OpenAI"
          >
            <i className="bi bi-robot me-1"></i>
            {enrichmentLoading ? 'Enriqueciendo...' : 'IA OpenAI'}
          </button>
          
          <button 
            onClick={() => enrichFeedbackWithAI('anthropic')} 
            className="btn btn-outline-info btn-sm"
            disabled={enrichmentLoading || selectedQuestions.size === 0}
            title="Enriquecer feedback con Claude (Anthropic)"
          >
            <i className="bi bi-stars me-1"></i>
            {enrichmentLoading ? 'Enriqueciendo...' : 'IA Claude'}
          </button>
          
          <div className="form-check ms-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="showAllCheck"
              checked={showAllSelected}
              onChange={(e) => setShowAllSelected(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="showAllCheck">
              Mostrar todas
            </label>
          </div>
        </div>

        {/* Errores si los hay */}
        {previewData.errors && previewData.errors.length > 0 && (
          <div className="alert alert-warning">
            <h6 className="alert-heading">Se encontraron errores en algunas filas:</h6>
            <ul className="mb-0">
              {previewData.errors.slice(0, 5).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            {previewData.hasMoreErrors && (
              <small className="d-block mt-2">
                Y {previewData.errors.length - 5} errores más...
              </small>
            )}
          </div>
        )}

        {/* Tabla de preview */}
        {renderPreviewTable()}

        {/* Botones de acción */}
        <div className="d-flex justify-content-between mt-4">
          <button onClick={handleReset} className="btn btn-outline-secondary">
            Volver al inicio
          </button>
          <button
            onClick={() => setConfirmDialog(true)}
            className="btn btn-success"
            disabled={selectedQuestions.size === 0}
          >
            <i className="bi bi-check-circle me-2"></i>
            Confirmar importación ({selectedQuestions.size} preguntas)
          </button>
        </div>
      </div>
    );
  };

  // Renderizar paso 3: Confirmación y resultados
  const renderStep3 = () => (
    <div className="text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <i className="bi bi-check-circle display-1 text-success mb-3"></i>
      <h4 className="mb-3">¡Importación completada exitosamente!</h4>
      
      {importResult && (
        <div className="row g-3 mt-3 mb-4">
          <div className="col-6">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-success mb-1">
                  {importResult.summary.newQuestions}
                </h3>
                <small className="text-muted">Preguntas nuevas</small>
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="text-warning mb-1">
                  {importResult.summary.updatedQuestions}
                </h3>
                <small className="text-muted">Preguntas actualizadas</small>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleReset}
        className="btn btn-primary btn-lg mt-3"
      >
        Realizar otra importación
      </button>
    </div>
  );

  return (
    <div className="evolcampus-importer p-4">
      <div className="card">
        <div className="card-body">
          {/* Header */}
          <div className="mb-4">
            <h2 className="card-title">Importar CSV desde Evolcampus</h2>
            <p className="text-muted">
              Importa preguntas de examen desde archivos CSV de Evolcampus con detección automática de respuestas
            </p>
          </div>

          {/* Stepper */}
          <div className="mb-4">
            <div className="d-flex justify-content-between">
              {steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`d-flex align-items-center ${index < steps.length - 1 ? 'flex-fill' : ''}`}
                >
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center ${
                      index <= activeStep ? 'bg-primary text-white' : 'bg-light text-muted'
                    }`}
                    style={{ width: '32px', height: '32px', fontSize: '14px' }}
                  >
                    {index + 1}
                  </div>
                  <span className={`ms-2 ${index <= activeStep ? 'text-primary fw-semibold' : 'text-muted'}`}>
                    {step}
                  </span>
                  {index < steps.length - 1 && (
                    <div 
                      className={`flex-fill mx-3 ${index < activeStep ? 'bg-primary' : 'bg-light'}`}
                      style={{ height: '2px' }}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {loading && (
            <div className="progress mb-3" style={{ height: '3px' }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }}></div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="alert alert-danger alert-dismissible">
              {error}
              <button type="button" className="btn-close" onClick={clearMessages}></button>
            </div>
          )}
          {success && (
            <div className="alert alert-success alert-dismissible">
              {success}
              <button type="button" className="btn-close" onClick={clearMessages}></button>
            </div>
          )}

          {/* Steps content */}
          {activeStep === 0 && renderStep1()}
          {activeStep === 1 && renderStep2()}
          {activeStep === 2 && renderStep3()}

          {/* Confirmation Modal */}
          {confirmDialog && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Confirmar importación</h5>
                    <button type="button" className="btn-close" onClick={() => setConfirmDialog(false)}></button>
                  </div>
                  <div className="modal-body">
                    <p>¿Estás seguro de que quieres importar {selectedQuestions.size} preguntas?</p>
                    <div className="mt-3">
                      <small className="text-muted d-block">
                        • {previewData?.questions.filter((_, i) => selectedQuestions.has(i) && !previewData.questions[i].isDuplicate).length || 0} preguntas nuevas se crearán
                      </small>
                      <small className="text-muted d-block">
                        • {previewData?.questions.filter((_, i) => selectedQuestions.has(i) && previewData.questions[i].isDuplicate).length || 0} preguntas duplicadas se actualizarán
                      </small>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirmDialog(false)}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primary" onClick={confirmImport} disabled={loading}>
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente para renderizar cada fila de pregunta
const QuestionRow = React.memo(({ question, index, isSelected, isEditing, onToggle, onEdit, onSave, onCancel }) => {
  const [editData, setEditData] = useState({});

  const handleEditChange = useCallback((field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(index, editData);
    setEditData({});
  }, [index, editData, onSave]);

  const handleCancel = useCallback(() => {
    setEditData({});
    onCancel();
  }, [onCancel]);

  if (isEditing) {
    return (
      <tr className="table-active">
        <td>
          <input
            type="checkbox"
            className="form-check-input"
            checked={isSelected}
            onChange={() => onToggle(index)}
          />
        </td>
        <td>
          <span className={`badge ${question.isDuplicate ? 'bg-warning' : 'bg-success'}`}>
            {question.isDuplicate ? 'Actualizar' : 'Nueva'}
          </span>
        </td>
        <td>
          <textarea
            className="form-control form-control-sm"
            rows="2"
            defaultValue={question.question}
            onChange={(e) => handleEditChange('question', e.target.value)}
          />
        </td>
        <td>
          <input
            type="text"
            className="form-control form-control-sm"
            defaultValue={question.optionA}
            onChange={(e) => handleEditChange('optionA', e.target.value)}
          />
        </td>
        <td>
          <input
            type="text"
            className="form-control form-control-sm"
            defaultValue={question.optionB}
            onChange={(e) => handleEditChange('optionB', e.target.value)}
          />
        </td>
        <td>
          <input
            type="text"
            className="form-control form-control-sm"
            defaultValue={question.optionC}
            onChange={(e) => handleEditChange('optionC', e.target.value)}
          />
        </td>
        <td>
          <select
            className="form-select form-select-sm"
            defaultValue={question.correctAnswer}
            onChange={(e) => handleEditChange('correctAnswer', e.target.value)}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </td>
        <td>
          <textarea
            className="form-control form-control-sm"
            rows="2"
            defaultValue={question.feedback || ''}
            onChange={(e) => handleEditChange('feedback', e.target.value)}
            placeholder="Feedback/Explicación"
          />
        </td>
        <td>
          <div className="d-flex gap-1">
            <button onClick={handleSave} className="btn btn-success btn-sm" title="Guardar">
              <i className="bi bi-check"></i>
            </button>
            <button onClick={handleCancel} className="btn btn-secondary btn-sm" title="Cancelar">
              <i className="bi bi-x"></i>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={question.isDuplicate ? 'table-warning' : ''}>
      <td>
        <input
          type="checkbox"
          className="form-check-input"
          checked={isSelected}
          onChange={() => onToggle(index)}
        />
      </td>
      <td>
        <span className={`badge ${question.isDuplicate ? 'bg-warning' : 'bg-success'}`}>
          {question.isDuplicate ? 'Duplicada' : 'Nueva'}
        </span>
      </td>
      <td className="text-truncate" style={{ maxWidth: '300px' }} title={question.question}>
        {question.question.length > 100 
          ? `${question.question.substring(0, 100)}...`
          : question.question
        }
      </td>
      <td className="text-truncate" style={{ maxWidth: '150px' }} title={question.optionA}>
        {question.optionA}
      </td>
      <td className="text-truncate" style={{ maxWidth: '150px' }} title={question.optionB}>
        {question.optionB}
      </td>
      <td className="text-truncate" style={{ maxWidth: '150px' }} title={question.optionC}>
        {question.optionC}
      </td>
      <td>
        <span className="badge bg-primary">{question.correctAnswer}</span>
      </td>
      <td className="text-truncate" style={{ maxWidth: '200px' }} title={question.feedback || 'Sin feedback'}>
        {question.feedback ? (
          <div className="d-flex align-items-center gap-1">
            <span className="text-muted small">
              {question.feedback.length > 50 
                ? `${question.feedback.substring(0, 50)}...`
                : question.feedback
              }
            </span>
            {question.enriched && (
              <i className="bi bi-stars text-success" title="Enriquecido con IA"></i>
            )}
          </div>
        ) : (
          <span className="text-muted fst-italic">Sin feedback</span>
        )}
      </td>
      <td>
        <button
          onClick={() => onEdit(index)}
          className="btn btn-outline-primary btn-sm"
          title="Editar pregunta"
        >
          <i className="bi bi-pencil"></i>
        </button>
      </td>
    </tr>
  );
});

export default EvolcampusImporter;