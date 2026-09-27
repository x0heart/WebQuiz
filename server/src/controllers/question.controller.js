const questionService =
    require("../services/question.service");

async function createQuestion(req, res) {

    try {

        const quizId = Number(req.params.id);
        const organizerId = req.user.id;

        const {
            questionText,
            questionType,
            answerType,
            points,
            questionOrder,
            fileId,
            answers
        } = req.body;

        if (!questionText) {
            return res.status(400).json({
                message: "Текст вопроса обязателен"
            });
        }

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({
                message: "Необходимо указать варианты ответов"
            });
        }

        const question =
            await questionService.createQuestion(
                quizId,
                organizerId,
                questionText,
                questionType,
                answerType,
                points,
                questionOrder,
                fileId,
                answers
            );

        if (!question) {
            return res.status(404).json({
                message: "Квиз не найден"
            });
        }

        res.status(201).json({
            message: "Вопрос создан",
            question
        });

    }
    catch (error) {

        console.error(
            "Ошибка создания вопроса:",
            error
        );

        res.status(400).json({
            message: error.message
        });
    }
}

async function getQuestionsByQuiz(req, res) {

    try {

        const quizId = Number(req.params.id);
        const organizerId = req.user.id;

        if (!Number.isInteger(quizId) || quizId <= 0) {
            return res.status(400).json({
                message: "Некорректный ID квиза"
            });
        }

        const questions =
            await questionService.getQuestionsByQuiz(
                quizId,
                organizerId
            );

        if (questions === null) {
            return res.status(404).json({
                message: "Квиз не найден"
            });
        }

        res.json({
            questions
        });

    }
    catch (error) {

        console.error(
            "Ошибка получения вопросов:",
            error
        );

        res.status(500).json({
            message: "Ошибка получения вопросов"
        });
    }
}

async function updateQuestion(req, res) {

    try {

        const quizId = Number(req.params.quizId);
        const questionId = Number(req.params.questionId);
        const organizerId = req.user.id;

        const {
            questionText,
            questionType,
            answerType,
            points,
            questionOrder,
            fileId,
            answers
        } = req.body;

        if (!Number.isInteger(quizId) || quizId <= 0) {
            return res.status(400).json({
                message: "Некорректный ID квиза"
            });
        }

        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({
                message: "Некорректный ID вопроса"
            });
        }

        if (!questionText) {
            return res.status(400).json({
                message: "Текст вопроса обязателен"
            });
        }

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({
                message: "Необходимо указать варианты ответов"
            });
        }

        const question =
            await questionService.updateQuestion(
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
            );

        if (!question) {
            return res.status(404).json({
                message: "Квиз или вопрос не найден"
            });
        }

        res.json({
            message: "Вопрос обновлен",
            question
        });

    }
    catch (error) {

        console.error(
            "Ошибка обновления вопроса:",
            error
        );

        res.status(400).json({
            message: error.message
        });
    }
}

async function deleteQuestion(req, res) {

    try {

        const quizId = Number(req.params.quizId);
        const questionId = Number(req.params.questionId);

        const organizerId = req.user.id;

        if (!Number.isInteger(quizId) || quizId <= 0) {
            return res.status(400).json({
                message: "Некорректный ID квиза"
            });
        }

        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({
                message: "Некорректный ID вопроса"
            });
        }

        const question =
            await questionService.deleteQuestion(
                quizId,
                questionId,
                organizerId
            );

        if (!question) {
            return res.status(404).json({
                message: "Квиз или вопрос не найден"
            });
        }

        res.json({
            message: "Вопрос удален"
        });

    }
    catch (error) {

        console.error(
            "Ошибка удаления вопроса:",
            error
        );

        res.status(500).json({
            message: "Ошибка удаления вопроса"
        });
    }
}

module.exports = {
    createQuestion,
    getQuestionsByQuiz,
    updateQuestion,
    deleteQuestion
};