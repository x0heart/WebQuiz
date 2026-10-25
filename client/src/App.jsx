
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import QuizEditor from './pages/QuizEditor';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Header />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quizzes/new" element={<CreateQuiz />} />
          <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
