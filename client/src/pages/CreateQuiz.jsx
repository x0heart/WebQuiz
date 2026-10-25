
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './CreateQuiz.css';

function CreateQuiz() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [questionTime, setQuestionTime] = useState(30);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await api.get('/categories');

        if (!cancelled) {
          setCategories(response.data.categories || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            'Не удалось загрузить категории.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!categoryId) {
      setError('Выберите категорию квиза.');
      return;
    }

    setSaving(true);

    try {
      const response = await api.post('/quizzes', {
        title: title.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        questionTime: Number(questionTime),
      });

      const quiz = response.data.quiz;

      // Переходим к редактированию созданного квиза.
      navigate(`/quizzes/${quiz.id}/edit`, {
        state: { quiz },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Не удалось создать квиз. Проверьте соединение с сервером.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="create-quiz-page">
      <div className="create-quiz-heading">
        <Link to="/dashboard" className="back-link">
          ← В личный кабинет
        </Link>

        <span className="dashboard-label">НОВАЯ ВИКТОРИНА</span>
        <h1>Создание квиза</h1>
        <p>Укажи основные параметры. Вопросы добавим на следующем шаге.</p>
      </div>

      <form className="create-quiz-card" onSubmit={handleSubmit}>
        {error && <div className="dashboard-error">{error}</div>}

        <label htmlFor="quiz-title">Название квиза</label>
        <input
          id="quiz-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например, Проверка знаний по информатике"
          maxLength={150}
          required
        />

        <label htmlFor="quiz-description">Описание</label>
        <textarea
          id="quiz-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Кратко опиши содержание квиза"
          rows={4}
        />

        <label htmlFor="quiz-category">Категория</label>
        <select
          id="quiz-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={loadingCategories || categories.length === 0}
          required
        >
          <option value="">
            {loadingCategories
              ? 'Загружаем категории...'
              : categories.length === 0
                ? 'Категории не найдены'
                : 'Выберите категорию'}
          </option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="question-time">Время на каждый вопрос</label>
        <div className="question-time-field">
          <input
            id="question-time"
            type="number"
            min={5}
            max={600}
            step={5}
            value={questionTime}
            onChange={(event) => setQuestionTime(event.target.value)}
            required
          />
          <span>секунд</span>
        </div>

        <p className="form-hint">
          Время можно задать от 5 до 600 секунд.
        </p>

        <button
          className="create-quiz-submit"
          type="submit"
          disabled={
            saving ||
            loadingCategories ||
            categories.length === 0 ||
            !title.trim() ||
            !categoryId
          }
        >
          {saving ? 'Создаём квиз...' : 'Создать и добавить вопросы'}
        </button>
      </form>
    </section>
  );
}

export default CreateQuiz;
