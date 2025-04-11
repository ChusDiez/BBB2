/* eslint-disable react/no-array-index-key */
import { useModalContext } from '../context/ModalContext';
import useQuestions from '../hooks/useQuestions';

export default function Admin() {
  const {
    questions,
    isLoading,
    deleteQuestion,
  } = useQuestions();
  const { openModal } = useModalContext();

  if (isLoading) {
    return (
      <p>Cargando</p>
    );
  }
  return (
    <div className="admin">
      <h1 className="fw-semibold fs-4 mb-4">Administrador</h1>
      <div className="p-4 mb-4 bg-white rounded">
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <p className="text-gray-light">Ver, añadir, editar y eliminar las preguntas</p>
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
      <div className="px-2">
        <table className="table table-hover align-middle mb-0 px-3">
          <thead>
            <tr>
              <th className="text-truncate">
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
                aria-label="download"
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
              >
                <td className="small">
                  {question.question}
                </td>
                <td className="text-nowrap text-center">
                  {question.block}
                </td>
                <td className="text-nowrap text-center">
                  {question.topic}
                </td>
                <td>
                  <div className="d-flex justify-content-end gap-3 mx-3">
                    <button
                      type="button"
                      className="btn squared"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await deleteQuestion(question.id);
                      }}
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
    </div>
  );
}
