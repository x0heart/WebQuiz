
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <Link to="/" className="logo">
        WebQuiz
      </Link>

      <nav className="navigation">
        <Link to="/login" className="nav-link">
          Войти
        </Link>

        <Link to="/register" className="nav-button">
          Регистрация
        </Link>
      </nav>
    </header>
  );
}

export default Header;
