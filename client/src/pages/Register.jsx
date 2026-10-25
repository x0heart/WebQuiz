
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('participant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', {
        username,
        email,
        password,
        role,
      });

      navigate('/login', {
        state: {
          message: 'Регистрация успешна! Теперь войдите в аккаунт.',
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Не удалось зарегистрироваться. Попробуйте ещё раз.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="auth-logo">WebQuiz</Link>

        <h1>Создать аккаунт</h1>
        <p className="auth-subtitle">
          Присоединяйтесь к игре
        </p>

        {error && <div className="auth-error">{error}</div>}

        <label htmlFor="username">Имя пользователя</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Ваше имя"
          autoComplete="username"
          required
        />

        <label htmlFor="register-email">Электронная почта</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label htmlFor="register-password">Пароль</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Придумайте пароль"
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label htmlFor="role">Кем вы будете?</label>
        <select
          id="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="participant">Участник</option>
          <option value="organizer">Организатор</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
        </button>

        <p className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </section>
  );
}

export default Register;
