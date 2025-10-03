// FrontExams/src/routes/Admin.tsx
/* eslint-disable react/no-array-index-key */
import { useState, useCallback, useEffect } from 'react';
import { useModalContext } from '../context/ModalContext';
import useQuestions from '../hooks/useQuestions';
import useCategories from '../hooks/useCategories';
import EnrichmentAPI from '../apis/EnrichmentAPI';
import { Question } from '../store/slice';
import VirtualizedQuestionTable from '../components/VirtualizedQuestionTable';
import SearchBar from '../components/SearchBar/SearchBar';

export default function Admin() {
  const {
    questions,
    isLoading,
    isLoadingMore,
    hasNextPage,
    totalQuestions,
    isSearchMode,
    deleteQuestion,
    searchParams,
    loadMoreQuestions,
    callback,
  } = useQuestions();
  const { categories } = useCategories();
  const { openModal } = useModalContext();
  
  // Estados para selección múltiple y enriquecimiento
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentProvider, setEnrichmentProvider] = useState<'openai' | 'anthropic'>('anthropic');
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

  // Función para editar pregunta
  const handleEditQuestion = useCallback((question: Question) => {
    openModal('addQuestion', { payload: { question } });
  }, [openModal]);

  // Función para mostrar preview
  const handleShowPreview = useCallback((questionId: number) => {
    setShowPreviewFor(showPreviewFor === questionId ? null : questionId);
  }, [showPreviewFor]);

  // NUEVO: Calcular estadísticas
  const stats = {
    total: totalQuestions || questions.length,
    loaded: questions.length,
    withHtml: questions.filter(q => q.feedback && q.feedback.includes('<')).length,
    withoutHtml: questions.filter(q => q.feedback && !q.feedback.includes('<')).length,
    withoutFeedback: questions.filter(q => !q.feedback).length
  };

  // Manejar búsqueda
  const handleSearch = useCallback(async (params: Record<string, string>) => {
    await callback(params);
  }, [callback]);

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
                  {isSearchMode ? (
                    <>Resultados: <strong>{stats.total}</strong></>
                  ) : (
                    <>
                      Total: <strong>{stats.total}</strong> 
                      {stats.loaded !== stats.total && (
                        <span className="text-primary"> (cargadas: {stats.loaded})</span>
                      )}
                    </>
                  )}
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
                {isSearchMode && (
                  <span className="text-primary">
                    <i className="bi bi-search me-1"></i>
                    <strong>Modo búsqueda activo</strong>
                  </span>
                )}
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
      
      {/* NUEVA: Barra de búsqueda avanzada */}
      <SearchBar onSearch={handleSearch} />
      
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
        <div>
          {/* Controles de selección rápida */}
          <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-white rounded border">
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={selectQuestionsWithoutHtml}
                title="Seleccionar todas las preguntas sin formato HTML"
              >
                <i className="bi bi-check-square me-1"></i>
                Seleccionar sin HTML
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={deselectAll}
                title="Deseleccionar todas"
              >
                <i className="bi bi-square me-1"></i>
                Deseleccionar todo
              </button>
            </div>
            
            {hasNextPage && !isSearchMode && (
              <div className="text-muted small">
                <i className="bi bi-info-circle me-1"></i>
                Scroll hacia abajo para cargar más preguntas automáticamente
              </div>
            )}
            
            {isSearchMode && (
              <div className="text-primary small">
                <i className="bi bi-search me-1"></i>
                Mostrando todos los resultados de búsqueda (virtualizados)
              </div>
            )}
          </div>
          
          <VirtualizedQuestionTable
            questions={filteredQuestions}
            selectedQuestions={selectedQuestions}
            onToggleSelection={toggleQuestionSelection}
            onDeleteQuestion={deleteQuestion}
            onEditQuestion={handleEditQuestion}
            onShowPreview={handleShowPreview}
            showPreviewFor={showPreviewFor}
            categories={categories}
            isLoading={isLoadingMore}
            hasNextPage={hasNextPage}
            loadNextPage={loadMoreQuestions}
          />
        </div>
      )}
    </div>
  );
}