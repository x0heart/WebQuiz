import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './JoinQuiz.css';

function JoinQuiz() {
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    const code = roomCode.trim().toUpperCase();

    if (!code) {
      setError('Введите код комнаты');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(
        `/sessions/${encodeURIComponent(code)}/join`
      );

      const session = response.data.session;

      if (!session?.id) {
        setError('Сервер не вернул данные игровой сессии');
        return;
      }

      navigate(`/sessions/${session.id}/participant`, {
        state: { session },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Не удалось присоединиться к игре. Проверьте код комнаты.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="join-quiz-page">
      <section className="join-quiz-card">
        <div className="join-quiz-icon">▶</div>

        <h1>Присоединиться к игре</h1>
        <p>Введи код комнаты, который сообщил организатор.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="room-code">Код комнаты</label>

          <input
            id="room-code"
            type="text"
            value={roomCode}
            onChange={(event) => {
              setRoomCode(event.target.value.toUpperCase());
              setError('');
            }}
            placeholder="Например, JH9N82"
            maxLength={10}
            autoComplete="off"
            required
          />

          {error && (
            <p className="join-quiz-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Подключение...' : 'Присоединиться'}
          </button>
        </form>

        <button
          type="button"
          className="join-quiz-back"
          onClick={() => navigate('/dashboard')}
        >
          Вернуться в личный кабинет
        </button>
      </section>
    </main>
  );
}

export default JoinQuiz;