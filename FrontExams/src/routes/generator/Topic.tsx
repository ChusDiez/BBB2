/* eslint-disable jsx-a11y/label-has-associated-control */
import Select from 'react-select';
import classNames from 'classnames';

import type { Category } from '../../store/slice';

import ExcludeExams from '../../components/ExcludeExams';
import useCategories from '../../hooks/useCategories';
import useGeneratorByTopic from '../../hooks/useGeneratorByTopic';

export default function Topic() {
  const { categories } = useCategories();
  const {
    generateExam,
    option,
    setOption,
    amount,
    setAmount,
    handleExcludeExam,
    examName,
    setExamName,
  } = useGeneratorByTopic();

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
                Seleccione la cantidad de preguntas
              </p>
              <div
                className="d-flex radio-btn gap-1 p-1"
                aria-label="Grupo de preguntas"
              >
                {[25, 50, 100].map((optionAmount, i) => (
                  <button
                    className={classNames({
                      'btn btn-amount btn-sm flex-1': true,
                      active: optionAmount === amount,
                    })}
                    id={`amount${i}`}
                    key={i}
                    onClick={() => setAmount(optionAmount)}
                    type="button"
                  >
                    {optionAmount}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="exampleFormControlInput1"
                className="fw-normal text-gray-light mb-1"
              >
                Seleccione el tema
              </label>
              <Select
                defaultValue={option}
                onChange={(e) => setOption(e)}
                placeholder="Tema"
                options={categories}
                getOptionLabel={({ topic, name }: Category) => `${topic} - ${name}`}
                getOptionValue={({ topic }: Category) => topic.toString()}
              />
            </div>
            <button
              type="button"
              className="btn btn-action align-self-center px-5 mt-4"
              onClick={generateExam}
              disabled={!option || !examName || !amount}
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
