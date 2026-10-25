
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
//import api from '../services/api';
import './ParticipantRoom.css';

function ParticipantRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [session, setSession] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Подключение...');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswerIds, setSelectedAnswerIds] = useState([]);
  const [remainingTime, setRemainingTime] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [answerSending, setAnswerSending] = useState(false);
  const timerDeadlineRef = useRef(null);

  // Подключаем участника к той же игровой сессии.
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    const socket = new WebSocket('ws://localhost:5000/ws');
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'auth',
        token,
      }));
    };

    socket.onmessage = (event) => {
      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === 'authenticated') {
        socket.send(JSON.stringify({
          type: 'join_session',
          sessionId: Number(sessionId),
        }));
      }

      if (data.type === 'session_joined') {
        setSession(data.session);
        setConnectionStatus('Подключено');
      }

      if (data.type === 'question_started') {
        setCurrentQuestion(data);
        setSelectedAnswerIds([]);
        setSubmitted(false);
        setResult(null);
        setError('');

        // При повторном подключении сервер может передать timeLeft.
        // Иначе вычисляем длительность по времени сервера.
        let secondsLeft;

        if (Number.isFinite(Number(data.timeLeft))) {
          secondsLeft = Math.max(0, Number(data.timeLeft));
        } else if (data.endsAt && data.serverNow) {
          secondsLeft = Math.max(
          0,
          (new Date(data.endsAt).getTime() -
            new Date(data.serverNow).getTime()) / 1000
          );
        } else {
          secondsLeft = Math.max(0, Number(data.time ?? 0));
        }

        timerDeadlineRef.current =
          performance.now() + secondsLeft * 1000;

        setRemainingTime(Math.ceil(secondsLeft));
      }

      if (data.type === 'question_finished') {
        setRemainingTime(0);
      }

      if (data.type === 'answer_submitted') {
        setAnswerSending(false);
        setSubmitted(true);
        setResult({
          isCorrect: data.isCorrect,
          points: data.points,
        });
        setError('');
      }

      if (data.type === 'error') {
        setError(data.message || 'Произошла ошибка.');
        setAnswerSending(false);
      }
    };

    socket.onerror = () => {
      setConnectionStatus('Ошибка подключения');
    };

    socket.onclose = () => {
      setConnectionStatus('Отключено');
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [sessionId, navigate]);

  // Обновляем таймер по времени окончания вопроса.
  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    const updateTimer = () => {
      const deadline = timerDeadlineRef.current;

      if (deadline === null) {
        setRemainingTime(0);
        return;
      }

      const millisecondsLeft = Math.max(
        0,
        deadline - performance.now()
      );

      setRemainingTime(Math.ceil(millisecondsLeft / 1000));
    };

    updateTimer();

    const timerId = setInterval(updateTimer, 100);

    return () => clearInterval(timerId);
  }, [currentQuestion]);

  function toggleAnswer(answerId) {
    if (submitted || remainingTime === 0) {
      return;
    }

    const answerType = currentQuestion?.question?.answerType;

    if (answerType === 'multiple') {
      setSelectedAnswerIds((previous) =>
        previous.includes(answerId)
          ? previous.filter((id) => id !== answerId)
          : [...previous, answerId]
      );
    } else {
      setSelectedAnswerIds([answerId]);
    }
  }

  function handleSubmitAnswer() {
    const socket = socketRef.current;
    const question = currentQuestion?.question;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError('Нет соединения с сервером.');
      return;
    }

    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !question ||
      submitted ||
      answerSending ||
      remainingTime === 0
    ) {
      return;
    }

    if (selectedAnswerIds.length === 0) {
      setError('Выберите хотя бы один вариант ответа.');
      return;
    }

    setAnswerSending(true);

    socket.send(JSON.stringify({
      type: 'submit_answer',
      questionId: question.id,
      answerIds: selectedAnswerIds,
    }));

    // Не позволяем отправить ответ повторно.
    //setSubmitted(true);
    setError('');
  }

  const question = currentQuestion?.question;
  const imageUrl = question?.file?.url
    ? `http://localhost:5000${question.file.url}`
    : null;

  return (
    <main className="participant-room">
      <button
        type="button"
        className="participant-room-back"
        onClick={() => navigate('/dashboard')}
      >
        ← В личный кабинет
      </button>

      <h1>Игровая комната</h1>

      <p className="participant-room-connection">
        Соединение: {connectionStatus}
      </p>

      {error && (
        <div className="participant-room-error" role="alert">
          {error}
        </div>
      )}

      {!currentQuestion ? (
        <section className="participant-room-card">
          <h2>Ожидание вопроса</h2>
          <p>
            {session?.status === 'started'
              ? 'Организатор скоро покажет вопрос.'
              : 'Вы подключились к комнате. Дождитесь начала игры.'}
          </p>
        </section>
      ) : (
        <section className="participant-room-card">
          <div className="participant-room-question-meta">
            <span>
              Вопрос {currentQuestion.questionNumber} из{' '}
              {currentQuestion.totalQuestions}
            </span>

            <span className={remainingTime === 0 ? 'time-ended' : ''}>
              {remainingTime === null
                ? 'Таймер...'
                : remainingTime > 0
                  ? `Осталось: ${remainingTime} сек.`
                  : 'Время вышло'}
            </span>
          </div>

          <h2>{question.questionText}</h2>

          {imageUrl && (
            <img
              className="participant-room-image"
              src={imageUrl}
              alt={question.file.originalName || 'Изображение к вопросу'}
            />
          )}

          <p className="participant-room-hint">
            {question.answerType === 'multiple'
              ? 'Выберите все подходящие варианты.'
              : 'Выберите один вариант ответа.'}
          </p>

          <div className="participant-room-answers">
            {question.answers.map((answer) => {
              const isSelected = selectedAnswerIds.includes(answer.id);

              return (
                <label
                  key={answer.id}
                  className={[
                    'participant-room-answer',
                    isSelected ? 'selected' : '',
                    submitted || remainingTime === 0 ? 'disabled' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <input
                    type={question.answerType === 'multiple' ? 'checkbox' : 'radio'}
                    name={`question-${question.id}`}
                    checked={isSelected}
                    onChange={() => toggleAnswer(answer.id)}
                    disabled={submitted || remainingTime === 0}
                  />

                  <span>{answer.answer_text}</span>
                </label>
              );
            })}
          </div>

          {!submitted && remainingTime !== 0 && (
            <button
              type="button"
              className="participant-room-submit"
              onClick={handleSubmitAnswer}
              disabled={selectedAnswerIds.length === 0}
            >
              Ответить
            </button>
          )}

          {submitted && (
            <div className="participant-room-success">
              <h3>Ответ отправлен</h3>
              {result && (
                <p>
                  {result.isCorrect
                    ? `Правильно! Начислено баллов: ${result.points}`
                    : `Ответ принят. Начислено баллов: ${result.points}`}
                </p>
              )}
              <p>Ожидайте следующего вопроса.</p>
            </div>
          )}

          {!submitted && remainingTime === 0 && (
            <p className="participant-room-timeout">
              Время на ответ закончилось.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

export default ParticipantRoom;
