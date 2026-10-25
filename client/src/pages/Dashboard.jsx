
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [quizzes, setQuizzes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOrganizer = user?.role === 'organizer';

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!localStorage.getItem('token')) {
        navigate('/login');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const profileResponse = await api.get('/profile');
        const profile = profileResponse.data.user;

        if (cancelled) return;

        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));

        const requests = [
          api.get('/history'),
          ...(profile.role === 'organizer' ? [api.get('/quizzes')] : []),
        ];

        const results = await Promise.allSettled(requests);

        if (cancelled) return;

        const historyResult = results[0];

        if (historyResult.status === 'fulfilled') {
          setHistory(historyResult.value.data.history || []);
        }

        if (profile.role === 'organizer') {
          const quizzesResult = results[1];

          if (quizzesResult.status === 'fulfilled') {
            setQuizzes(quizzesResult.value.data.quizzes || []);
          }
        }

        if (results.some((result) => result.status === 'rejected')) {
          setError(
            'Не все данные удалось загрузить. Попробуйте обновить страницу.'
          );
        }
      } catch (err) {
        if (cancelled) return;

        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        setError(
          err.response?.data?.message ||
          'Не удалось загрузить профиль. Проверьте соединение с сервером.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  if (loading) {
    return <div className="dashboard-message">Загружаем личный кабинет...</div>;
  }

  if (!user) {
    return <div className="dashboard-message">Профиль не найден.</div>;
  }

  return (
    <div className="dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-label">
            {isOrganizer ? 'КАБИНЕТ ОРГАНИЗАТОРА' : 'КАБИНЕТ УЧАСТНИКА'}
          </span>

          <h1>Привет, {user.username}!</h1>

          <p>
            {isOrganizer
              ? 'Создавай квизы и следи за результатами игр.'
              : 'Присоединяйся к играм и улучшай свои результаты.'}
          </p>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Выйти
        </button>
      </section>

      {error && <div className="dashboard-error">{error}</div>}

      <section className="dashboard-actions">
        {isOrganizer ? (
          <>
            <Link to="/quizzes/new" className="dashboard-action primary">
              <span className="action-icon">＋</span>
              <span>
                <strong>Создать квиз</strong>
                <small>Подготовить новую викторину</small>
              </span>
            </Link>

            <a href="#my-quizzes" className="dashboard-action">
              <span className="action-icon">▤</span>
              <span>
                <strong>Мои квизы</strong>
                <small>Посмотреть созданные викторины</small>
              </span>
            </a>
          </>
        ) : (
          <>
            <Link to="/join" className="dashboard-action primary">
              <span className="action-icon">▶</span>
              <span>
                <strong>Присоединиться к игре</strong>
                <small>Ввести код комнаты</small>
              </span>
            </Link>

            <a href="#history" className="dashboard-action">
              <span className="action-icon">◷</span>
              <span>
                <strong>История игр</strong>
                <small>Посмотреть свои результаты</small>
              </span>
            </a>
          </>
        )}
      </section>

      {isOrganizer && (
        <section className="dashboard-section" id="my-quizzes">
          <div className="section-heading">
            <h2>Мои квизы</h2>
            <span>{quizzes.length}</span>
          </div>

          {quizzes.length === 0 ? (
            <div className="dashboard-empty">
              <h3>Пока нет квизов</h3>
              <p>Создай свою первую викторину, чтобы начать.</p>
              <Link to="/quizzes/new" className="text-link">
                Создать квиз
              </Link>
            </div>
          ) : (
            <div className="dashboard-list">
              {quizzes.map((quiz) => (
                <article className="dashboard-item" key={quiz.id}>
                <div>
                    <h3>{quiz.title}</h3>
                    <p>
                    {quiz.category_name || 'Без категории'}
                    {' · '}
                    {quiz.question_count ?? 0} вопросов
                    </p>
                </div>

                <div className="quiz-item-actions">
                    <span className="item-status">
                    {quiz.is_active ? 'Активен' : 'Черновик'}
                    </span>

                    <button
                    type="button"
                    className="edit-quiz-button"
                    onClick={() => navigate(`/quizzes/${quiz.id}/edit`)}
                    >
                    Редактировать
                    </button>
                </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="dashboard-section" id="history">
        <div className="section-heading">
          <h2>{isOrganizer ? 'Последние игры' : 'История результатов'}</h2>
          <span>{history.length}</span>
        </div>

        {history.length === 0 ? (
          <div className="dashboard-empty">
            <h3>Здесь пока пусто</h3>
            <p>
              {isOrganizer
                ? 'Проведённые игры появятся здесь.'
                : 'Сыгранные квизы и результаты появятся здесь.'}
            </p>
          </div>
        ) : (
          <div className="dashboard-list">
            {history.map((item) => (
              <article
                className="dashboard-item"
                key={isOrganizer ? item.session_id : item.result_id}
              >
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.category || 'Без категории'}
                    {' · '}
                    {isOrganizer
                      ? `Комната: ${item.room_code || '—'}`
                      : `Место: ${item.place ?? '—'}`}
                  </p>
                </div>

                <div className="history-result">
                  {isOrganizer
                    ? `${item.participants_count ?? 0} участников`
                    : `${item.total_score ?? 0} баллов`}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
