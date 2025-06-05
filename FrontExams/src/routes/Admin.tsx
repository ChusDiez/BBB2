// FrontExams/src/routes/Admin.tsx
/* eslint-disable react/no-array-index-key */
import { useState, useCallback, useEffect, Fragment } from 'react';
import DOMPurify from 'dompurify';
import { useModalContext } from '../context/ModalContext';
import useQuestions from '../hooks/useQuestions';
import useCategories from '../hooks/useCategories';
import EnrichmentAPI from '../apis/EnrichmentAPI';
import { Question } from '../store/slice';

export default function Admin() {
  const {
    questions,
    isLoading,
    deleteQuestion,
    searchParams,
  } = useQuestions();
  const { categories } = useCategories();
  const { openModal } = useModalContext();
  
  // Estados para selección múltiple y enriquecimiento
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentProvider, setEnrichmentProvider] = useState<'openai' | 'anthropic'>('openai');
  const [availableProviders, setAvailableProviders] = useState<any>({});
  const [showPreviewFor, setShowPreviewFor] = useState<number | null>(null);
  
  // NUEVO: Estados para filtros locales simples
  const [showOnlyWithoutHtml, setShowOnlyWithoutHtml] = useState(false);
  const [showOnlyWithFeedback, setShowOnlyWithFeedback] = useState(false);

  // Cargar proveedores disponibles solo una vez
  useEffect(() => {
    EnrichmentAPI.getProviders()
      .then(({ data }) => setAvailableProviders(data))
      .catch(console.error);
  }, []);

  // Toggle selección de pregunta individual
  const toggleQuestionSelection = useCallback((questionId: number) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  // NUEVO: Función mejorada para seleccionar preguntas sin HTML
  const selectQuestionsWithoutHtml = useCallback(() => {
    const withoutHtml = questions
      .filter(q => q.feedback && !q.feedback.includes('<'))
      .map(q => q.id);
    setSelectedQuestions(new Set(withoutHtml));
  }, [questions]);

  // Función para deseleccionar todas
  const deselectAll = useCallback(() => {
    setSelectedQuestions(new Set());
  }, []);

  // Enriquecer preguntas seleccionadas
  const enrichSelectedQuestions = async () => {
    if (selectedQuestions.size === 0) {
      alert('Por favor selecciona al menos una pregunta');
      return;
    }

    const questionsWithFeedback = questions
      .filter(q => selectedQuestions.has(q.id) && q.feedback)
      .map(q => q.id);

    if (questionsWithFeedback.length === 0) {
      alert('Ninguna de las preguntas seleccionadas tiene feedback para enriquecer');
      return;
    }

    if (!window.confirm(
      `¿Estás seguro de que quieres enriquecer ${questionsWithFeedback.length} pregunta(s) con ${enrichmentProvider.toUpperCase()}?\n\nEsto sobrescribirá el feedback actual con la versión enriquecida con HTML.`
    )) {
      return;
    }

    setIsEnriching(true);
    try {
      const { data } = await EnrichmentAPI.enrichBatch({
        questionIds: Array.from(questionsWithFeedback),
        provider: enrichmentProvider
      });

      if (data.success) {
        alert(`✅ Se enriquecieron exitosamente ${data.successfullyEnriched} de ${data.totalProcessed} preguntas`);
        window.location.reload();
        setSelectedQuestions(new Set());
      }
    } catch (error) {
      console.error('Error al enriquecer preguntas:', error);
      alert('❌ Error al enriquecer las preguntas. Por favor, intenta de nuevo.');
    } finally {
      setIsEnriching(false);
    }
  };

  // NUEVO: Aplicar filtros locales a las preguntas
  const filteredQuestions = questions.filter(q => {
    if (showOnlyWithoutHtml && q.feedback && q.feedback.includes('<')) {
      return false;
    }
    if (showOnlyWithFeedback && !q.feedback) {
      return false;
    }
    return true;
  });

  // NUEVO: Calcular estadísticas
  const stats = {
    total: questions.length,
    withHtml: questions.filter(q => q.feedback && q.feedback.includes('<')).length,
    withoutHtml: questions.filter(q => q.feedback && !q.feedback.includes('<')).length,
    withoutFeedback: questions.filter(q => !q.feedback).length
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <h1 className="fw-semibold fs-4 mb-4">Administrador</h1>
      
      {/* Panel de información y controles principales */}
      <div className="p-4 mb-4 bg-white rounded">
        <div className="d-flex align-items-center justify-content-between">
          <div className="flex-grow-1">
            <p className="text-gray-light mb-2">
              Ver, añadir, editar y eliminar las preguntas
            </p>
            
            {/* NUEVO: Estadísticas de formato */}
            {questions.length > 0 && (
              <div className="d-flex gap-4 small text-muted">
                <span>
                  <i className="bi bi-database me-1"></i>
                  Total: <strong>{stats.total}</strong>
                </span>
                <span>
                  <i className="bi bi-check-circle-fill text-success me-1"></i>
                  Con HTML: <strong>{stats.withHtml}</strong>
                </span>
                <span>
                  <i className="bi bi-exclamation-circle-fill text-warning me-1"></i>
                  Sin formato: <strong>{stats.withoutHtml}</strong>
                </span>
                <span>
                  <i className="bi bi-dash-circle text-muted me-1"></i>
                  Sin feedback: <strong>{stats.withoutFeedback}</strong>
                </span>
              </div>
            )}
          </div>
          
          <div className="d-flex gap-2 align-items-center">
            {/* Mostrar info de selección cuando hay seleccionadas */}
            {selectedQuestions.size > 0 && (
              <div className="text-primary small">
                <strong>{selectedQuestions.size}</strong> seleccionadas
              </div>
            )}
            
            {/* Controles de enriquecimiento con IA */}
            {selectedQuestions.size > 0 && availableProviders.hasAny && (
              <div className="d-flex align-items-center gap-2 me-3">
                <select 
                  className="form-select form-select-sm"
                  value={enrichmentProvider}
                  onChange={(e) => setEnrichmentProvider(e.target.value as 'openai' | 'anthropic')}
                  disabled={isEnriching}
                >
                  {availableProviders.openai && <option value="openai">OpenAI</option>}
                  {availableProviders.anthropic && <option value="anthropic">Anthropic</option>}
                </select>
                <button
                  className="btn btn-sm btn-warning"
                  onClick={enrichSelectedQuestions}
                  disabled={isEnriching}
                  title="Enriquecer feedback con HTML usando IA"
                >
                  {isEnriching ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-stars me-1"></i>
                      Enriquecer con IA
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* Botón de añadir pregunta */}
            <button
              className="btn btn-action"
              type="button"
              onClick={() => openModal('addQuestion')}
            >
              <i className="bi bi-plus" />
              Añadir pregunta
            </button>
          </div>
        </div>
      </div>
      
      {/* NUEVO: Filtros locales simples */}
      <div className="mb-3 d-flex gap-3 bg-light p-3 rounded">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="showOnlyWithoutHtml"
            checked={showOnlyWithoutHtml}
            onChange={(e) => setShowOnlyWithoutHtml(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showOnlyWithoutHtml">
            Mostrar solo sin formato HTML
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="showOnlyWithFeedback"
            checked={showOnlyWithFeedback}
            onChange={(e) => setShowOnlyWithFeedback(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showOnlyWithFeedback">
            Mostrar solo con feedback
          </label>
        </div>
        {/* Mostrar cuántas se están mostrando si hay filtros activos */}
        {(showOnlyWithoutHtml || showOnlyWithFeedback) && (
          <span className="ms-auto text-muted small">
            Mostrando {filteredQuestions.length} de {questions.length} preguntas
          </span>
        )}
      </div>
      
      {filteredQuestions.length === 0 ? (
        <div className="text-center p-5">
          <i className="bi bi-search fs-1 text-muted"></i>
          <p className="text-muted mt-3">
            {(showOnlyWithoutHtml || showOnlyWithFeedback) 
              ? 'No hay preguntas que coincidan con los filtros seleccionados' 
              : 'No hay preguntas registradas'}
          </p>
        </div>
      ) : (
        <div className="px-2">
          <table className="table table-hover align-middle mb-0 px-3">
            <thead>
              <tr>
                {/* NUEVO: Encabezado mejorado con botones de selección */}
                <th style={{ width: '140px' }}>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={selectQuestionsWithoutHtml}
                      title="Seleccionar todas las preguntas sin formato HTML"
                    >
                      <i className="bi bi-check-square me-1"></i>
                      Sin HTML
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={deselectAll}
                      title="Deseleccionar todas"
                    >
                      <i className="bi bi-square"></i>
                    </button>
                  </div>
                </th>
                <th className="text-truncate" style={{ width: '50%' }}>
                  Pregunta
                </th>
                <th className="text-nowrap text-center">
                  Bloque
                </th>
                <th className="text-nowrap text-center">
                  Tema
                </th>
                <th className="text-center">
                  Feedback
                </th>
                <th
                  className="col-1 text-center"
                  aria-label="opciones"
                >
                  Opciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <Fragment key={question.id}>
                  <tr
                    className={selectedQuestions.has(question.id) ? 'table-active' : ''}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedQuestions.has(question.id)}
                        onChange={() => toggleQuestionSelection(question.id)}
                      />
                    </td>
                    <td 
                      className="small text-truncate pointer" 
                      style={{ maxWidth: '400px' }}
                      onClick={() => openModal('addQuestion', { payload: { question } })}
                    >
                      {question.question}
                    </td>
                    <td className="text-nowrap text-center">
                      <span className="badge bg-secondary">
                        Bloque {question.block}
                      </span>
                    </td>
                    <td className="text-nowrap text-center">
                      {question.topic}
                    </td>
                    {/* NUEVO: Columna de feedback mejorada con indicadores visuales */}
                    <td className="text-center">
                      {question.feedback ? (
                        <div className="d-flex justify-content-center align-items-center gap-1">
                          {/* Indicador más claro del estado del feedback */}
                          {question.feedback.includes('<') ? (
                            <span 
                              className="badge bg-success" 
                              title="Feedback con formato HTML enriquecido"
                            >
                              <i className="bi bi-check-circle-fill me-1"></i>
                              HTML
                            </span>
                          ) : (
                            <span 
                              className="badge bg-warning text-dark" 
                              title="Feedback sin formato - Necesita enriquecimiento"
                            >
                              <i className="bi bi-exclamation-circle-fill me-1"></i>
                              Texto
                            </span>
                          )}
                          {/* Botón de preview */}
                          <button
                            className="btn btn-sm btn-link p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPreviewFor(showPreviewFor === question.id ? null : question.id);
                            }}
                            title="Ver vista previa"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">
                          <i className="bi bi-dash"></i> Sin feedback
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal('addQuestion', { payload: { question } });
                          }}
                          title="Editar pregunta"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
                              await deleteQuestion(question.id);
                            }
                          }}
                          title="Eliminar pregunta"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Fila de vista previa del feedback */}
                  {showPreviewFor === question.id && question.feedback && (
                    <tr key={`preview-${question.id}`}>
                      <td colSpan={6} className="p-0">
                        <div className="bg-light p-3 m-2 rounded">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="mb-0">Vista previa del feedback:</h6>
                            <button
                              className="btn btn-sm btn-close"
                              onClick={() => setShowPreviewFor(null)}
                              aria-label="Cerrar vista previa"
                            />
                          </div>
                          <div 
                            className="feedback-preview border bg-white p-3 rounded"
                            dangerouslySetInnerHTML={{
                              __html: /<[^>]+>/.test(question.feedback || '')
                                ? DOMPurify.sanitize(question.feedback || '')
                                : DOMPurify.sanitize((question.feedback || '').replace(/\n/g, '<br />'))
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}