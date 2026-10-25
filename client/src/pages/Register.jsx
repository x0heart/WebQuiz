
import { Link } from 'react-router-dom';

function Register() {
  return (
    <section style={{ padding: '60px 8%', textAlign: 'center' }}>
      <h1>Регистрация</h1>
      <p>Здесь мы реализуем создание аккаунта.</p>
      <Link to="/login">Уже есть аккаунт? Войти</Link>
    </section>
  );
}

export default Register;
