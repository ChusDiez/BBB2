/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { Exam } from '../store/slice';
import DifficultyBreakdown from '../components/DifficultyBreakdown';

type ResultType = {
  questions: Exam;
  resourceIndex: number;
  metadata?: {
    requestedDifficulty?: string;
    difficultyBreakdown?: {
      MUY_FACIL: number;
      FACIL: number;
      MEDIO: number;
      DIFICIL: number;
      MUY_DIFICIL: number;
      ALEATORIO: number;
    };
    totalRequested?: number;
    totalObtained?: number;
    excludedCount?: number;
  };
};

export default function Result() {
  const { state } = useLocation();
  const { data, amount } = state;
  const { questions, resourceIndex, metadata } = data as ResultType;

  const verdict = useMemo(() => {
    if (questions.length === 0) {
      return (
        <p className="text-gray-light">
          No hay registros para obtener.
          Por favor confirme que hay preguntas del tema seleccionado
        </p>
      );
    }
    if (questions.length < amount) {
      return (
        <p className="flex-grow-1 text-warning">
          No hay suficientes preguntas
        </p>
      );
    }
    return (
      <div className="d-flex justify-content-end gap-4">
        <a
          aria-label="Download word test"
          className="btn btn-light d-flex align-items-center"
          href={`http://localhost:3001/api/v1/historic/download?id=${resourceIndex}&type=doc`}
        >
          Descargar Doc
          <i className="bi bi-file-earmark-word ms-2 fs-5" />
        </a>
        <a
          aria-label="Download test"
          className="btn btn-light d-flex align-items-center"
          href={`http://localhost:3001/api/v1/historic/download?id=${resourceIndex}&type=csv`}
        >
          Descargar Csv
          <i className="bi bi-file-earmark-arrow-down ms-2 fs-5" />
        </a>
      </div>
    );
  }, [amount, questions.length, resourceIndex]);

  return (
    <div className="results">
      <h1 className="fs-4 mb-4">
        Resultados
      </h1>
      <div className="p-4 bg-white rounded mb-3 shadow-sm">
        {verdict}
      </div>
      
      {/* Mostrar breakdown de dificultades si está disponible */}
      {metadata?.difficultyBreakdown && (
        <DifficultyBreakdown
          breakdown={metadata.difficultyBreakdown}
          totalRequested={metadata.totalRequested || amount}
          totalObtained={metadata.totalObtained || questions.length}
          requestedDifficulty={metadata.requestedDifficulty}
          excludedCount={metadata.excludedCount}
        />
      )}
      {questions.length > 0 && (
      <div className="table-responsive mt-4 small">
        <table className="table table-borderless table-hover mb-0">
          <thead>
            <tr>
              <th className="text-center">
                #
              </th>
              <th className="text-truncate">
                Pregunta
              </th>
              <th className="text-nowrap text-center">
                Bloque
              </th>
              <th className="text-nowrap text-center">
                Tema
              </th>
              <th className="col-1">
                Feedback
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map(({
              id, question, block, topic, feedback,
            }, i) => (
              <tr key={id}>
                <td className="small text-center">{i + 1}</td>
                <td className="col-8">
                  {question}
                </td>
                <td className="text-nowrap text-center">{block}</td>
                <td className="text-nowrap text-center">{topic}</td>
                <td className="text-nowrap text-center">{feedback ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
