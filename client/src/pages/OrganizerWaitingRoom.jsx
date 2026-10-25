
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import './OrganizerWaitingRoom.css';

function OrganizerWaitingRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Подключение...');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionStarting, setQuestionStarting] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null);
  const timerDeadlineRef = useRef(null);

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

      if (data.type === 'session_finished') {
        navigate(`/sessions/${sessionId}/results`);
      }

      if (data.type === 'participants_list') {
        setParticipants(data.participants);
      }

      if (data.type === 'question_started') {
        setCurrentQuestion(data);

        const secondsLeft = Math.max(0, Number(data.time ?? 0));
        timerDeadlineRef.current =
            performance.now() + secondsLeft * 1000;

        setRemainingTime(Math.ceil(secondsLeft));
        setQuestionStarting(false);
      }

      if (data.type === 'question_finished') {
        timerDeadlineRef.current = null;
        setRemainingTime(0);
        setQuestionStarting(false);
      }

      if (data.type === 'participant_connected') {
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === data.userId)) {
            return prev;
          }

          return [
            ...prev,
            { userId: data.userId, username: data.username, role: data.role },
          ];
        });
      }

      if (data.type === 'participant_disconnected') {
        setParticipants((prev) =>
          prev.filter((p) => p.userId !== data.userId)
        );
      }

      if (data.type === 'error') {
        setError(data.message || 'Ошибка WebSocket.');
        setQuestionStarting(false);
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

  useEffect(() => {
    if (!currentQuestion) return;

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

  async function handleStartGame() {
    setStarting(true);
    setError('');

    try {
      await api.patch(`/sessions/${sessionId}/start`);

      setSession((prev) => ({
        ...prev,
        status: 'started',
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Не удалось запустить игру.'
      );
    } finally {
      setStarting(false);
    }
  }

  function handleStartQuestion() {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError('Нет подключения к серверу.');
      return;
    }

    setError('');
    setQuestionStarting(true);

    socket.send(JSON.stringify({
      type: 'start_question',
      questionIndex: 0,
    }));
  }

  async function handleFinishGame() {
    setError('');

    try {
      await api.patch(`/sessions/${sessionId}/finish`);
      navigate(`/sessions/${sessionId}/results`);
    } catch (err) {
        setError(
        err.response?.data?.message ||
        'Не удалось завершить игру.'
        );
    }
  }

  async function handleCopyCode() {
    if (!session?.room_code) return;

    try {
      await navigator.clipboard.writeText(session.room_code);
    } catch {
      setError('Не удалось скопировать код комнаты.');
    }
  }

  return (
    <main className="waiting-room">
      <button
        className="waiting-room-back"
        onClick={() => navigate('/dashboard')}
      >
        ← В личный кабинет
      </button>

      <h1>Игровая комната</h1>

      <p className="waiting-room-connection">
        Соединение: {connectionStatus}
      </p>

      {error && (
        <div className="waiting-room-error">{error}</div>
      )}

      {session && (
        <>
          <section className="waiting-room-code-card">
            <p>Код для подключения участников</p>

            <div className="waiting-room-code">
              {session.room_code}
            </div>

            <button
              className="waiting-room-copy"
              onClick={handleCopyCode}
            >
              Скопировать код
            </button>
          </section>

          <section className="waiting-room-participants">
            <h2>
              Участники <span>{participants.length}</span>
            </h2>

            {participants.length === 0 ? (
              <p className="waiting-room-empty">
                Пока никто не подключился. Поделитесь кодом комнаты.
              </p>
            ) : (
              <ul>
                {participants.map((participant) => (
                  <div key={participant.userId}>
                    {participant.username || `Участник #${participant.userId}`}
                  </div>
                ))}
              </ul>
            )}
          </section>

          {session.status === 'waiting' ? (
            <button
              className="waiting-room-start"
              onClick={handleStartGame}
              disabled={starting}
            >
              {starting ? 'Запуск...' : 'Начать игру'}
            </button>
            ) : (
            <section className="waiting-room-game">
              <p className="waiting-room-started">
                Игра уже началась.
              </p>

              {!currentQuestion ? (
                <button
                  className="waiting-room-start"
                  onClick={handleStartQuestion}
                  disabled={questionStarting}
                >
                  {questionStarting
                  ? 'Загрузка вопроса...'
                  : 'Показать первый вопрос'}
                </button>
                ) : (
                <div className="current-question">
                  <h2>
                  Вопрос {currentQuestion.questionNumber}
                  {' из '}
                  {currentQuestion.totalQuestions}
                  </h2>

                  <p>{currentQuestion.question?.question_text}</p>

                  <span className={remainingTime === 0 ? 'time-ended' : ''}>
                    {remainingTime === null
                      ? 'Таймер...'
                      : remainingTime > 0
                        ? `Осталось: ${remainingTime} сек.`
                        : 'Время вышло'}
                  </span>
                  <button
                    className="waiting-room-start"
                    onClick={handleFinishGame}
                  >
                    Завершить игру
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default OrganizerWaitingRoom;
