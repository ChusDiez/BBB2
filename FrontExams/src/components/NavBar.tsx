import { ChangeEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useCategories from '../hooks/useCategories';
import useQuestions from '../hooks/useQuestions';

export default function NavBar() {
  const [querySearch, setQuerySearch] = useState({
    query: '',
    block: '0',
    topic: '0',
  });
  const handleChange = ({ target }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setQuerySearch((prev) => ({
      ...prev,
      [target.id]: target.value,
    }));
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { callback: searchQuestions } = useQuestions();

  async function handleSearch() {
    if (location.pathname.includes('admin')) {
      await searchQuestions(querySearch);
    } else {
      navigate('/admin', { replace: true, state: querySearch, relative: 'path' });
    }
  }

  async function handlerKeyDown(key: string) {
    if (key === 'Enter') {
      await handleSearch();
    }
  }

  return (
    <nav className="bg-white shadow-sm p-3">
      <div className="d-flex gap-3 justify-content-center">
        <div className="input-group search">
          <input
            id="query"
            type="text"
            className="form-control query-input"
            placeholder="Buscar"
            aria-label="search"
            value={querySearch.query}
            onKeyDown={(({ key }) => handlerKeyDown(key))}
            onChange={(e) => handleChange(e)}
          />
          <select
            name="block"
            id="block"
            className="input-group-text block-select"
            value={querySearch.block}
            onChange={(e) => handleChange(e)}
          >
            <option value="0">Bloque</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
          <select
            name="topic"
            id="topic"
            className="input-group-text topic-select"
            value={querySearch.topic}
            onChange={(e) => handleChange(e)}
          >
            <option value="0">Tema</option>
            {categories.map(({ topic, name }) => (
              <option
                value={topic}
                key={topic}
              >
                {`${topic} - ${name}`}
              </option>
            ))}
          </select>
          <button
            className="input-group-text px-3 py-3 submit"
            type="button"
            onClick={handleSearch}
          >
            <i className="bi bi-search" />
          </button>
        </div>
      </div>
    </nav>
  );
}
