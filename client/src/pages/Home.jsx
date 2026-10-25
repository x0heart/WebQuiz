
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <section className="home">
      <div className="home-content">
        <span className="home-label">ИНТЕРАКТИВНЫЕ ВИКТОРИНЫ</span>

        <h1>
          Проверь свои знания.
          <br />
          <span>Победи соперников.</span>
        </h1>

        <p className="home-description">
          Создавай собственные квизы, приглашай друзей
          и соревнуйся в знаниях в режиме реального времени.
        </p>

        <div className="home-actions">
          <Link to="/register" className="primary-button">
            Начать играть
          </Link>

          <Link to="/login" className="secondary-button">
            Войти в аккаунт
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Home;
