import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import './SessionResults.css';

function SessionResults() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      try {
        const response = await api.get(
          `/sessions/${sessionId}/results`
        );

        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            'Не удалось загрузить результаты.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return <main className="session-results">
      <p>Загрузка результатов...</p>
    </main>;
  }

  if (error) {
    return (
      <main className="session-results">
        <h1>Результаты игры</h1>
        <p className="session-results-error">{error}</p>
        <button onClick={() => navigate('/dashboard')}>
          В личный кабинет
        </button>
      </main>
    );
  }

  const results = data?.results ?? [];

  return (
    <main className="session-results">
      <button
        className="session-results-back"
        onClick={() => navigate('/dashboard')}
      >
        ← В личный кабинет
      </button>

      <h1>Итоги игры</h1>
      <h2>{data?.session?.quizTitle}</h2>

      {results.length === 0 ? (
        <p>В этой игре пока нет сохранённых результатов.</p>
      ) : (
        <div className="session-results-table-wrapper">
          <table className="session-results-table">
            <thead>
              <tr>
                <th>Место</th>
                <th>Участник</th>
                <th>Баллы</th>
                <th>Правильные ответы</th>
                <th>Неправильные ответы</th>
              </tr>
            </thead>

            <tbody>
              {results.map((result) => (
                <tr key={result.participant_id}>
                  <td>{result.place}</td>
                  <td>{result.username}</td>
                  <td>{result.total_score}</td>
                  <td>{result.correct_answers}</td>
                  <td>{result.wrong_answers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default SessionResults;