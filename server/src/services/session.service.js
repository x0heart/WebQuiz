const pool = require("../config/database");

function generateRoomCode(length = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < length; i++) {
        code += chars[
            Math.floor(Math.random() * chars.length)
        ];
    }

    return code;
}

async function createSession(quizId, organizerId) {

    // Проверяем, что квиз принадлежит организатору
    const quizResult = await pool.query(
        `
        SELECT
            id,
            title,
            is_active
        FROM quizzes
        WHERE id = $1
          AND organizer_id = $2
        `,
        [quizId, organizerId]
    );

    if (quizResult.rows.length === 0) {
        throw new Error("Квиз не найден");
    }

    const quiz = quizResult.rows[0];

    if (!quiz.is_active) {
        throw new Error("Квиз неактивен");
    }

    // Проверяем, нет ли уже активной сессии
    const activeSessionResult = await pool.query(
        `
        SELECT
            id,
            room_code,
            status
        FROM quiz_sessions
        WHERE quiz_id = $1
          AND status IN ('waiting', 'started')
        `,
        [quizId]
    );

    if (activeSessionResult.rows.length > 0) {
        throw new Error(
            "Для этого квиза уже существует активная сессия"
        );
    }

    // Генерируем уникальный room_code
    let roomCode;
    let session;

    for (let attempt = 0; attempt < 10; attempt++) {
        roomCode = generateRoomCode();
        try {
            const result = await pool.query(
                `
                INSERT INTO quiz_sessions
                (
                    quiz_id,
                    room_code,
                    status
                )
                VALUES
                ($1, $2, 'waiting')
                RETURNING
                    id,
                    quiz_id,
                    room_code,
                    status,
                    started_at,
                    finished_at
                `,
                [quizId, roomCode]
            );

            session = result.rows[0];

            break;
        } catch (error) {
            // UNIQUE violation для room_code
            if (error.code !== "23505") {
                throw error;
            }
        }
    }

    if (!session) {
        throw new Error(
            "Не удалось создать уникальный код комнаты"
        );
    }

    return session;
}

async function startSession(sessionId, organizerId) {

    // Проверяем, что сессия существует
    // и принадлежит квизу этого организатора
    const sessionResult = await pool.query(
        `
        SELECT
            qs.id,
            qs.quiz_id,
            qs.room_code,
            qs.status
        FROM quiz_sessions qs
        JOIN quizzes q
            ON q.id = qs.quiz_id
        WHERE qs.id = $1
          AND q.organizer_id = $2
        `,
        [sessionId, organizerId]
    );

    if (sessionResult.rows.length === 0) {
        throw new Error("Сессия не найдена");
    }

    const session = sessionResult.rows[0];

    if (session.status !== "waiting") {
        throw new Error(
            "Запустить можно только сессию со статусом waiting"
        );
    }

    const result = await pool.query(
        `
        UPDATE quiz_sessions
        SET status = 'started'
        WHERE id = $1
        RETURNING
            id,
            quiz_id,
            room_code,
            status,
            started_at,
            finished_at
        `,
        [sessionId]
    );

    return result.rows[0];
}

async function finishSession(sessionId, organizerId) {
    const sessionResult = await pool.query(
        `
        SELECT
            qs.id,
            qs.quiz_id,
            qs.room_code,
            qs.status
        FROM quiz_sessions qs
        JOIN quizzes q
            ON q.id = qs.quiz_id
        WHERE qs.id = $1
          AND q.organizer_id = $2
        `,
        [sessionId, organizerId]
    );

    if (sessionResult.rows.length === 0) {
        throw new Error("Сессия не найдена");
    }

    const session = sessionResult.rows[0];

    if (session.status !== "started") {
        throw new Error(
            "Завершить можно только запущенную сессию"
        );
    }

    const result = await pool.query(
        `
        UPDATE quiz_sessions
        SET status = 'finished'
        WHERE id = $1
        RETURNING
            id,
            quiz_id,
            room_code,
            status,
            started_at,
            finished_at
        `,
        [sessionId]
    );

    return result.rows[0];
}

async function joinSession(roomCode, userId) {
    const sessionResult = await pool.query(
        `
        SELECT
            qs.id,
            qs.quiz_id,
            qs.room_code,
            qs.status
        FROM quiz_sessions qs
        WHERE qs.room_code = $1
        `,
        [roomCode]
    );

    if (sessionResult.rows.length === 0) {
        throw new Error("Сессия не найдена");
    }

    const session = sessionResult.rows[0];

    if (
        session.status !== "waiting" &&
        session.status !== "started"
    ) {
        throw new Error(
            "К этой сессии нельзя подключиться"
        );
    }

    // Проверяем, не подключён ли уже участник
    const existingParticipant =
        await pool.query(
            `
            SELECT
                id,
                session_id,
                user_id,
                joined_at,
                score
            FROM participants
            WHERE session_id = $1
              AND user_id = $2
            `,
            [
                session.id,
                userId
            ]
        );

    if (existingParticipant.rows.length > 0) {
        return {
            session,
            participant: existingParticipant.rows[0],
            alreadyJoined: true
        };
    }

    const participantResult =
        await pool.query(
            `
            INSERT INTO participants
            (
                session_id,
                user_id
            )
            VALUES
            ($1, $2)
            RETURNING
                id,
                session_id,
                user_id,
                joined_at,
                score
            `,
            [
                session.id,
                userId
            ]
        );

    return {
        session,
        participant: participantResult.rows[0],
        alreadyJoined: false
    };
}

async function getSessionParticipants(
    sessionId,
    organizerId
) {
    const sessionResult = await pool.query(
        `
        SELECT
            qs.id,
            qs.quiz_id,
            qs.room_code,
            qs.status
        FROM quiz_sessions qs
        JOIN quizzes q
            ON q.id = qs.quiz_id
        WHERE qs.id = $1
          AND q.organizer_id = $2
        `,
        [sessionId, organizerId]
    );

    if (sessionResult.rows.length === 0) {
        throw new Error("Сессия не найдена");
    }

    const participantsResult =
        await pool.query(
            `
            SELECT
                p.id,
                p.user_id,
                u.username,
                p.joined_at,
                p.score
            FROM participants p
            JOIN users u
                ON u.id = p.user_id
            WHERE p.session_id = $1
            ORDER BY p.joined_at
            `,
            [sessionId]
        );

    return {
        session: sessionResult.rows[0],
        participants: participantsResult.rows
    };
}

async function getCurrentQuestion(sessionId, userId) {
    const participantResult = await pool.query(
        `
        SELECT
            p.id AS participant_id,

            qs.id AS session_id,
            qs.quiz_id,
            qs.status,
            qs.current_question_index,
            qs.current_question_started_at,

            q.question_time

        FROM participants p

        JOIN quiz_sessions qs
            ON qs.id = p.session_id

        JOIN quizzes q
            ON q.id = qs.quiz_id

        WHERE p.session_id = $1
          AND p.user_id = $2
        `,
        [
            sessionId,
            userId
        ]
    );

    if (participantResult.rows.length === 0) {
        throw new Error(
            "Вы не являетесь участником этой сессии"
        );
    }

    const session = participantResult.rows[0];

    // Сессия должна быть запущена
    if (session.status !== "started") {

        if (session.status === "finished") {
            return {
                finished: true,
                message: "Сессия завершена"
            };
        }

        throw new Error(
            "Сессия еще не запущена"
        );
    }

    // Нет активного вопроса
    if (
        session.current_question_index === null ||
        session.current_question_started_at === null
    ) {
        return {
            finished: false,
            active: false,
            message: "Сейчас нет активного вопроса"
        };
    }

    // Получаем все вопросы квиза
    const questionsResult = await pool.query(
        `
        SELECT
            q.id,
            q.question_text,
            q.question_type,
            q.answer_type,
            q.points,
            q.question_order,

            f.id AS file_id,
            f.original_name,
            f.stored_name,
            f.file_path,
            f.mime_type

        FROM questions q

        LEFT JOIN files f
            ON f.id = q.file_id

        WHERE q.quiz_id = $1

        ORDER BY q.question_order
        `,
        [
            session.quiz_id
        ]
    );

    const questions = questionsResult.rows;

    if (questions.length === 0) {
        throw new Error(
            "В квизе нет вопросов"
        );
    }

    const currentQuestion =
        questions[session.current_question_index];

    // Индекс вышел за пределы массива
    if (!currentQuestion) {

        await pool.query(
            `
            UPDATE quiz_sessions
            SET
                status = 'finished',
                current_question_index = NULL,
                current_question_started_at = NULL
            WHERE id = $1
            `,
            [sessionId]
        );

        return {
            finished: true,
            message: "Все вопросы завершены"
        };
    }

    // Проверяем время вопроса
    const questionStartedAt =
        new Date(
            session.current_question_started_at
        );

    const endsAt =
        new Date(
            questionStartedAt.getTime() +
            session.question_time * 1000
        );

    const now = new Date();

    const timeLeft = Math.max(
        0,
        Math.ceil(
            (endsAt.getTime() - now.getTime()) / 1000
        )
    );

    // Если время истекло
    if (timeLeft <= 0) {

        return {
            finished: false,
            active: false,
            expired: true,
            questionId: currentQuestion.id,
            questionNumber:
                session.current_question_index + 1,
            message: "Время на вопрос истекло"
        };
    }

    // Получаем варианты ответов
    const answersResult = await pool.query(
        `
        SELECT
            id,
            answer_text
        FROM answers
        WHERE question_id = $1
        ORDER BY id
        `,
        [
            currentQuestion.id
        ]
    );

    return {
        finished: false,
        active: true,

        question: {
            id: currentQuestion.id,
            questionText: currentQuestion.question_text,
            questionType: currentQuestion.question_type,
            answerType: currentQuestion.answer_type,
            points: currentQuestion.points,

            file: currentQuestion.file_id
                ? {
                    id: currentQuestion.file_id,
                    originalName:
                        currentQuestion.original_name,
                    storedName:
                        currentQuestion.stored_name,
                    filePath:
                        currentQuestion.file_path,
                    mimeType:
                        currentQuestion.mime_type
                }
                : null,

            answers: answersResult.rows
        },

        questionNumber:
            session.current_question_index + 1,

        totalQuestions:
            questions.length,

        timeLeft,

        startedAt:
            questionStartedAt.toISOString(),

        endsAt:
            endsAt.toISOString()
    };
}

async function submitAnswer(
    sessionId,
    userId,
    questionId,
    answerIds
) {
    if (!Array.isArray(answerIds) || answerIds.length === 0) {
        throw new Error(
            "Необходимо указать хотя бы один ответ"
        );
    }

    const participantResult = await pool.query(
        `
        SELECT
            p.id AS participant_id,
            p.score,

            qs.id AS session_id,
            qs.quiz_id,
            qs.status,
            qs.current_question_index,
            qs.current_question_started_at,

            q.question_time

        FROM participants p

        JOIN quiz_sessions qs
            ON qs.id = p.session_id

        JOIN quizzes q
            ON q.id = qs.quiz_id

        WHERE p.session_id = $1
          AND p.user_id = $2
        `,
        [
            sessionId,
            userId
        ]
    );

    if (participantResult.rows.length === 0) {
        throw new Error(
            "Вы не являетесь участником этой сессии"
        );
    }

    const session = participantResult.rows[0];

    if (session.status !== "started") {
        throw new Error(
            "Сессия не запущена"
        );
    }

    if (
        session.current_question_index === null ||
        session.current_question_started_at === null
    ) {
        throw new Error(
            "Сейчас нет активного вопроса"
        );
    }

    const questionsResult = await pool.query(
        `
        SELECT
            id,
            answer_type,
            points,
            question_order
        FROM questions
        WHERE quiz_id = $1
        ORDER BY question_order
        `,
        [session.quiz_id]
    );

    if (questionsResult.rows.length === 0) {
        throw new Error(
            "В квизе нет вопросов"
        );
    }

    const currentQuestion =
        questionsResult.rows[
            session.current_question_index
        ];

    if (!currentQuestion) {
        throw new Error(
            "Текущий вопрос не найден"
        );
    }

    if (
        Number(questionId) !==
        Number(currentQuestion.id)
    ) {
        throw new Error(
            "Сейчас активен другой вопрос"
        );
    }

    const questionStartedAt =
        new Date(
            session.current_question_started_at
        );

    const elapsedSeconds =
        Math.floor(
            (
                Date.now() -
                questionStartedAt.getTime()
            ) / 1000
        );

    if (
        elapsedSeconds >=
        session.question_time
    ) {
        throw new Error(
            "Время на ответ истекло"
        );
    }

    const answersResult = await pool.query(
        `
        SELECT
            id,
            is_correct
        FROM answers
        WHERE question_id = $1
          AND id = ANY($2::bigint[])
        `,
        [
            currentQuestion.id,
            answerIds
        ]
    );

    if (
        answersResult.rows.length !==
        answerIds.length
    ) {
        throw new Error(
            "Один или несколько ответов не принадлежат этому вопросу"
        );
    }

    if (
        currentQuestion.answer_type === "single" &&
        answerIds.length !== 1
    ) {
        throw new Error(
            "Для single-вопроса можно выбрать только один ответ"
        );
    }

    const existingAnswerResult = await pool.query(
        `
        SELECT id
        FROM participant_answers
        WHERE participant_id = $1
          AND question_id = $2
        LIMIT 1
        `,
        [
            session.participant_id,
            currentQuestion.id
        ]
    );

    if (existingAnswerResult.rows.length > 0) {
        throw new Error(
            "На этот вопрос вы уже ответили"
        );
    }

    let isCorrect = false;

    const correctAnswersResult = await pool.query(
        `
        SELECT id
        FROM answers
        WHERE question_id = $1
          AND is_correct = true
        `,
        [currentQuestion.id]
    );

    const correctAnswerIds =
        correctAnswersResult.rows
            .map(answer => Number(answer.id))
            .sort((a, b) => a - b);

    const selectedAnswerIds =
        answerIds
            .map(id => Number(id))
            .sort((a, b) => a - b);

    if (
        currentQuestion.answer_type === "single"
    ) {

        isCorrect =
            selectedAnswerIds.length === 1 &&
            correctAnswerIds.length === 1 &&
            selectedAnswerIds[0] === correctAnswerIds[0];

    } else if (
        currentQuestion.answer_type === "multiple"
    ) {

        isCorrect =
            selectedAnswerIds.length ===
            correctAnswerIds.length &&

            selectedAnswerIds.every(
                (id, index) =>
                    id === correctAnswerIds[index]
            );
    }

    for (const answerId of answerIds) {

        await pool.query(
            `
            INSERT INTO participant_answers
            (
                participant_id,
                question_id,
                answer_id
            )
            VALUES
            ($1, $2, $3)
            `,
            [
                session.participant_id,
                currentQuestion.id,
                answerId
            ]
        );
    }

    let points = 0;

    if (isCorrect) {

        points =
            currentQuestion.points;

        await pool.query(
            `
            UPDATE participants
            SET score = score + $1
            WHERE id = $2
            `,
            [
                points,
                session.participant_id
            ]
        );
    }

    return {
        questionId: currentQuestion.id,
        isCorrect,
        points
    };
}

module.exports = {
    createSession,
    startSession,
    joinSession,
    getSessionParticipants,
    getCurrentQuestion,
    submitAnswer,
    finishSession
};