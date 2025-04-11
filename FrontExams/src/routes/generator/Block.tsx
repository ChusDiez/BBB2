/* eslint-disable jsx-a11y/label-has-associated-control */
import classNames from 'classnames';
import ExcludeExams from '../../components/ExcludeExams';
import useGeneratorByBlock from '../../hooks/useGeneratorByBlock';
import { mapBlock } from '../../config/blockConfig';

export default function Block() {
  const {
    generateExam,
    block,
    setBlock,
    amount,
    setAmount,
    handleExcludeExam,
    examName,
    setExamName,
  } = useGeneratorByBlock();

  return (
    <div className="row g-0 d-flex justify-content-between mb-3">
      <div className="col-6">
        <h4 className="fw-semibold mb-4">
          Información General
        </h4>
        <div className="p-4 bg-white rounded mb-3 shadow-sm">
          <div className="d-flex flex-column gap-4">
            <div>
              <label
                htmlFor="testName"
                className="fw-normal text-gray-light mb-1"
              >
                Nombre del examen
              </label>
              <input
                id="testName"
                type="text"
                autoComplete="off"
                className="form-control"
                placeholder="Examen ..."
                onChange={({ target }) => setExamName(target.value)}
              />
            </div>
            <div>
              <p className="fw-normal text-gray-light mb-1">
                Seleccione bloque
              </p>
              <div
                className="d-flex radio-btn gap-1 p-1"
                aria-label="Grupo de preguntas"
              >
                {Object.entries(mapBlock).map(({ 0: key, 1: value }) => (
                  <button
                    className={classNames({
                      'btn btn-amount btn-sm flex-1': true,
                      active: key === block?.toString(),
                    })}
                    id={`block${key}`}
                    key={key}
                    onClick={() => setBlock(key as unknown as number)}
                    type="button"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="questionAmount"
                className="fw-normal text-gray-light mb-1"
              >
                Cantidad de preguntas
              </label>
              <input
                id="questionAmount"
                type="number"
                autoComplete="off"
                className="form-control"
                placeholder="Cantidad ..."
                value={amount}
                onChange={({ target }) => setAmount(target.value as unknown as number)}
              />
            </div>
            <button
              type="button"
              className="btn btn-action align-self-center px-5 mt-4"
              onClick={generateExam}
              disabled={!block || !examName || !amount}
            >
              Generar
            </button>
          </div>
        </div>
      </div>
      <div className="col-5">
        <ExcludeExams
          onClickExam={handleExcludeExam}
        />
      </div>
    </div>
  );
}
