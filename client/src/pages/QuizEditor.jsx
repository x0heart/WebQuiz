import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import QuizSettings from './QuizSettings';
import './QuizEditor.css';

const createEmptyQuestion = (order = 1) => ({
  questionText: '',
  questionType: 'text',
  answerType: 'single',
  points: 1,
  questionOrder: order,
  fileId: null,
  file: null,
  answers: [
    { answerText: '', isCorrect: true },
    { answerText: '', isCorrect: false },
  ],
});

function QuizEditor() {
  const { id } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(createEmptyQuestion());
  const [editingId, setEditingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const loadQuestions = useCallback(async () => {
    const response = await api.get(`/quizzes/${id}/questions`);
    setQuestions(response.data.questions || []);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError('');

      try {
        const [quizResponse, questionsResponse] = await Promise.all([
          api.get(`/quizzes/${id}`),
          api.get(`/quizzes/${id}/questions`),
        ]);

        if (cancelled) return;

        setQuiz(quizResponse.data.quiz || quizResponse.data);
        setQuestions(questionsResponse.data.questions || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            'Не удалось загрузить квиз. Проверьте доступ и подключение к серверу.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function changeField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeAnswer(index, field, value) {
    setForm((current) => ({
      ...current,
      answers: current.answers.map((answer, i) => {
        if (i !== index) return answer;

        if (field === 'isCorrect' && current.answerType === 'single') {
          return { ...answer, isCorrect: true };
        }

        return { ...answer, [field]: value };
      }).map((answer, i) => {
        if (
          field === 'isCorrect' &&
          current.answerType === 'single' &&
          i !== index
        ) {
          return { ...answer, isCorrect: false };
        }

        return answer;
      }),
    }));
  }

  function changeAnswerType(value) {
    setForm((current) => {
      const answers = current.answers.map((answer) => ({
        ...answer,
        isCorrect: false,
      }));

      if (answers.length) answers[0].isCorrect = true;

      return { ...current, answerType: value, answers };
    });
  }

  function addAnswer() {
    setForm((current) => ({
      ...current,
      answers: [
        ...current.answers,
        { answerText: '', isCorrect: false },
      ],
    }));
  }

  function removeAnswer(index) {
    setForm((current) => {
      const answers = current.answers.filter((_, i) => i !== index);

      if (answers.length && !answers.some((answer) => answer.isCorrect)) {
        answers[0].isCorrect = true;
      }

      return { ...current, answers };
    });
  }

  function resetForm() {
    setForm(createEmptyQuestion(questions.length + 1));
    setEditingId(null);
    setSelectedFile(null);
    setError('');
    setSuccess('');
  }

  function editQuestion(question) {
    setEditingId(question.id);
    setSelectedFile(null);

    setForm({
      questionText: question.question_text || '',
      questionType: question.question_type || 'text',
      answerType: question.answer_type || 'single',
      points: question.points || 1,
      questionOrder: question.question_order || 1,
      fileId: question.file_id || null,
      file: question.file || null,
      answers: (question.answers || []).map((answer) => ({
        answerText: answer.answer_text || '',
        isCorrect: answer.is_correct === true,
      })),
    });

    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadSelectedFile() {
    if (!selectedFile) return form.fileId;

    const body = new FormData();
    body.append('file', selectedFile);

    setUploading(true);

    try {
      const response = await api.post('/files/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedFile = response.data.file;

      if (!uploadedFile?.id) {
        throw new Error('Сервер не вернул ID загруженного файла');
      }

      return uploadedFile.id;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.questionText.trim()) {
      setError('Введите текст вопроса.');
      return;
    }

    if (form.answers.length < 2) {
      setError('Добавьте минимум два варианта ответа.');
      return;
    }

    if (form.answers.some((answer) => !answer.answerText.trim())) {
      setError('Заполните текст каждого варианта ответа.');
      return;
    }

    if (!form.answers.some((answer) => answer.isCorrect)) {
      setError('Отметьте хотя бы один правильный ответ.');
      return;
    }

    if (
      form.answerType === 'single' &&
      form.answers.filter((answer) => answer.isCorrect).length !== 1
    ) {
      setError('Для одиночного выбора должен быть один правильный ответ.');
      return;
    }

    if (form.questionType === 'image' && !selectedFile && !form.fileId) {
      setError('Выберите изображение для вопроса.');
      return;
    }

    setSaving(true);

    try {
      const fileId = form.questionType === 'image'
        ? await uploadSelectedFile()
        : null;

      const payload = {
        questionText: form.questionText.trim(),
        questionType: form.questionType,
        answerType: form.answerType,
        points: Number(form.points),
        questionOrder: Number(form.questionOrder),
        fileId,
        answers: form.answers.map((answer) => ({
          answerText: answer.answerText.trim(),
          isCorrect: answer.isCorrect,
        })),
      };

      if (editingId) {
        await api.put(
          `/quizzes/${id}/questions/${editingId}`,
          payload
        );
        setSuccess('Вопрос обновлён.');
      } else {
        await api.post(`/quizzes/${id}/questions`, payload);
        setSuccess('Вопрос добавлен.');
      }

      await loadQuestions();
      setForm(createEmptyQuestion(questions.length + 2));
      setEditingId(null);
      setSelectedFile(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Не удалось сохранить вопрос.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(questionId) {
    if (!window.confirm('Удалить этот вопрос?')) return;

    setError('');
    setSuccess('');

    try {
      await api.delete(`/quizzes/${id}/questions/${questionId}`);
      setQuestions((current) =>
        current.filter((question) => question.id !== questionId)
      );

      if (editingId === questionId) resetForm();

      setSuccess('Вопрос удалён.');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Не удалось удалить вопрос.'
      );
    }
  }

  if (loading) {
    return <main className="editor-page"><p>Загрузка квиза...</p></main>;
  }

  return (
    <main className="editor-page">
      <Link to="/dashboard" className="editor-back">
        ← В личный кабинет
      </Link>

      <header className="editor-header">
        <div>
          <p className="editor-eyebrow">Редактор квиза</p>
          <h1>{quiz?.title || `Квиз №${id}`}</h1>
          <p>Добавляйте вопросы и отмечайте правильные ответы.</p>
        </div>

        <div className="editor-count">
          <strong>{questions.length}</strong>
          <span>вопросов</span>
        </div>
      </header>
      
      <QuizSettings
        quiz={quiz}
        onSaved={(updatedQuiz) => {
          if (updatedQuiz === null) {
            navigate('/dashboard', {
              replace: true,
              state: { message: 'Квиз удалён' },
            });
            return;
          }

          setQuiz((previousQuiz) => ({
            ...previousQuiz,
            ...updatedQuiz,
          }));
        }}
      />

      {error && <div className="editor-alert editor-alert-error">{error}</div>}
      {success && <div className="editor-alert editor-alert-success">{success}</div>}

      <section className="editor-panel">
        <h2>{editingId ? 'Редактирование вопроса' : 'Новый вопрос'}</h2>

        <form onSubmit={handleSubmit} className="question-form">
          <label>
            Текст вопроса
            <textarea
              value={form.questionText}
              onChange={(event) => changeField('questionText', event.target.value)}
              placeholder="Например: Какая планета ближе всего к Солнцу?"
              rows={3}
              required
            />
          </label>

          <div className="editor-fields">
            <label>
              Тип вопроса
              <select
                value={form.questionType}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({
                    ...current,
                    questionType: value,
                    fileId: value === 'text' ? null : current.fileId,
                    file: value === 'text' ? null : current.file,
                  }));
                  setSelectedFile(null);
                }}
              >
                <option value="text">Текстовый</option>
                <option value="image">С изображением</option>
              </select>
            </label>

            <label>
              Тип ответа
              <select
                value={form.answerType}
                onChange={(event) => changeAnswerType(event.target.value)}
              >
                <option value="single">Один правильный ответ</option>
                <option value="multiple">Несколько правильных ответов</option>
              </select>
            </label>

            <label>
              Баллы
              <input
                type="number"
                min="1"
                step="1"
                value={form.points}
                onChange={(event) => changeField('points', event.target.value)}
                required
              />
            </label>

            <label>
              Порядок вопроса
              <input
                type="number"
                min="1"
                step="1"
                value={form.questionOrder}
                onChange={(event) => changeField('questionOrder', event.target.value)}
                required
              />
            </label>
          </div>

          {form.questionType === 'image' && (
            <div className="editor-image-upload">
              <label>
                Изображение
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
              </label>

              {selectedFile && (
                <p>Выбран файл: {selectedFile.name}</p>
              )}

              {!selectedFile && form.file && (
                <p>Текущее изображение: {form.file.originalName}</p>
              )}

              {!selectedFile && !form.file && !form.fileId && (
                <p>Выберите изображение с компьютера.</p>
              )}
            </div>
          )}

          <div className="editor-answers-heading">
            <div>
              <h3>Варианты ответов</h3>
              <p>
                {form.answerType === 'single'
                  ? 'Отметьте один правильный вариант.'
                  : 'Отметьте все правильные варианты.'}
              </p>
            </div>

            <button type="button" className="editor-button editor-button-light" onClick={addAnswer}>
              + Добавить вариант
            </button>
          </div>

          <div className="editor-answers">
            {form.answers.map((answer, index) => (
              <div className="editor-answer" key={index}>
                <label className="editor-correct">
                  <input
                    type={form.answerType === 'single' ? 'radio' : 'checkbox'}
                    name="correctAnswer"
                    checked={answer.isCorrect}
                    onChange={(event) =>
                      changeAnswer(index, 'isCorrect', event.target.checked)
                    }
                  />
                  <span className="editor-answer-number">{index + 1}</span>
                </label>

                <input
                  className="editor-answer-text"
                  type="text"
                  value={answer.answerText}
                  onChange={(event) =>
                    changeAnswer(index, 'answerText', event.target.value)
                  }
                  placeholder={`Вариант ответа ${index + 1}`}
                  required
                />

                <button
                  type="button"
                  className="editor-remove-answer"
                  onClick={() => removeAnswer(index)}
                  disabled={form.answers.length <= 2}
                  aria-label={`Удалить вариант ${index + 1}`}
                  title="Удалить вариант"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="editor-form-actions">
            {editingId && (
              <button
                type="button"
                className="editor-button editor-button-light"
                onClick={resetForm}
              >
                Отмена
              </button>
            )}

            <button
              type="submit"
              className="editor-button editor-button-primary"
              disabled={saving || uploading}
            >
              {uploading
                ? 'Загрузка изображения...'
                : saving
                  ? 'Сохранение...'
                  : editingId
                    ? 'Сохранить изменения'
                    : 'Добавить вопрос'}
            </button>
          </div>
        </form>
      </section>

      <section className="editor-question-list">
        <h2>Вопросы квиза</h2>

        {questions.length === 0 ? (
          <div className="editor-empty">
            <h3>Пока нет вопросов</h3>
            <p>Добавьте первый вопрос с помощью формы выше.</p>
          </div>
        ) : (
          questions.map((question) => (
            <article className="editor-question-card" key={question.id}>
              <div className="editor-question-top">
                <span className="editor-question-number">
                  Вопрос {question.question_order}
                </span>
                <span className="editor-question-points">
                  {question.points} балл.
                </span>
              </div>

              <h3>{question.question_text}</h3>

              <p className="editor-question-meta">
                {question.question_type === 'image' ? 'Изображение' : 'Текст'} ·{' '}
                {question.answer_type === 'single'
                  ? 'Один ответ'
                  : 'Несколько ответов'}
              </p>

              {question.file?.storedName && (
                <img
                  className="editor-question-image"
                  src={`http://localhost:5000${question.file.url}`}
                  alt="Изображение вопроса"
                />
              )}

              <ul className="editor-answer-preview">
                {(question.answers || []).map((answer) => (
                  <li
                    key={answer.id}
                    className={answer.is_correct ? 'is-correct' : ''}
                  >
                    <span>{answer.is_correct ? '✓' : '○'}</span>
                    {answer.answer_text}
                    {answer.is_correct && <small>Правильный ответ</small>}
                  </li>
                ))}
              </ul>

              <div className="editor-card-actions">
                <button
                  type="button"
                  className="editor-button editor-button-light"
                  onClick={() => editQuestion(question)}
                >
                  Редактировать
                </button>

                <button
                  type="button"
                  className="editor-button editor-button-danger"
                  onClick={() => deleteQuestion(question.id)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default QuizEditor;