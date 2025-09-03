import React from 'react';
import { ScheduledExam } from '../types/unifiedUpload';

interface ScheduledExamsTableProps {
  exams: ScheduledExam[];
  isLoading: boolean;
  onDelete: (examId: number) => void;
  onActivate: (examId: number) => void;
  onRefresh: () => void;
}

export default function ScheduledExamsTable({
  exams,
  isLoading,
  onDelete,
  onActivate,
  onRefresh
}: ScheduledExamsTableProps) {
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { class: 'bg-secondary', text: 'Borrador' },
      active: { class: 'bg-success', text: 'Activo' },
      closed: { class: 'bg-danger', text: 'Cerrado' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`badge ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const getExamTypeIcon = (type: string) => {
    const icons = {
      rf: '📅',
      future: '🕒',
      custom: '🎯'
    };
    
    return icons[type as keyof typeof icons] || '📄';
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm" role="status"></div>
        <p className="small text-muted mt-2">Cargando exámenes...</p>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="bi bi-calendar-x display-6 text-muted"></i>
        <p className="text-muted mt-2">No hay exámenes programados</p>
        <button className="btn btn-sm btn-outline-primary" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise me-1"></i>
          Actualizar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="small text-muted">{exams.length} examen(es)</span>
        <button className="btn btn-sm btn-outline-secondary" onClick={onRefresh}>
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      </div>
      
      <div className="list-group list-group-flush">
        {exams.map((exam) => (
          <div key={exam.id} className="list-group-item px-0 py-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="flex-grow-1">
                <h6 className="mb-1 small">
                  {getExamTypeIcon(exam.exam_type)} {exam.exam_name}
                </h6>
                <p className="mb-1 small text-muted">
                  {exam.total_questions} preguntas
                </p>
              </div>
              {getStatusBadge(exam.status)}
            </div>
            
            {/* Fechas */}
            {exam.window_start_date && (
              <div className="small text-muted mb-1">
                <i className="bi bi-calendar-event me-1"></i>
                Inicio: {formatDate(exam.window_start_date)}
              </div>
            )}
            
            {exam.window_end_date && (
              <div className="small text-muted mb-1">
                <i className="bi bi-calendar-x me-1"></i>
                Fin: {formatDate(exam.window_end_date)}
              </div>
            )}
            
            {exam.global_release_date && (
              <div className="small text-muted mb-2">
                <i className="bi bi-globe me-1"></i>
                Liberación: {formatDate(exam.global_release_date)}
                {exam.auto_release && (
                  <span className="badge bg-info ms-1" style={{ fontSize: '0.6rem' }}>
                    AUTO
                  </span>
                )}
              </div>
            )}
            
            {exam.immediately_available && (
              <div className="small text-success mb-2">
                <i className="bi bi-check-circle me-1"></i>
                Disponible inmediatamente
              </div>
            )}
            
            {/* Acciones */}
            <div className="d-flex gap-2 mt-2">
              {exam.status === 'draft' && (
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() => onActivate(exam.id)}
                  title="Activar examen"
                >
                  <i className="bi bi-play-fill"></i>
                </button>
              )}
              
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de eliminar "${exam.exam_name}"?`)) {
                    onDelete(exam.id);
                  }
                }}
                title="Eliminar examen"
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

