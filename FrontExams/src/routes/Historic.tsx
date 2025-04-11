/* eslint-disable react/no-array-index-key */
import useHistoric from '../hooks/useHistoric';

export default function Historic() {
  const { historic, removeRecord } = useHistoric();

  const formatDate = (date: string) => new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));

  return (
    <>
      <h1 className="fs-4 mb-4">Histórico de exámenes</h1>

      <div className="bg-white rounded p-4">
        {!historic.length
          ? (<h6 className="fw-semibold">No has generado exámenes aún </h6>)
          : (<p className="text-gray-light">Información sobre los exámenes que has generado</p>
          )}
      </div>
      <div className="table-responsive mt-4 historic small">
        <table className="table table-borderless table-hover align-middle mb-0">
          <thead>
            <tr>
              <th className="">
                #
              </th>
              <th className="text-truncate">
                Nombre
              </th>
              <th className="text-nowrap">
                Tipo de examen
              </th>
              <th className="col-2 text-nowrap">
                Preguntas
              </th>
              <th className="col-2 text-nowrap">
                Fecha
              </th>
              <th
                className="col-1 text-center"
                aria-label="download"
              >
                Opciones
              </th>
            </tr>
          </thead>
          <tbody>
            {historic.map(({
              idExam, name, category, type, amount, createdAt,
            }, i) => (
              <tr key={idExam}>
                <th>{i + 1}</th>
                <td className="">
                  {name}
                </td>
                <td className="text-nowrap">
                  {category === 'Tema' && (
                    <span className="badge badge-topic rounded-3 p-2 fw-normal">
                      {`${category} ${type}`}
                    </span>
                  )}
                  {category === 'Multiple' && (
                    <span className="badge badge-multiple rounded-3 p-2 fw-normal">
                      {`${category} ${type}`}
                    </span>
                  )}
                  {category === 'Bloque' && (
                    <span className="badge badge-block rounded-3 p-2 fw-normal">
                      {`${category} ${type}`}
                    </span>
                  )}
                </td>
                <td>{amount}</td>
                <td className="text-nowrap">
                  {formatDate(createdAt)}
                </td>
                <td className="rounded-end-3">
                  <div className="d-flex justify-content-end gap-3 mx-3">
                    <div className="dropdown">
                      <button
                        className="btn squared"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <i className="bi bi-three-dots" />
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <a
                            className="dropdown-item"
                            href={`http://localhost:3000/api/v1/historic/download?id=${idExam}&type=csv`}
                          >
                            CSV
                          </a>
                        </li>
                        <li>
                          <a
                            className="dropdown-item"
                            href={`http://localhost:3000/api/v1/historic/download?id=${idExam}&type=doc`}
                          >
                            DOC
                          </a>
                        </li>
                        <li>
                          <a
                            className="dropdown-item"
                            href={`http://localhost:3000/api/v1/historic/download?id=${idExam}&type=doc&feedback=true`}
                          >
                            DOC + feedback
                          </a>
                        </li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="btn btn-cancel squared"
                      onClick={() => removeRecord(idExam)}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
