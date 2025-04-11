/* eslint-disable jsx-a11y/label-has-associated-control */
import { ModalProps } from '../context/ModalContext';
import useAdmin from '../hooks/useAdmin';
import { Question } from '../store/slice';

export default function QuestionModal({ closeModal, payload }: ModalProps) {
  const {
    isValidQuestion,
    newQuestion,
    setProperty,
    addQuestion,
  } = useAdmin(payload.question as Question);

  return (
    <div
      className="modal fade show d-block"
      id="addQuestionModal"
      aria-labelledby="addQuestion"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-4 add-question fs-7">
          <div className="d-flex align-items-center">
            <h5 className="flex-grow-1">Ingrese los siguientes datos</h5>
            <button
              type="button"
              className="border-0 bg-white"
              onClick={() => closeModal()}
            >
              <i className="bi bi-x fs-4" />
            </button>
          </div>
          <div className="mt-4">
            <div className="mb-3">
              <label
                htmlFor="question"
                className="form-label mb-0"
              >
                Pregunta
              </label>
              <input
                id="question"
                type="text"
                name="question"
                autoComplete="off"
                className="form-control"
                value={newQuestion?.question}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
              />
            </div>
            <label className="form-label mb-0">
              Opcion A
            </label>
            <div className="input-group mb-3">
              <div className="input-group-text">
                <input
                  value="A"
                  type="radio"
                  name="correctAnswer"
                  className="form-check-input mt-0"
                  aria-label="Select correct option A"
                  checked={newQuestion.correctAnswer === 'A'}
                  onChange={(({ target: { name, value } }) => setProperty(name, value))}
                />
              </div>
              <input
                autoComplete="off"
                type="text"
                name="optionA"
                className="form-control"
                aria-label="Text input option A"
                value={newQuestion?.optionA}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
              />
            </div>
            <label className="form-label mb-0">
              Opcion B
            </label>
            <div className="input-group mb-3">
              <div className="input-group-text">
                <input
                  value="B"
                  type="radio"
                  name="correctAnswer"
                  className="form-check-input mt-0"
                  aria-label="Select correct option B"
                  checked={newQuestion.correctAnswer === 'B'}
                  onChange={(({ target: { name, value } }) => setProperty(name, value))}
                />
              </div>
              <input
                autoComplete="off"
                type="text"
                name="optionB"
                className="form-control"
                aria-label="Text input option B"
                value={newQuestion?.optionB}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
              />
            </div>
            <label className="form-label mb-0">
              Opcion C
            </label>
            <div className="input-group mb-3">
              <div className="input-group-text">
                <input
                  value="C"
                  type="radio"
                  name="correctAnswer"
                  className="form-check-input mt-0"
                  aria-label="Select correct option C"
                  checked={newQuestion.correctAnswer === 'C'}
                  onChange={(({ target: { name, value } }) => setProperty(name, value))}
                />
              </div>
              <input
                autoComplete="off"
                type="text"
                name="optionC"
                className="form-control"
                aria-label="Text input option C"
                value={newQuestion?.optionC}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
              />
            </div>
            <div className="d-flex gap-4 my-4">
              <div className="flex-fill">
                <div className="form-floating">
                  <input
                    min="1"
                    max="3"
                    id="block"
                    name="block"
                    type="number"
                    autoComplete="off"
                    className="form-control"
                    placeholder="Bloque"
                    value={newQuestion?.block}
                    onChange={(({ target: { name, value } }) => setProperty(name, value))}
                  />
                  <label htmlFor="floatingInput">Bloque</label>
                </div>
              </div>
              <div className="flex-fill">
                <div className="form-floating">
                  <input
                    min="1"
                    max="44"
                    id="topic"
                    name="topic"
                    type="number"
                    autoComplete="off"
                    className="form-control"
                    placeholder="Tema"
                    value={newQuestion?.topic}
                    onChange={(({ target: { name, value } }) => setProperty(name, value))}
                  />
                  <label htmlFor="floatingInput">Tema</label>
                </div>
              </div>
            </div>
            <div className="form-floating mb-4">
              <textarea
                id="feedback"
                className="form-control"
                name="feedback"
                style={{ height: `${100}px` }}
                value={newQuestion?.feedback}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
              />
              <label htmlFor="feedback">Feedback</label>
            </div>
            <div className="d-flex justify-content-end gap-3">
              <button
                type="submit"
                disabled={!isValidQuestion}
                className="btn btn-action"
                onClick={addQuestion}
              >
                {newQuestion.block === 0
                  ? 'Añadir pregunta'
                  : 'Modificar pregunta'}
              </button>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => closeModal()}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
