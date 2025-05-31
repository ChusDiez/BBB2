// FrontExams/src/components/FeedbackDisplay.tsx
import React from 'react';
import './FeedbackDisplay.css'; // Importar los estilos CSS

interface FeedbackDisplayProps {
  feedback: string;
  isEnriched?: boolean;
  question?: string;
  correctAnswer?: string;
}

export default function FeedbackDisplay({ 
  feedback, 
  isEnriched = false,
  question,
  correctAnswer 
}: FeedbackDisplayProps) {
  
  // Si el feedback ya está enriquecido con HTML
  if (isEnriched && feedback) {
    return (
      <div className="feedback-container">
        {correctAnswer && (
          <div className="mb-3">
            <strong>Respuesta correcta: </strong>
            <span className="correct-answer">{correctAnswer}</span>
          </div>
        )}
        <div 
          dangerouslySetInnerHTML={{ __html: feedback }}
        />
      </div>
    );
  }
  
  // Si es feedback plano, aplicar formato básico
  if (feedback) {
    // Buscar y resaltar automáticamente patrones comunes
    let formattedFeedback = feedback;
    
    // Resaltar artículos (ej: "Artículo 123", "art. 45")
    formattedFeedback = formattedFeedback.replace(
      /\b(Artículo|Art\.|artículo|art\.)\s*(\d+)/gi,
      '<strong class="law-reference">$1 $2</strong>'
    );
    
    // Resaltar leyes (ej: "Ley 39/2015", "LO 4/2015")
    formattedFeedback = formattedFeedback.replace(
      /\b(Ley|LO|RD|Real Decreto)\s*([\d/]+)/gi,
      '<strong class="law-reference">$1 $2</strong>'
    );
    
    // Convertir saltos de línea en párrafos
    const paragraphs = formattedFeedback.split('\n\n');
    formattedFeedback = paragraphs
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    
    return (
      <div className="feedback-container">
        {correctAnswer && (
          <div className="mb-3">
            <strong>Respuesta correcta: </strong>
            <span className="correct-answer">{correctAnswer}</span>
          </div>
        )}
        <div 
          dangerouslySetInnerHTML={{ __html: formattedFeedback }}
        />
      </div>
    );
  }
  
  return (
    <div className="feedback-container text-muted">
      <em>No hay feedback disponible para esta pregunta.</em>
    </div>
  );
}