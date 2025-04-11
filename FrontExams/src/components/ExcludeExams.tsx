import useHistoric from '../hooks/useHistoric';

type Props = {
  onClickExam: (id: number) => void;
};

export default function ExcludeExams({ onClickExam }: Props) {
  const { historic } = useHistoric();
  return (
    <div>
      <h4 className="fw-semibold mb-4">
        Excluir exámenes
      </h4>
      <div className="p-4 bg-white rounded shadow-sm mb-3 overflow-hidden exclude-exams" style={{ height: `${500}px` }}>
        <div className="overflow-scroll h-100">
          {!historic.length
            ? (
              <p className="text-gray-light">
                No has generado ningún examen
              </p>
            ) : (
              <p className="fw-normal text-gray-light mb-3">
                Se excluirán las preguntas de los exámenes marcados
              </p>
            )}
          <div className="row px-2">
            {historic.map(({ idExam, name, type }) => (
              <div
                key={idExam}
                className="col-6 mb-2"
              >
                <div className="form-check overflow-visible">
                  <input
                    id={`${name}${idExam}`}
                    className="form-check-input"
                    type="checkbox"
                    value="idExam"
                    onClick={() => onClickExam(idExam)}
                  />
                  <label
                    className="form-check-label text-truncate w-100"
                    htmlFor={`${name}${idExam}`}
                  >
                    {`${name} - ${type || 'Multiple'}`}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
