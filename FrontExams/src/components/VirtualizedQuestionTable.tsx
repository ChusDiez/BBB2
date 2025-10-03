import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Question } from '../store/slice';
import '../styles/VirtualizedTable.css';

interface VirtualizedQuestionTableProps {
  questions: Question[];
  selectedQuestions: Set<number>;
  onToggleSelection: (questionId: number) => void;
  onDeleteQuestion: (id: number) => void;
  onEditQuestion: (question: Question) => void;
  onShowPreview: (questionId: number) => void;
  showPreviewFor: number | null;
  categories: any[];
  isLoading: boolean;
  hasNextPage: boolean;
  loadNextPage: () => Promise<void>;
}

const ROW_HEIGHT = 120;
const BUFFER_SIZE = 5;

const QuestionRow: React.FC<{
  question: Question;
  isSelected: boolean;
  onToggleSelection: (questionId: number) => void;
  onDeleteQuestion: (id: number) => void;
  onEditQuestion: (question: Question) => void;
  onShowPreview: (questionId: number) => void;
  showPreviewFor: number | null;
  categories: any[];
}> = ({
  question,
  isSelected,
  onToggleSelection,
  onDeleteQuestion,
  onEditQuestion,
  onShowPreview,
  showPreviewFor,
  categories,
}) => {
  const categoryName = categories.find(cat => cat.id === question.topic)?.name || 'Sin categoría';
  const hasHtmlFeedback = question.feedback && question.feedback.includes('<');

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    const cleanText = text.replace(/<[^>]*>/g, '');
    return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + '...' : cleanText;
  };

  return (
    <div className="border-bottom">
      <div className="d-flex align-items-center p-3" style={{ minHeight: ROW_HEIGHT }}>
        {/* Checkbox de selección */}
        <div className="me-3" style={{ width: '40px' }}>
          <input
            type="checkbox"
            className="form-check-input"
            checked={isSelected}
            onChange={() => onToggleSelection(question.id)}
          />
        </div>

        {/* Contenido de la pregunta */}
        <div className="flex-grow-1 me-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="flex-grow-1">
              <h6 className="mb-1 text-truncate">
                {truncateText(question.question, 80)}
              </h6>
              <small className="text-muted">
                ID: {question.id} | {categoryName}
              </small>
            </div>
            <div className="text-end">
              <span className="badge bg-primary me-1">B{question.block}</span>
              <span className="badge bg-secondary">T{question.topic}</span>
            </div>
          </div>

          {/* Feedback preview */}
          {question.feedback && (
            <div className="small text-muted">
              <i className={`bi ${hasHtmlFeedback ? 'bi-code-slash text-warning' : 'bi-chat-text text-success'} me-1`}></i>
              {truncateText(question.feedback, 60)}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="d-flex gap-1" style={{ width: '120px' }}>
          <button
            className="btn btn-sm btn-outline-info"
            onClick={() => onShowPreview(question.id)}
            title="Vista previa"
          >
            <i className="bi bi-eye"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-warning"
            onClick={() => onEditQuestion(question)}
            title="Editar"
          >
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDeleteQuestion(question.id)}
            title="Eliminar"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      </div>

      {/* Preview expandido */}
      {showPreviewFor === question.id && (
        <div className="bg-light p-3 border-top preview-expanded">
          <div className="row">
            <div className="col-md-6">
              <h6>Pregunta:</h6>
              <div 
                className="small"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(question.question)
                }}
              />
            </div>
            <div className="col-md-6">
              <h6>Feedback:</h6>
              <div 
                className="small"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(question.feedback || 'Sin feedback')
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const VirtualizedQuestionTable: React.FC<VirtualizedQuestionTableProps> = ({
  questions,
  selectedQuestions,
  onToggleSelection,
  onDeleteQuestion,
  onEditQuestion,
  onShowPreview,
  showPreviewFor,
  categories,
  isLoading,
  hasNextPage,
  loadNextPage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Calcular qué elementos mostrar basado en el scroll
  const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / ROW_HEIGHT) + BUFFER_SIZE,
    questions.length
  );

  const visibleItems = questions.slice(Math.max(0, startIndex - BUFFER_SIZE), endIndex);
  const offsetY = Math.max(0, startIndex - BUFFER_SIZE) * ROW_HEIGHT;

  // Manejar scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Cargar más elementos cuando se acerca al final
    if (hasNextPage && !isLoading && target.scrollTop + target.clientHeight >= target.scrollHeight - 200) {
      loadNextPage();
    }
  }, [hasNextPage, isLoading, loadNextPage]);

  // Actualizar altura del contenedor
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div className="virtualized-table-container">
      {/* Header de la tabla */}
      <div className="table-header bg-light border-bottom p-3">
        <div className="d-flex align-items-center">
          <div style={{ width: '40px' }} className="me-3">
            <strong>#</strong>
          </div>
          <div className="flex-grow-1">
            <strong>Pregunta</strong>
          </div>
          <div style={{ width: '120px' }} className="text-center">
            <strong>Acciones</strong>
          </div>
        </div>
      </div>

      {/* Contenedor con scroll virtual */}
      <div
        ref={containerRef}
        style={{ height: '600px', overflow: 'auto' }}
        onScroll={handleScroll}
      >
        {/* Spacer superior */}
        <div style={{ height: offsetY }} />
        
        {/* Elementos visibles */}
        {visibleItems.map((question) => (
          <QuestionRow
            key={question.id}
            question={question}
            isSelected={selectedQuestions.has(question.id)}
            onToggleSelection={onToggleSelection}
            onDeleteQuestion={onDeleteQuestion}
            onEditQuestion={onEditQuestion}
            onShowPreview={onShowPreview}
            showPreviewFor={showPreviewFor}
            categories={categories}
          />
        ))}

        {/* Spacer inferior */}
        <div style={{ height: (questions.length - endIndex) * ROW_HEIGHT }} />

        {/* Indicador de carga */}
        {isLoading && (
          <div className="text-center p-3 loading-more">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            Cargando más preguntas...
          </div>
        )}
        
        {/* Indicador de que hay más contenido */}
        {hasNextPage && !isLoading && (
          <div className="text-center p-3 loading-more">
            <div className="text-muted small">
              <i className="bi bi-arrow-down me-1"></i>
              Scroll hacia abajo para cargar más preguntas
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedQuestionTable;