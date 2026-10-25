const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");

const sessionService = require("../services/session.service");

function setupQuizSocket(server) {
    const wss = new WebSocket.Server({
        server,
        path: "/ws"
    });

    const sessions = new Map();

    const questionTimers = new Map();

    function addClientToSession(sessionId, ws) {
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, new Set());
        }
        sessions.get(sessionId).add(ws);
    }

    function removeClientFromSession(sessionId, ws) {
        if (!sessions.has(sessionId)) {
            return;
        }

        const clients = sessions.get(sessionId);

        clients.delete(ws);

        if (clients.size === 0) {
            sessions.delete(sessionId);
        }
    }

    function sendToSession(sessionId, data) {
        const clients = sessions.get(sessionId);

        if (!clients) {
            return;
        }

        const message = JSON.stringify(data);

        for (const client of clients) {

            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    async function sendAnswerProgress(sessionId, questionId) {
        try {
            const result = await pool.query(
                `
                SELECT
                    COUNT(*) AS total_participants,
                    COUNT(*) FILTER (
                        WHERE EXISTS (
                            SELECT 1
                            FROM participant_answers pa
                            JOIN participants p2
                                ON p2.id = pa.participant_id
                            WHERE p2.session_id = p.session_id
                            AND p2.id = p.id
                            AND pa.question_id = $2
                        )
                    ) AS answered_participants
                FROM participants p
                WHERE p.session_id = $1
                `,
                [sessionId, questionId]
            );

            const row = result.rows[0];

            const message = {
                type: "answer_progress",
                sessionId,
                questionId,
                totalParticipants: Number(row.total_participants),
                answeredParticipants: Number(row.answered_participants)
            };

            // Уведомляем только организаторов в комнате.
            const clients = sessions.get(sessionId);

            if (!clients) {
                return;
            }

            for (const client of clients) {
                if (
                    client.readyState === WebSocket.OPEN &&
                    client.user?.role === "organizer"
                ) {
                    client.send(JSON.stringify(message));
                }
            }
        } catch (error) {
            console.error(
                "Ошибка подсчёта ответов:",
                error
            );
        }
    }

    async function getQuestionForSession(sessionId, questionIndex) {
        const sessionResult = await pool.query(
            `
            SELECT
                qs.id,
                qs.quiz_id,
                qs.status,
                q.question_time
            FROM quiz_sessions qs
            JOIN quizzes q
                ON q.id = qs.quiz_id
            WHERE qs.id = $1
            `,
            [sessionId]
        );

        if (sessionResult.rows.length === 0) {
            throw new Error("Сессия не найдена");
        }

        const session = sessionResult.rows[0];

        const questionsResult = await pool.query(
            `
            SELECT
                q.id,
                q.question_text,
                q.question_type,
                q.answer_type,
                q.points,
                q.question_order,
                q.file_id,
                f.original_name,
                f.stored_name,
                f.mime_type
            FROM questions q
            LEFT JOIN files f
                ON f.id = q.file_id
            WHERE q.quiz_id = $1
            ORDER BY q.question_order
            `,
            [session.quiz_id]
        );

        if (
            questionIndex < 0 ||
            questionIndex >= questionsResult.rows.length
        ) {
            return null;
        }

        const question = questionsResult.rows[questionIndex];

        const answersResult = await pool.query(
            `
            SELECT
                id,
                answer_text
            FROM answers
            WHERE question_id = $1
            ORDER BY id
            `,
            [question.id]
        );

        let file = null;

        if (question.file_id) {

            file = {
                id: question.file_id,
                originalName: question.original_name,
                storedName: question.stored_name,
                mimeType: question.mime_type,
                url: `/uploads/${question.stored_name}`
            };
        }

        const startedAt = new Date();

        const endsAt = new Date(
            startedAt.getTime() +
            session.question_time * 1000
        );

        return {
            sessionId,

            question: {
                id: question.id,
                questionText: question.question_text,
                questionType: question.question_type,
                answerType: question.answer_type,
                points: question.points,
                questionOrder: question.question_order,
                file,
                answers: answersResult.rows
            },

            questionNumber: questionIndex + 1,

            totalQuestions:
                questionsResult.rows.length,

            time: session.question_time,

            startedAt: startedAt.toISOString(),

            endsAt: endsAt.toISOString()
        };
    }
    
    async function startQuestionForSession(
        sessionId, 
        questionIndex, 
        expectedPreviousIndex = null
    ) {
        const questionData = await getQuestionForSession(
            sessionId,
            questionIndex
        );

        if (!questionData) {
            return false;
        }

        const updateResult = await pool.query(
            `
            UPDATE quiz_sessions
            SET
                current_question_index = $1,
                current_question_started_at = CURRENT_TIMESTAMP
            WHERE id = $2
            AND status = 'started'
            AND current_question_index IS NOT DISTINCT FROM $3
            RETURNING
                id,
                current_question_index,
                current_question_started_at
            `,
            [questionIndex, sessionId, expectedPreviousIndex]
        );

        if (updateResult.rows.length === 0) {
            return false;
        }

        const startedAt = new Date(
            updateResult.rows[0].current_question_started_at
        );

        const endsAt = new Date(
            startedAt.getTime() + questionData.time * 1000
        );

        sendToSession(sessionId, {
            type: "question_started",
            sessionId,
            question: questionData.question,
            questionNumber: questionData.questionNumber,
            totalQuestions: questionData.totalQuestions,
            time: questionData.time,
            startedAt: startedAt.toISOString(),
            endsAt: endsAt.toISOString()
        });

        // Отменяем предыдущий таймер этой сессии
        if (questionTimers.has(sessionId)) {
            clearTimeout(questionTimers.get(sessionId));
        }

        const timer = setTimeout(async () => {
            if (questionTimers.get(sessionId) !== timer) {
                return;
            }

            questionTimers.delete(sessionId);

            try {
                const result = await pool.query(
                    `
                    SELECT status, current_question_index
                    FROM quiz_sessions
                    WHERE id = $1
                    `,
                    [sessionId]
                );

                if (result.rows.length === 0) {
                    return;
                }

                const session = result.rows[0];

                // Сессия завершена или вопрос уже сменился.
                if (
                    session.status !== "started" ||
                    Number(session.current_question_index) !== questionIndex
                ) {
                    return;
                }

                sendToSession(sessionId, {
                    type: "question_finished",
                    sessionId,
                    questionIndex
                });

                await advanceQuestion(sessionId, questionIndex);
            } catch (error) {
                console.error(
                    "Ошибка при автоматическом переходе:",
                    error
                );
            }
        }, questionData.time * 1000);

        questionTimers.set(sessionId, timer);

        console.log(
            `Session ${sessionId}: question ${questionIndex + 1}`
        );

        return true;
    }

    async function advanceQuestion(sessionId, finishedIndex) {
        try {
            // Проверяем, не запустил ли организатор другой вопрос
            const sessionResult = await pool.query(
                `
                SELECT
                    status,
                    current_question_index
                FROM quiz_sessions
                WHERE id = $1
                `,
                [sessionId]
            );

            if (sessionResult.rows.length === 0) {
                return;
            }

            const session = sessionResult.rows[0];

            if (
                session.status !== "started" ||
                Number(session.current_question_index) !== finishedIndex
            ) {
                return;
            }

            const nextIndex = finishedIndex + 1;

            const started = await startQuestionForSession(
                sessionId,
                nextIndex,
                finishedIndex
            );

            if (started) {
                return;
            }

            // Следующего вопроса нет — завершаем сессию
            const finishResult = await pool.query(
                `
                UPDATE quiz_sessions
                SET
                    status = 'finished',
                    current_question_index = NULL,
                    current_question_started_at = NULL
                WHERE id = $1
                  AND status = 'started'
                  AND current_question_index = $2
                RETURNING id
                `,
                [sessionId, finishedIndex]
            );

            if (finishResult.rows.length > 0) {
                sendToSession(sessionId, {
                    type: "session_finished",
                    sessionId,
                    message: "Все вопросы завершены"
                });

                console.log(
                    `Session ${sessionId}: quiz finished`
                );
            }
        } catch (error) {
            console.error(
                `Ошибка перехода к следующему вопросу сессии ${sessionId}:`,
                error
            );
        }
    }

    wss.on("connection", (ws) => {
        console.log("WebSocket клиент подключился");

        ws.user = null;
        ws.sessionId = null;

        ws.send(JSON.stringify({
            type: "connected",
            message: "WebSocket подключен"
        }));

        ws.on("message", async (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === "auth") {
                    if (!data.token) {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "JWT токен не передан"
                        }));

                        return;
                    }

                    try {
                        const decoded = jwt.verify(
                            data.token,
                            process.env.JWT_SECRET
                        );

                        const userResult = await pool.query(
                            `
                            SELECT id, username, role
                            FROM users
                            WHERE id = $1
                            `,
                            [decoded.id]
                        );

                        if (userResult.rows.length === 0) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Пользователь не найден"
                            }));

                            return;
                        }

                        ws.user = userResult.rows[0];

                        ws.send(JSON.stringify({
                            type: "authenticated",
                            user: {
                                id: ws.user.id,
                                username: ws.user.username,
                                role: ws.user.role
                            }
                        }));

                        console.log(
                            `WebSocket авторизация: user ${ws.user.id}`
                        );

                    } catch (error) {
                        console.error("Ошибка WebSocket авторизации:", error);

                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Недействительный JWT токен"
                        }));
                    }

                    return;
                }

                if (!ws.user) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Сначала необходимо авторизоваться"
                    }));

                    return;
                }

                if (data.type === "join_session") {
                    const sessionId = Number(data.sessionId);

                    if (!Number.isInteger(sessionId)) {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Некорректный sessionId"
                        }));

                        return;
                    }

                    const sessionResult = await pool.query(
                        `
                        SELECT
                            id,
                            quiz_id,
                            room_code,
                            status
                        FROM quiz_sessions
                        WHERE id = $1
                        `,
                        [sessionId]
                    );

                    if (sessionResult.rows.length === 0) {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Сессия не найдена"
                        }));

                        return;
                    }

                    const session = sessionResult.rows[0];

                    if (session.status === "finished") {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Сессия уже завершена"
                        }));

                        return;
                    }

                    if (ws.user.role === "participant") {
                        const participantResult =
                            await pool.query(
                                `
                                SELECT id
                                FROM participants
                                WHERE session_id = $1
                                  AND user_id = $2
                                `,
                                [
                                    sessionId,
                                    ws.user.id
                                ]
                            );

                        if (participantResult.rows.length === 0) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message:
                                    "Вы не являетесь участником этой сессии"
                            }));

                            return;
                        }
                    }

                    if (ws.user.role === "organizer") {
                        const organizerResult =
                            await pool.query(
                                `
                                SELECT id
                                FROM quizzes
                                WHERE id = $1
                                  AND organizer_id = $2
                                `,
                                [
                                    session.quiz_id,
                                    ws.user.id
                                ]
                            );

                        if (organizerResult.rows.length === 0) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message:
                                    "Вы не являетесь организатором этой сессии"
                            }));

                            return;
                        }
                    }

                    if (ws.sessionId !== null) {
                        removeClientFromSession(
                            ws.sessionId,
                            ws
                        );
                    }

                    ws.sessionId = sessionId;

                    addClientToSession(
                        sessionId,
                        ws
                    );

                    ws.send(JSON.stringify({
                        type: "session_joined",
                        session: {
                            id: session.id,
                            quiz_id: session.quiz_id,
                            room_code: session.room_code,
                            status: session.status
                        }
                    }));

                    // Отправляем новому клиенту список уже подключённых пользователей
                    const roomClients = sessions.get(sessionId) || new Set();

                    const participants = [
                        ...new Map(
                            [...roomClients]
                                .filter(
                                    (client) =>
                                        client.readyState === WebSocket.OPEN &&
                                        client.user
                                )
                                .map((client) => [
                                    client.user.id,
                                    {
                                        userId: client.user.id,
                                        username: client.user.username,
                                        role: client.user.role
                                    }
                                ])
                        ).values()
                    ];

                    ws.send(JSON.stringify({
                        type: "participants_list",
                        participants
                    }));

                    const currentResult = await pool.query(
                        `
                        SELECT
                            qs.status,
                            qs.current_question_index,
                            qs.current_question_started_at,
                            q.question_time
                        FROM quiz_sessions qs
                        JOIN quizzes q ON q.id = qs.quiz_id
                        WHERE qs.id = $1
                        `,
                        [sessionId]
                    );

                    if (currentResult.rows.length > 0) {
                        const current = currentResult.rows[0];

                        if (
                            current.status === "started" &&
                            current.current_question_index !== null &&
                            current.current_question_started_at !== null
                        ) {
                            const startedAt = new Date(
                                current.current_question_started_at
                            );

                            const endsAt = new Date(
                                startedAt.getTime() +
                                Number(current.question_time) * 1000
                            );

                            const timeLeft = Math.max(
                                0,
                                Math.ceil((endsAt.getTime() - Date.now()) / 1000)
                            );

                            if (timeLeft > 0) {
                                const questionData = await getQuestionForSession(
                                    sessionId,
                                    Number(current.current_question_index)
                                );

                                ws.send(JSON.stringify({
                                    type: "question_started",
                                    ...questionData,
                                    startedAt: startedAt.toISOString(),
                                    endsAt: endsAt.toISOString(),
                                    timeLeft
                                }));
                            } else {
                                ws.send(JSON.stringify({
                                    type: "question_finished",
                                    sessionId,
                                    questionIndex: Number(
                                        current.current_question_index
                                    )
                                }));
                            }
                        }
                    }

                    sendToSession(sessionId, {
                        type: "participant_connected",
                        userId: ws.user.id,
                        username: ws.user.username,
                        role: ws.user.role
                    });

                    console.log(
                        `User ${ws.user.id} подключился к session ${sessionId}`
                    );

                    return;
                }

                if (data.type === "start_question") {
                    if (ws.user.role !== "organizer") {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Только организатор может запускать вопрос"
                        }));
                        return;
                    }

                    if (ws.sessionId === null) {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Сначала подключитесь к сессии"
                        }));
                        return;
                    }

                    const questionIndex = Number(data.questionIndex);

                    if (
                        !Number.isInteger(questionIndex) ||
                        questionIndex < 0
                    ) {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Некорректный номер вопроса"
                        }));
                        return;
                    }

                    try {
                        const sessionResult = await pool.query(
                            `
                            SELECT
                                qs.id,
                                qs.status,
                                qs.current_question_index,
                                qs.current_question_started_at
                            FROM quiz_sessions qs
                            JOIN quizzes q ON q.id = qs.quiz_id
                            WHERE qs.id = $1
                            AND q.organizer_id = $2
                            AND qs.status = 'started'
                            `,
                            [ws.sessionId, ws.user.id]
                        );

                        if (sessionResult.rows.length === 0) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Сессия не найдена, не запущена или у вас нет прав"
                            }));
                            return;
                        }

                        const session = sessionResult.rows[0];

                        if (
                            session.current_question_index !== null ||
                            session.current_question_started_at !== null
                        ) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Вопрос уже запускался. Повторный запуск запрещён"
                            }));
                            return;
                        }

                        if (questionIndex !== 0) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Начать можно только с первого вопроса"
                            }));
                            return;
                        }

                        const started = await startQuestionForSession(
                            ws.sessionId,
                            questionIndex
                        );

                        if (!started) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Вопрос не найден"
                            }));
                        }
                    } catch (error) {
                        console.error(
                            "Ошибка запуска вопроса:",
                            error
                        );

                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Не удалось запустить вопрос"
                        }));
                    }

                    return;
                }

                if (data.type === "submit_answer") {
                    try {
                        if (!ws.user) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Необходима авторизация"
                            }));

                            return;
                        }

                        if (ws.user.role !== "participant") {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Только участник может отправлять ответы"
                            }));

                            return;
                        }

                        if (!ws.sessionId) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Вы не подключены к сессии"
                            }));

                            return;
                        }

                        const questionId =
                            Number(data.questionId);

                        const answerIds =
                            data.answerIds;

                        if (!Number.isInteger(questionId)) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Некорректный questionId"
                            }));

                            return;
                        }

                        if (!Array.isArray(answerIds)) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "answerIds должен быть массивом"
                            }));

                            return;
                        }

                        const result =
                            await sessionService.submitAnswer(
                                ws.sessionId,
                                ws.user.id,
                                questionId,
                                answerIds
                            );

                        ws.send(JSON.stringify({
                            type: "answer_submitted",

                            sessionId: ws.sessionId,

                            questionId: result.questionId,

                            isCorrect: result.isCorrect,

                            points: result.points
                        }));

                        await sendAnswerProgress(
                            ws.sessionId,
                            questionId
                        );

                    } catch (error) {
                        console.error(
                            "Ошибка отправки ответа через WebSocket:",
                            error
                        );

                        ws.send(JSON.stringify({
                            type: "error",
                            message: error.message
                        }));
                    }

                    return;
                }

                ws.send(JSON.stringify({
                    type: "error",
                    message: "Неизвестный тип сообщения"
                }));

            } catch (error) {
                console.error(
                    "WebSocket ошибка:",
                    error
                );

                ws.send(JSON.stringify({
                    type: "error",
                    message: "Ошибка обработки сообщения"
                }));
            }
        });

        ws.on("close", () => {
            if (ws.sessionId !== null) {
                removeClientFromSession(
                    ws.sessionId,
                    ws
                );

                sendToSession(ws.sessionId, {
                    type: "participant_disconnected",
                    userId: ws.user?.id
                });
            }

            console.log(
                `WebSocket клиент отключился: user ${
                    ws.user
                        ? ws.user.id
                        : "не авторизован"
                }`
            );
        });

        ws.on("error", (error) => {
            console.error(
                "WebSocket ошибка:",
                error.message
            );
        });
    });

    console.log(
        "WebSocket сервер запущен: /ws"
    );

    return wss;
}

module.exports = setupQuizSocket;