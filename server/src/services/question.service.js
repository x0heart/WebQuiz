const pool = require("../config/database");

const fileService =
    require("./file.service");

async function validateQuestion(
    questionType,
    answerType,
    points,
    fileId,
    answers
) {
    // Проверка типа вопроса
    if (!["text", "image"].includes(questionType)) {
        throw new Error(
            "Тип вопроса должен быть text или image"
        );
    }

    // Проверка типа ответа
    if (!["single", "multiple"].includes(answerType)) {
        throw new Error(
            "Тип ответа должен быть single или multiple"
        );
    }

    // Проверка баллов
    if (!Number.isInteger(points) || points <= 0) {
        throw new Error(
            "Количество баллов должно быть положительным целым числом"
        );
    }

    // Проверка ответов
    if (!Array.isArray(answers) || answers.length === 0) {
        throw new Error(
            "У вопроса должен быть хотя бы один ответ"
        );
    }

    const correctAnswers =
        answers.filter(
            answer => answer.isCorrect === true
        );

    // Для single должен быть ровно один правильный
    if (
        answerType === "single" &&
        correctAnswers.length !== 1
    ) {
        throw new Error(
            "Для single-вопроса должен быть ровно один правильный ответ"
        );
    }

    // Для multiple должен быть хотя бы один правильный
    if (
        answerType === "multiple" &&
        correctAnswers.length === 0
    ) {
        throw new Error(
            "Для multiple-вопроса должен быть хотя бы один правильный ответ"
        );
    }

    // Проверка файла
    if (questionType === "image") {

        if (!fileId) {
            throw new Error(
                "Для image-вопроса необходимо указать fileId"
            );
        }

        const fileResult = await pool.query(
            `
            SELECT id
            FROM files
            WHERE id = $1
            `,
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            throw new Error(
                "Указанный файл не существует"
            );
        }
    }

    // Для текстового вопроса файл не нужен
    if (questionType === "text" && fileId) {
        throw new Error(
            "Для text-вопроса fileId должен быть null"
        );
    }
}

async function createQuestion(
    quizId,
    organizerId,
    questionText,
    questionType,
    answerType,
    points,
    questionOrder,
    fileId,
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

    await validateQuestion(
        questionType,
        answerType,
        points,
        fileId,
        answers
    );

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
            question_order,
            file_id
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
            quizId,
            questionText,
            questionType,
            answerType,
            points,
            questionOrder,
            fileId || null
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

    for (const question of questions) {

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
    fileId,
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

    await validateQuestion(
        questionType,
        answerType,
        points,
        fileId,
        answers
    );

    const oldQuestionResult = await pool.query(
        `
        SELECT file_id
        FROM questions
        WHERE id = $1
        AND quiz_id = $2
        `,
        [questionId, quizId]
    );

    if (oldQuestionResult.rows.length === 0) {
        return null;
    }

    const oldFileId = oldQuestionResult.rows[0].file_id;    

    // Обновляем вопрос
    const updateResult = await pool.query(
        `
        UPDATE questions
        SET
            question_text = $1,
            question_type = $2,
            answer_type = $3,
            points = $4,
            question_order = $5,
            file_id = $6
        WHERE id = $7
          AND quiz_id = $8
        RETURNING *
        `,
        [
            questionText,
            questionType,
            answerType,
            points,
            questionOrder,
            fileId || null,
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
    
    if (
        oldFileId &&
        oldFileId !== (fileId || null)
    ) {
        await fileService.deleteFileIfUnused(
            oldFileId
        );
    }

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

    const questionResult = await pool.query(
        `
        SELECT file_id
        FROM questions
        WHERE id = $1
        AND quiz_id = $2
        `,
        [questionId, quizId]
    );

    if (questionResult.rows.length === 0) {
        return null;
    }

    const fileId = questionResult.rows[0].file_id;

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

    if (fileId) {
        await fileService.deleteFileIfUnused(fileId);
    }

    return result.rows[0];
}

module.exports = {
    createQuestion,
    getQuestionsByQuiz,
    updateQuestion,
    deleteQuestion
};