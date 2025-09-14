/* eslint-disable @typescript-eslint/restrict-template-expressions */
// Force redeploy for downloadHelper fix
import { useMemo } from 'react';
import classNames from 'classnames';
import useStats from './hooks/useStats';
import { mapBlock } from './config/blockConfig';
import Card from './components/Card';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './components/Auth';
import { downloadHistoric } from './utils/downloadHelper';

function Dashboard() {
  const { examsStats, questionStats } = useStats();

  const handleLastExamDownload = () => {
    if (examsStats?.lastGenerated) {
      downloadHistoric(examsStats.lastGenerated.idExam, 'doc');
    }
  };

  return (
    <>
      <h1 className="mb-4 fs-4 fw-semibold">
        Resumen
      </h1>
      <div className="row h-75">
        <div className="col-4 d-flex flex-column gap-3">
          <div className="p-3 d-flex align-items-center rounded-3 gap-3 card-1">
            <div className="circle center text-white fs-4">
              <i className="bi bi-question-circle d-flex" />
            </div>
            <div className="flex-grow-1">
              <p className="text-center text-gray-light fs-7">
                Preguntas añadidas
              </p>
              <p className="text-center fs-4 fw-semibold">
                {questionStats?.countAll}
              </p>
            </div>
          </div>
          <Card innerClass="flex-column gap-2">
            {!questionStats?.countPerBlock?.length && (
            <p className="fw-semibold">No hay preguntas añadidas aún</p>
            )}
            {questionStats?.countPerBlock?.map(({ block, count }) => (
              <div
                key={block}
                className="d-flex justify-content-between"
              >
                <p className="text-gray-light">{`Preguntas ${mapBlock[block as unknown as keyof typeof mapBlock]}`}</p>
                <p>{count}</p>
              </div>
            ))}
          </Card>
        </div>
        <div className="col-4 d-flex flex-column gap-3">
          <div className="p-3 d-flex align-items-center rounded-3 gap-3 card-2">
            <div className="circle center text-white fs-4">
              <i className="bi bi-file-earmark-text d-flex" />
            </div>
            <div className="flex-grow-1">
              <p className="text-center text-gray-light fs-7">
                Exámenes generados
              </p>
              <p className="text-center fs-4 fw-semibold">
                {examsStats?.countAllExams}
              </p>
            </div>
          </div>
          <Card innerClass="bg-white shadow-sm rounded-3 p-4 d-flex flex-column gap-2">
            {!examsStats?.examsByGroup?.length && (
              <p className="text-gray-light">No hay exámenes generados aún</p>
            )}
            {examsStats?.examsByGroup?.map(({ category, total }) => (
              <div
                key={category}
                className="d-flex justify-content-between"
              >
                <p className="text-gray-light">{`Examenes por ${category}`}</p>
                <p>{total}</p>
              </div>
            ))}
          </Card>
        </div>
        <div className="col-4 d-flex flex-column gap-3 h-100">
          <button
            className={classNames({
              'text-decoration-none text-reset border-0 bg-transparent p-0 w-100': true,
              'pe-none': !examsStats?.lastGenerated,
            })}
            onClick={handleLastExamDownload}
            disabled={!examsStats?.lastGenerated}
            type="button"
          >
            <div className="p-3 d-flex align-items-center rounded-3 gap-3 card-3 h-100">
              <div className="circle center text-white fs-4">
                <i className="bi bi-filetype-csv d-flex" />
              </div>
              <div className="flex-grow-1">
                <p className="text-center text-gray-light fs-7">
                  Ultimo exámen generado
                </p>
                <p className="text-center fs-4 fw-semibold">
                  {examsStats?.lastGenerated?.name || '-'}
                </p>
              </div>
            </div>
          </button>
          <Card innerClass="flex-column gap-2 h-100 overflow-scroll">
            {questionStats?.countPerTopic?.map(({ topic, count }) => (
              <div
                key={topic}
                className="d-flex justify-content-between"
              >
                <p className="text-gray-light">{`Tema ${topic}`}</p>
                <p>{count}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
