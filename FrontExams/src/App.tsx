/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { useMemo } from 'react';
import classNames from 'classnames';
import useStats from './hooks/useStats';
import { mapBlock } from './config/blockConfig';
import Card from './components/Card';

export default function App() {
  const { examsStats, questionStats } = useStats();

  const lastExamUrl = useMemo(() => {
    if (examsStats?.lastGenerated) {
      return `http://localhost:3000/api/v1/historic/download?id=${examsStats.lastGenerated.idExam}`;
    } return '#';
  }, [examsStats]);

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
          <a
            className={classNames({
              'text-decoration-none text-reset': true,
              'pe-none': !examsStats?.lastGenerated,
            })}
            href={lastExamUrl}
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
          </a>
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
