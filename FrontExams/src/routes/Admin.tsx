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

  // Cargar proveedores disponibles solo una vez
  useEffect(() => {
    EnrichmentAPI.getProviders()
      .then(({ data }) => setAvailableProviders(data))
      .catch(console.error);
  }, []);

  // Toggle selección de pregunta
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

  // Seleccionar/deseleccionar todas
  const toggleSelectAll = useCallback(() => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)));
    }
  }, [questions, selectedQuestions.size]);

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
        // ⚠️ Parche rápido: recargar la página para refrescar los nuevos feedbacks
        window.location.reload();
        setSelectedQuestions(new Set());
        // Las preguntas se actualizarán automáticamente desde el store
      }
    } catch (error) {
      console.error('Error al enriquecer preguntas:', error);
      alert('❌ Error al enriquecer las preguntas. Por favor, intenta de nuevo.');
    } finally {
      setIsEnriching(false);
    }
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

  // Determinar si hay búsqueda activa
  const hasActiveSearch = searchParams && (
    searchParams.query || 
    searchParams.block || 
    searchParams.topic
  );

  // Obtener información de los filtros activos
  const getActiveFilters = () => {
    const filters = [];
    if (searchParams?.query) {
      filters.push(`Texto: "${searchParams.query}"`);
    }
    if (searchParams?.block) {
      filters.push(`Bloque: ${searchParams.block}`);
    }
    if (searchParams?.topic) {
      const topicName = categories.find(c => c.topic.toString() === searchParams.topic)?.name;
      filters.push(`Tema: ${searchParams.topic}${topicName ? ` - ${topicName}` : ''}`);
    }
    return filters;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="admin">
      <h1 className="fw-semibold fs-4 mb-4">Administrador</h1>
      <div className="p-4 mb-4 bg-white rounded">
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <p className="text-gray-light mb-0">
              Ver, añadir, editar y eliminar las preguntas
            </p>
            {hasActiveSearch && (
              <div className="mt-2">
                <p className="text-primary small mb-1">
                  <i className="bi bi-funnel-fill me-2"></i>
                  Mostrando {questions.length} pregunta{questions.length !== 1 ? 's' : ''} filtradas
                </p>
                {activeFilters.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {activeFilters.map((filter, index) => (
                      <span key={index} className="badge bg-light text-dark border">
                        {filter}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="d-flex gap-2">
            {/* Controles de enriquecimiento con IA */}
            {selectedQuestions.size > 0 && availableProviders.hasAny && (
              <div className="d-flex align-items-center gap-2 me-3">
                <span className="badge bg-info">
                  {selectedQuestions.size} seleccionada{selectedQuestions.size !== 1 ? 's' : ''}
                </span>
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
      
      {questions.length === 0 ? (
        <div className="text-center p-5">
          <i className="bi bi-search fs-1 text-muted"></i>
          <p className="text-muted mt-3">
            {hasActiveSearch 
              ? 'No se encontraron preguntas con los criterios de búsqueda especificados' 
              : 'No hay preguntas registradas'}
          </p>
          {hasActiveSearch && (
            <p className="text-muted small">
              Intenta modificar los filtros de búsqueda
            </p>
          )}
        </div>
      ) : (
        <div className="px-2">
          <table className="table table-hover align-middle mb-0 px-3">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedQuestions.size === questions.length && questions.length > 0}
                    onChange={toggleSelectAll}
                    title="Seleccionar todas"
                  />
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
              {questions.map((question) => (
                <Fragment key={question.id}>
                  <tr
                    key={question.id}
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
                    <td className="text-center">
                      {question.feedback ? (
                        <button
                          className="btn btn-sm btn-link p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPreviewFor(showPreviewFor === question.id ? null : question.id);
                          }}
                          title="Ver vista previa del feedback"
                        >
                          <i className="bi bi-chat-left-text-fill text-primary fs-5"></i>
                        </button>
                      ) : (
                        <i className="bi bi-dash text-muted"></i>
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