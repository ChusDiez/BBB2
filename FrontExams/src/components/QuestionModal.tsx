// FrontExams/src/components/QuestionModal.tsx
/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState } from 'react';
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
  
  const [showFeedbackPreview, setShowFeedbackPreview] = useState(false);

  // Función para limpiar texto al pegar
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    
    // Limpiar el texto pegado
    let cleanedText = text;
    
    // Si no es el campo de feedback, reemplazar todos los saltos de línea por espacios
    if (target.name !== 'feedback') {
      cleanedText = text.replace(/[\r\n]+/g, ' ').trim();
    } else {
      // En feedback, normalizar saltos de línea
      cleanedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      // Limitar saltos de línea consecutivos
      cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
    }
    
    // Insertar el texto limpio
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const currentValue = target.value;
    const newValue = currentValue.substring(0, start) + cleanedText + currentValue.substring(end);
    
    setProperty(target.name, newValue);
  };

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
            <h5 className="flex-grow-1">
              {newQuestion.id ? 'Editar pregunta' : 'Nueva pregunta'}
            </h5>
            <button
              type="button"
              className="border-0 bg-white"
              onClick={() => closeModal()}
            >
              <i className="bi bi-x fs-4" />
            </button>
          </div>
          
          {/* Aviso sobre formato */}
          <div className="alert alert-info small mt-3 mb-3">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Tip:</strong> Al pegar texto del BOE, los saltos de línea se limpiarán automáticamente. 
            En el feedback puedes usar saltos de línea simples.
          </div>
          
          <div className="mt-4">
            <div className="mb-3">
              <label
                htmlFor="question"
                className="form-label mb-0"
              >
                Pregunta <span className="text-danger">*</span>
              </label>
              <input
                id="question"
                type="text"
                name="question"
                autoComplete="off"
                className="form-control"
                value={newQuestion?.question || ''}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
                onPaste={handlePaste}
                required
              />
            </div>
            
            <label className="form-label mb-0">
              Opción A <span className="text-danger">*</span>
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
                value={newQuestion?.optionA || ''}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
                onPaste={handlePaste}
                required
              />
            </div>
            
            <label className="form-label mb-0">
              Opción B <span className="text-danger">*</span>
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
                value={newQuestion?.optionB || ''}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
                onPaste={handlePaste}
                required
              />
            </div>
            
            <label className="form-label mb-0">
              Opción C <span className="text-danger">*</span>
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
                value={newQuestion?.optionC || ''}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
                onPaste={handlePaste}
                required
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
                    value={newQuestion?.block || ''}
                    onChange={(({ target: { name, value } }) => setProperty(name, value))}
                    required
                  />
                  <label htmlFor="block">Bloque <span className="text-danger">*</span></label>
                </div>
              </div>
              <div className="flex-fill">
                <div className="form-floating">
                  <input
                    min="1"
                    max="45"
                    id="topic"
                    name="topic"
                    type="number"
                    autoComplete="off"
                    className="form-control"
                    placeholder="Tema"
                    value={newQuestion?.topic || ''}
                    onChange={(({ target: { name, value } }) => setProperty(name, value))}
                    required
                  />
                  <label htmlFor="topic">Tema <span className="text-danger">*</span></label>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label htmlFor="feedback" className="form-label mb-0">
                  Feedback (Retroalimentación)
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowFeedbackPreview(!showFeedbackPreview)}
                >
                  <i className={`bi bi-eye${showFeedbackPreview ? '-slash' : ''} me-1`}></i>
                  {showFeedbackPreview ? 'Ocultar' : 'Ver'} vista previa
                </button>
              </div>
              
              <textarea
                id="feedback"
                className="form-control"
                name="feedback"
                rows={5}
                placeholder="Puedes pegar texto del BOE aquí. Los saltos de línea se preservarán."
                value={newQuestion?.feedback || ''}
                onChange={(({ target: { name, value } }) => setProperty(name, value))}
                onPaste={handlePaste}
              />
              
              {showFeedbackPreview && newQuestion?.feedback && (
                <div className="mt-2 p-3 bg-light rounded">
                  <p className="small mb-1 text-muted">Vista previa del feedback:</p>
                  <div className="small" style={{ whiteSpace: 'pre-line' }}>
                    {newQuestion.feedback}
                  </div>
                </div>
              )}
            </div>
            
            {!isValidQuestion && (
              <div className="alert alert-warning small">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Por favor, completa todos los campos obligatorios marcados con <span className="text-danger">*</span>
              </div>
            )}
            
            <div className="d-flex justify-content-end gap-3">
              <button
                type="submit"
                disabled={!isValidQuestion}
                className="btn btn-action"
                onClick={addQuestion}
              >
                <i className={`bi bi-${newQuestion.id ? 'pencil' : 'plus-circle'} me-2`}></i>
                {newQuestion.id ? 'Guardar cambios' : 'Añadir pregunta'}
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