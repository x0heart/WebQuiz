const pool = require("../config/database");

async function createQuiz(
    organizerId,
    title,
    description,
    categoryId,
    questionTime
){
    const result = await pool.query(
        `
        INSERT INTO quizzes
        (
            organizer_id,
            category_id,
            title,
            description,
            question_time
        )

        VALUES
        ($1,$2,$3,$4,$5)

        RETURNING *
        `,
        [
            organizerId,
            categoryId,
            title,
            description,
            questionTime
        ]
    );

    return result.rows[0];
}

async function getQuizzesByOrganizer(organizerId) {
    const result = await pool.query(
        `
        SELECT
            q.id,
            q.title,
            q.description,
            q.question_time,
            q.is_active,
            q.created_at,
            q.category_id,
            c.name AS category_name,
            COUNT(qu.id) AS question_count

        FROM quizzes q

        LEFT JOIN categories c
            ON c.id = q.category_id

        LEFT JOIN questions qu
            ON qu.quiz_id = q.id

        WHERE q.organizer_id = $1

        GROUP BY
            q.id,
            c.name

        ORDER BY q.created_at DESC
        `,
        [organizerId]
    );

    return result.rows;
}

// Получение одного квиза организатора
async function getQuizById(quizId, organizerId) {

    // Получаем сам квиз
    const quizResult = await pool.query(
        `
        SELECT
            q.id,
            q.title,
            q.description,
            q.question_time,
            q.is_active,
            q.created_at,
            q.category_id,
            c.name AS category_name

        FROM quizzes q

        LEFT JOIN categories c
            ON c.id = q.category_id

        WHERE q.id = $1
          AND q.organizer_id = $2
        `,
        [quizId, organizerId]
    );

    if (quizResult.rows.length === 0) {
        return null;
    }

    const quiz = quizResult.rows[0];

    // Получаем вопросы
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
        [quizId]
    );

    const questions = questionsResult.rows;

    // Для каждого вопроса получаем варианты ответов
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

        if (question.file_id) {
            question.file = {
                id: question.file_id,
                originalName: question.original_name,
                storedName: question.stored_name,
                mimeType: question.mime_type,
                url: `/uploads/${question.stored_name}`
            };
        } else {
            question.file = null;
        }

        delete question.original_name;
        delete question.stored_name;
        delete question.mime_type;

        question.answers = answersResult.rows;
    }

    quiz.questions = questions;

    return quiz;
}

async function updateQuiz(
    quizId,
    organizerId,
    title,
    description,
    categoryId,
    questionTime,
    isActive
) {
    const result = await pool.query(
        `
        UPDATE quizzes
        SET
            title = $1,
            description = $2,
            category_id = $3,
            question_time = $4,
            is_active = COALESCE($5, is_active)
        WHERE id = $6
          AND organizer_id = $7
        RETURNING *
        `,
        [
            title,
            description,
            categoryId,
            questionTime,
            isActive ?? null,
            quizId,
            organizerId
        ]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

async function deleteQuiz(
    quizId,
    organizerId
) {
    const result = await pool.query(
        `
        DELETE FROM quizzes
        WHERE id = $1
          AND organizer_id = $2
        RETURNING id
        `,
        [quizId, organizerId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

module.exports = {
    createQuiz,
    getQuizzesByOrganizer,
    getQuizById,
    updateQuiz,
    deleteQuiz
};