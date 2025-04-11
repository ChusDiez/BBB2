import { NavLink, useLocation } from 'react-router-dom';
import classNames from 'classnames';

export default function SideBar() {
  const location = useLocation();

  return (
    <aside className="sidebar h-100 p-3 rounded-end-4 text-white shadow-sm">
      <div className="center gap-3 mb-5 mt-2">
        <div className="d-flex p-2 center rounded-4" style={{ background: '#0a73d5' }}>
          <i className="bi bi-file-text fs-2 d-flex" />
        </div>
        <h3 className="m-0 fw-semibold">
          Exámenes
        </h3>
      </div>
      <div className="d-flex flex-column gap-3 fw-light">
        <NavLink
          className={({ isActive, isPending }) => classNames({
            active: isActive,
            pending: isPending,
            'center-start gap-3 p-3 rounded-3 w-100': true,
          })}
          to="/"
        >
          <i className="bi bi-file-bar-graph-fill" />
          <p className="m-0">
            Dashboard
          </p>
        </NavLink>
        <div
          className="accordion"
        >
          <div className="accordion-item">
            <div
              className={classNames({
                'accordion-button p-3 gap-3 collapsed': true,
                active: location.pathname.match('generator'),
              })}
              data-bs-toggle="collapse"
              data-bs-target="#generatorCollapse"
              aria-expanded="true"
              aria-controls="generatorCollapse"
            >
              <i className="bi bi-gear-fill" />
              <p className="m-0">
                Generador
              </p>
            </div>
            <div
              id="generatorCollapse"
              className="accordion-collapse collapse"
              data-bs-parent="#generator"
            >
              <div className="center-start flex-column gap-3 ps-4 pt-3">
                <NavLink
                  className={({ isActive, isPending }) => classNames({
                    active: isActive,
                    pending: isPending,
                    'dropdown-item p-3 rounded-3': true,
                  })}
                  to="/generator/topic"
                >
                  <i className="bi bi-check2-circle me-2" />
                  Examen por tema
                </NavLink>
                <NavLink
                  className={({ isActive, isPending }) => classNames({
                    active: isActive,
                    pending: isPending,
                    'dropdown-item p-3 rounded-3': true,
                  })}
                  to="/generator/multiple"
                >
                  <i className="bi bi-list-check me-2" />
                  Examen múltiple
                </NavLink>
                <NavLink
                  className={({ isActive, isPending }) => classNames({
                    active: isActive,
                    pending: isPending,
                    'dropdown-item p-3 rounded-3': true,
                  })}
                  to="/generator/block"
                >
                  <i className="bi bi-collection me-2" />
                  Examen por bloque
                </NavLink>
              </div>
            </div>
          </div>
        </div>
        <NavLink
          className={({ isActive, isPending }) => classNames({
            active: isActive,
            pending: isPending,
            'center-start gap-3 p-3 rounded-3 w-100': true,
          })}
          to="/upload"
        >
          <i className="bi bi-cloud-arrow-up-fill" />
          <p className="m-0">
            Carga
          </p>
        </NavLink>
        <NavLink
          className={({ isActive, isPending }) => classNames({
            active: isActive,
            pending: isPending,
            'center-start gap-3 p-3 rounded-3 w-100': true,
          })}
          to="/admin"
        >
          <i className="bi bi-key-fill" />
          <p className="m-0">
            Administrador
          </p>
        </NavLink>
        <NavLink
          className={({ isActive, isPending }) => classNames({
            active: isActive,
            pending: isPending,
            'center-start gap-3 p-3 rounded-3 w-100': true,
          })}
          to="/historic"
        >
          <i className="bi bi-clock-fill" />
          <p className="m-0">
            Histórico
          </p>
        </NavLink>
      </div>
    </aside>
  );
}
