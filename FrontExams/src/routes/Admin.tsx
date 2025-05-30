// FrontExams/src/routes/Admin.tsx
/* eslint-disable react/no-array-index-key */
import { useModalContext } from '../context/ModalContext';
import useQuestions from '../hooks/useQuestions';
import useCategories from '../hooks/useCategories';

export default function Admin() {
  const {
    questions,
    isLoading,
    deleteQuestion,
    searchParams,
  } = useQuestions();
  const { categories } = useCategories();
  const { openModal } = useModalContext();

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
          <div>
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
                <th className="text-truncate" style={{ width: '60%' }}>
                  Pregunta
                </th>
                <th className="text-nowrap text-center">
                  Bloque
                </th>
                <th className="text-nowrap text-center">
                  Tema
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
                <tr
                  key={question.id}
                  onClick={() => openModal('addQuestion', { payload: { question } })}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="small text-truncate" style={{ maxWidth: '400px' }}>
                    {question.question}
                    {question.feedback && (
                      <i className="bi bi-chat-left-text-fill text-primary ms-2" title="Tiene feedback"></i>
                    )}
                  </td>
                  <td className="text-nowrap text-center">
                    <span className="badge bg-secondary">
                      Bloque {question.block}
                    </span>
                  </td>
                  <td className="text-nowrap text-center">
                    {question.topic}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}