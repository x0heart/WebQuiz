const pool = require("../config/database");

async function createQuestion(
    quizId,
    organizerId,
    questionText,
    questionType,
    answerType,
    points,
    questionOrder,
    answers
) {
    // Проверяем, что квиз принадлежит организатору
    const quizResult = await pool.query(
        `
        SELECT id
        FROM quizzes
        WHERE id = $1
          AND organizer_id = $2
        `,
        [quizId, organizerId]
    );

    if (quizResult.rows.length === 0) {
        return null;
    }

    // Создаем вопрос
    const questionResult = await pool.query(
        `
        INSERT INTO questions
        (
            quiz_id,
            question_text,
            question_type,
            answer_type,
            points,
            question_order
        )
        VALUES
        ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
            quizId,
            questionText,
            questionType,
            answerType,
            points,
            questionOrder
        ]
    );

    const question = questionResult.rows[0];

    // Создаем варианты ответов
    for (const answer of answers) {

        await pool.query(
            `
            INSERT INTO answers
            (
                question_id,
                answer_text,
                is_correct
            )
            VALUES
            ($1, $2, $3)
            `,
            [
                question.id,
                answer.answerText,
                answer.isCorrect
            ]
        );
    }

    // Получаем созданные ответы
    const answersResult = await pool.query(
        `
        SELECT
            id,
            answer_text,
            is_correct
        FROM answers
        WHERE question_id = $1
        ORDER BY id
        `,
        [question.id]
    );

    question.answers = answersResult.rows;

    return question;
}

async function getQuestionsByQuiz(quizId, organizerId) {

    // Проверяем, что квиз принадлежит организатору
    const quizResult = await pool.query(
        `
        SELECT id
        FROM quizzes
        WHERE id = $1
          AND organizer_id = $2
        `,
        [quizId, organizerId]
    );

    if (quizResult.rows.length === 0) {
        return null;
    }

    // Получаем вопросы
    const questionsResult = await pool.query(
        `
        SELECT
            id,
            question_text,
            question_type,
            answer_type,
            points,
            question_order
        FROM questions
        WHERE quiz_id = $1
        ORDER BY question_order
        `,
        [quizId]
    );

    const questions = questionsResult.rows;

    // Получаем ответы для каждого вопроса
    for (const question of questions) {

        const answersResult = await pool.query(
            `
            SELECT
                id,
                answer_text,
                is_correct
            FROM answers
            WHERE question_id = $1
            ORDER BY id
            `,
            [question.id]
        );

        question.answers = answersResult.rows;
    }

    return questions;
}

async function updateQuestion(
    quizId,
    questionId,
    organizerId,
    questionText,
    questionType,
    answerType,
    points,
    questionOrder,
    answers
) {
    // Проверяем принадлежность квиза организатору
    const quizResult = await pool.query(
        `
        SELECT id
        FROM quizzes
        WHERE id = $1
          AND organizer_id = $2
        `,
        [quizId, organizerId]
    );

    if (quizResult.rows.length === 0) {
        return null;
    }

    // Проверяем существование вопроса
    const questionResult = await pool.query(
        `
        SELECT id
        FROM questions
        WHERE id = $1
          AND quiz_id = $2
        `,
        [questionId, quizId]
    );

    if (questionResult.rows.length === 0) {
        return null;
    }

    // Обновляем вопрос
    const updateResult = await pool.query(
        `
        UPDATE questions
        SET
            question_text = $1,
            question_type = $2,
            answer_type = $3,
            points = $4,
            question_order = $5
        WHERE id = $6
          AND quiz_id = $7
        RETURNING *
        `,
        [
            questionText,
            questionType,
            answerType,
            points,
            questionOrder,
            questionId,
            quizId
        ]
    );

    // Удаляем старые варианты ответов
    await pool.query(
        `
        DELETE FROM answers
        WHERE question_id = $1
        `,
        [questionId]
    );

    // Добавляем новые варианты
    for (const answer of answers) {

        await pool.query(
            `
            INSERT INTO answers
            (
                question_id,
                answer_text,
                is_correct
            )
            VALUES
            ($1, $2, $3)
            `,
            [
                questionId,
                answer.answerText,
                answer.isCorrect
            ]
        );
    }

    // Получаем обновленные ответы
    const answersResult = await pool.query(
        `
        SELECT
            id,
            answer_text,
            is_correct
        FROM answers
        WHERE question_id = $1
        ORDER BY id
        `,
        [questionId]
    );

    const question = updateResult.rows[0];

    question.answers = answersResult.rows;

    return question;
}

async function deleteQuestion(
    quizId,
    questionId,
    organizerId
) {
    // Проверяем, что квиз принадлежит организатору
    const quizResult = await pool.query(
        `
        SELECT id
        FROM quizzes
        WHERE id = $1
          AND organizer_id = $2
        `,
        [quizId, organizerId]
    );

    if (quizResult.rows.length === 0) {
        return null;
    }

    // Удаляем вопрос
    const result = await pool.query(
        `
        DELETE FROM questions
        WHERE id = $1
          AND quiz_id = $2
        RETURNING id
        `,
        [questionId, quizId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

module.exports = {
    createQuestion,
    getQuestionsByQuiz,
    updateQuestion,
    deleteQuestion
};