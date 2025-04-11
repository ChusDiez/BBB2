/* eslint-disable jsx-a11y/label-has-associated-control */
import Select from 'react-select';
import classNames from 'classnames';
import type { Category } from '../../store/slice';

import ExcludeExams from '../../components/ExcludeExams';
import useCategories from '../../hooks/useCategories';
import useGeneratorMultiple from '../../hooks/useGeneratorMultiple';

export default function Multiple() {
  const { categories } = useCategories();
  const {
    generateExam,
    examProperties,
    setProperty,
    handleExcludeExam,
  } = useGeneratorMultiple();

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
                htmlFor="examName"
                className="fw-normal text-gray-light mb-1"
              >
                Nombre del examen
              </label>
              <input
                id="examName"
                type="text"
                name="name"
                autoComplete="off"
                className="form-control"
                placeholder="Examen ..."
                value={examProperties.name || ''}
                onChange={({ target: { name, value } }) => setProperty(name, value)}
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
                {[50, 100].map((option, i) => (
                  <button
                    className={classNames({
                      'btn btn-amount btn-sm flex-1': true,
                      active: option === examProperties.amount,
                    })}
                    id={`amount${i}`}
                    key={i}
                    name="amount"
                    onClick={() => setProperty('amount', option)}
                    type="button"
                  >
                    {option}
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
                isMulti
                placeholder="Tema(s)"
                options={categories}
                onChange={(e) => setProperty('options', e)}
                getOptionLabel={({ topic, name }: Category) => `${topic} - ${name}`}
                getOptionValue={({ topic }: Category) => topic.toString()}
                isDisabled={examProperties.allTopics}
              />
              <div className="small d-flex gap-3 fst-italic">
                <div className="form-check">
                  <input
                    id="selectAllTopics"
                    type="checkbox"
                    className="form-check-input"
                    checked={examProperties.allTopics}
                    onChange={() => setProperty('allTopics', !examProperties.allTopics)}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="selectAllTopics"
                  >
                    Todos los temas
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    id="onlyFeedback"
                    type="checkbox"
                    checked={examProperties.onlyHasFeedback}
                    onChange={() => setProperty('onlyHasFeedback', !examProperties.onlyHasFeedback)}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="onlyFeedback"
                  >
                    Con feedback
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="randomOrder"
                    id="randomOrderTopic"
                    checked={examProperties.randomOrder}
                    onChange={() => setProperty('randomOrder', !examProperties.randomOrder)}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="randomOrderTopic"
                  >
                    Orden aleatorio
                  </label>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-action align-self-center px-5 mt-4"
              onClick={generateExam}
              disabled={!examProperties.options?.length
                || !examProperties.name
                || !examProperties.amount}
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
