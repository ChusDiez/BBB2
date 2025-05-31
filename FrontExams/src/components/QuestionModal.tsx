// FrontExams/src/components/QuestionModal.tsx
/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { ModalProps } from '../context/ModalContext';
import useAdmin from '../hooks/useAdmin';
import { Question } from '../store/slice';
import EnrichmentAPI from '../apis/EnrichmentAPI';

interface AvailableProviders {
  openai: boolean;
  anthropic: boolean;
  hasAny: boolean;
}

export default function QuestionModal({ closeModal, payload }: ModalProps) {
  const {
    isValidQuestion,
    newQuestion,
    setProperty,
    addQuestion,
  } = useAdmin(payload.question as Question);
  
  const [showFeedbackPreview, setShowFeedbackPreview] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentProvider, setEnrichmentProvider] = useState<'openai' | 'anthropic'>('openai');
  const [availableProviders, setAvailableProviders] = useState<AvailableProviders>({
    openai: false,
    anthropic: false,
    hasAny: false
  });
  const [htmlPreview, setHtmlPreview] = useState('');

  // Cargar proveedores disponibles al montar
  useEffect(() => {
    console.log('🔍 Cargando proveedores de IA...');
    EnrichmentAPI.getProviders()
      .then(({ data }) => {
        console.log('✅ Proveedores disponibles:', data);
        setAvailableProviders(data);
      })
      .catch(error => {
        console.error('❌ Error al cargar proveedores:', error);
      });
  }, []);

  // Inicializar htmlPreview con el feedback existente
  useEffect(() => {
    if (newQuestion?.feedback) {
      setHtmlPreview(newQuestion.feedback);
    }
  }, [newQuestion?.feedback]);

  // Debug: log cuando cambian los proveedores o el feedback
  useEffect(() => {
    console.log('Debug - Estado actual:', {
      proveedores: availableProviders,
      tieneFeedback: !!newQuestion?.feedback,
      debeMostrarBoton: availableProviders.hasAny && !!newQuestion?.feedback
    });
  }, [availableProviders, newQuestion?.feedback]);

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

  // Función para limpiar bloques de código markdown
  const cleanMarkdownCodeBlocks = (text: string): string => {
    let cleanedText = text;
    
    // Eliminar bloques de código markdown
    const codeBlockPattern = /^```(?:html)?\s*\n?([\s\S]*?)\n?```$/;
    const match = cleanedText.match(codeBlockPattern);
    
    if (match && match[1]) {
      cleanedText = match[1];
    }
    
    // También eliminar si solo están al principio o al final
    cleanedText = cleanedText.replace(/^```(?:html)?\s*\n?/, '');
    cleanedText = cleanedText.replace(/\n?```$/, '');
    
    return cleanedText.trim();
  };

  // Función para enriquecer feedback con IA
  const enrichFeedback = async () => {
    if (!newQuestion.feedback || !availableProviders.hasAny) return;

    setIsEnriching(true);
    try {
      const { data } = await EnrichmentAPI.preview({
        feedback: newQuestion.feedback,
        question: newQuestion.question,
        correctAnswer: newQuestion.correctAnswer,
        provider: enrichmentProvider
      });

      if (data.success) {
        const cleanedFeedback = cleanMarkdownCodeBlocks(data.enrichedFeedback);
        setProperty('feedback', cleanedFeedback);
        setHtmlPreview(cleanedFeedback);
      }
    } catch (error) {
      console.error('Error al enriquecer feedback:', error);
      alert('Error al enriquecer el feedback. Por favor, intenta de nuevo.');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      id="addQuestionModal"
      aria-labelledby="addQuestion"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl">
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
            En el feedback puedes usar saltos de línea simples y HTML para formato.
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
            
            {/* Sección de Feedback con IA */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label htmlFor="feedback" className="form-label mb-0">
                  Feedback (Retroalimentación)
                </label>
                <div className="d-flex gap-2">
                  {availableProviders.hasAny && newQuestion.feedback && (
                    <div className="d-flex align-items-center gap-2">
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
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={enrichFeedback}
                        disabled={isEnriching}
                      >
                        {isEnriching ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Enriqueciendo...
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
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowFeedbackPreview(!showFeedbackPreview)}
                  >
                    <i className={`bi bi-eye${showFeedbackPreview ? '-slash' : ''} me-1`}></i>
                    {showFeedbackPreview ? 'Ocultar' : 'Ver'} vista previa
                  </button>
                </div>
              </div>
              
              <div className="row">
                <div className={showFeedbackPreview ? 'col-6' : 'col-12'}>
                  <textarea
                    id="feedback"
                    className="form-control font-monospace small"
                    name="feedback"
                    rows={6}
                    placeholder="Puedes pegar texto del BOE aquí o escribir HTML directamente. Los saltos de línea se preservarán."
                    value={newQuestion?.feedback || ''}
                    onChange={(({ target: { name, value } }) => {
                      setProperty(name, value);
                      setHtmlPreview(value);
                    })}
                    onPaste={handlePaste}
                  />
                  <small className="text-muted">
                    Puedes usar HTML: &lt;strong&gt;, &lt;em&gt;, &lt;u&gt;, &lt;mark&gt;, &lt;br&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;code&gt;, etc.
                  </small>
                </div>
                
                {showFeedbackPreview && newQuestion?.feedback && (
                  <div className="col-6">
                    <div className="border rounded p-3 h-100 overflow-auto" style={{ maxHeight: '300px' }}>
                      <p className="small mb-2 text-muted fw-bold">Vista previa del feedback:</p>
                      <div 
                        className="feedback-preview"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(htmlPreview || newQuestion.feedback) 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
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
                disabled={!isValidQuestion || isEnriching}
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