import { useEffect, useState } from 'react';
import api from '../services/api';

function QuizSettings({ quiz, onSaved }) {
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState(() => quiz?.title || '');
  const [description, setDescription] = useState(
    () => quiz?.description || ''
  );
  const [categoryId, setCategoryId] = useState(
    () => quiz?.category_id == null ? '' : String(quiz.category_id)
  );
  const [questionTime, setQuestionTime] = useState(
    () => quiz?.question_time ?? 30
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await api.get('/categories');
        setCategories(response.data.categories || []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          'Не удалось загрузить категории'
        );
      }
    }

    loadCategories();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Введите название квиза');
      return;
    }

    if (
      !Number.isInteger(Number(questionTime)) ||
      Number(questionTime) < 5 ||
      Number(questionTime) > 600
    ) {
      setError('Время должно быть от 5 до 600 секунд');
      return;
    }

    setSaving(true);

    try {
      const response = await api.put(`/quizzes/${quiz.id}`, {
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
        questionTime: Number(questionTime),
      });

      const updatedQuiz = response.data.quiz;

      onSaved(updatedQuiz);
      setSuccess('Настройки квиза сохранены');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Не удалось сохранить настройки квиза'
      );
    } finally {
      setSaving(false);
    }
  }

  
  async function handleDelete() {
    const confirmed = window.confirm(
      `Удалить квиз «${quiz.title}»? Это действие нельзя отменить.`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.delete(`/quizzes/${quiz.id}`);

    // Сообщаем родительскому компоненту, что квиз удалён.
      onSaved(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Не удалось удалить квиз'
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <section className="quiz-settings">
      <h2>Настройки квиза</h2>

      {error && <p className="quiz-settings-error">{error}</p>}
      {success && <p className="quiz-settings-success">{success}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="quiz-title">Название</label>
        <input
          id="quiz-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={255}
          required
        />

        <label htmlFor="quiz-description">Описание</label>
        <textarea
          id="quiz-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />

        <label htmlFor="quiz-category">Категория</label>
        <select
          id="quiz-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Без категории</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="quiz-question-time">
          Время на вопрос (секунды)
        </label>
        <input
          id="quiz-question-time"
          type="number"
          min="5"
          max="600"
          value={questionTime}
          onChange={(event) => setQuestionTime(event.target.value)}
          required
        />


        <div className="quiz-settings-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>

          <button
            type="button"
            className="delete-quiz-button"
            onClick={handleDelete}
            disabled={saving}
          >
            Удалить квиз
          </button>
        </div>

      </form>
    </section>
  );
}

export default QuizSettings;