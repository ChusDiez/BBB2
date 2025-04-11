/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { FilePond } from 'react-filepond';
import classNames from 'classnames';
import useUploadFiles from '../hooks/useUploadFiles';
import 'filepond/dist/filepond.min.css';

export default function Upload() {
  const {
    files,
    setFiles,
    result,
    submitFiles,
  } = useUploadFiles();

  return (
    <div>
      <h1 className="fw-semibold fs-4 mb-4">Carga de preguntas</h1>
      <div className="bg-white rounded p-4 shadow-sm">
        <div className="d-flex align-items-center mb-4">
          <div className="flex-grow-1">
            <p className="text-gray-light">Selecciona los archivos que contienen las preguntas</p>
          </div>
          <button
            className="btn btn-action d-flex align-items-center"
            type="button"
            disabled={!files.length}
            onClick={submitFiles}
          >
            <i className="bi bi-cloud-arrow-up me-2 fs-5" />
            Cargar
          </button>
        </div>
        {/* TODO: check methods FilePond */}
        <div className="px-3">
          <FilePond
            files={files}
            onupdatefiles={setFiles}
            allowMultiple
            name="files"
            labelIdle='<h4 class="fw-semibold">
            Arrastra tus archivos o
            <span class="filepond--label-action">buscalos</span>
          </h4>
          <p style="font-size:14px; margin-top:0.5rem; margin-bottom:0.5rem; color:#6d6d82">
            Formato soportado:
            <b> .CSV</b>
          </p>'
          />
        </div>
        {result && (
        <div className="d-flex flex-column gap-2 small">
          {result.map((file: Record<string, any>, i: number) => (
            <p
              key={i}
              className={classNames({
                'text-danger': file.status === 'rejected',
              })}
            >
              {file.status === 'fulfilled'
                ? `El archivo ${file.value.fileName} se cargó correctamente`
                : `El archivo ${file.reason.fileName} no se pudo cargar - ${file.reason.original.sqlMessage}`}
            </p>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
