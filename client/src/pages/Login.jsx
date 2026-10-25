
import { Link } from 'react-router-dom';

function Login() {
  return (
    <section style={{ padding: '60px 8%', textAlign: 'center' }}>
      <h1>Вход в WebQuiz</h1>
      <p>Здесь мы реализуем авторизацию через backend.</p>
      <Link to="/register">Ещё нет аккаунта? Зарегистрироваться</Link>
    </section>
  );
}

export default Login;
