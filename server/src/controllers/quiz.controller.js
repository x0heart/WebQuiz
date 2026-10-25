const quizService =
require("../services/quiz.service");

async function createQuiz(req,res){
    try{
        const {
            title,
            description,
            categoryId,
            questionTime
        } = req.body;

        const organizerId =
            req.user.id;

        const quiz =
            await quizService.createQuiz(
                organizerId,
                title,
                description,
                categoryId,
                questionTime
            );

        res.status(201).json({
            message:
            "Квиз создан",
            quiz
        });
    }
    catch(error){
        res.status(400).json({
            message:error.message
        });
    }
}

async function getMyQuizzes(req, res) {
    try {
        const organizerId = req.user.id;

        const quizzes =
            await quizService.getQuizzesByOrganizer(
                organizerId
            );

        res.json({
            quizzes
        });
    }
    catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Ошибка получения квизов"
        });
    }
}

async function getQuizById(req, res) {
    try {
        const quizId = req.params.id;
        const organizerId = req.user.id;

        const quiz =
            await quizService.getQuizById(
                quizId,
                organizerId
            );

        if (!quiz) {
            return res.status(404).json({
                message: "Квиз не найден"
            });
        }

        res.json({
            quiz
        });
    }
    catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Ошибка получения квиза"
        });
    }
}

async function updateQuiz(req, res) {
    try {
        const quizId = Number(req.params.id);
        const organizerId = req.user.id;

        if (!Number.isInteger(quizId) || quizId <= 0) {
            return res.status(400).json({
                message: "Некорректный ID квиза"
            });
        }

        const {
            title,
            description,
            categoryId,
            questionTime,
            isActive
        } = req.body;

        if (!title) {
            return res.status(400).json({
                message: "Название квиза обязательно"
            });
        }

        const quiz =
            await quizService.updateQuiz(
                quizId,
                organizerId,
                title,
                description,
                categoryId,
                questionTime,
                isActive
            );

        if (!quiz) {
            return res.status(404).json({
                message: "Квиз не найден"
            });
        }

        res.json({
            message: "Квиз обновлен",
            quiz
        });
    }
    catch (error) {
        console.error(
            "Ошибка обновления квиза:",
            error
        );

        res.status(400).json({
            message: error.message
        });
    }
}

async function deleteQuiz(req, res) {
    try {
        const quizId = Number(req.params.id);
        const organizerId = req.user.id;

        if (!Number.isInteger(quizId) || quizId <= 0) {
            return res.status(400).json({
                message: "Некорректный ID квиза"
            });
        }

        const quiz =
            await quizService.deleteQuiz(
                quizId,
                organizerId
            );

        if (!quiz) {
            return res.status(404).json({
                message: "Квиз не найден"
            });
        }

        res.json({
            message: "Квиз удален"
        });
    }
    catch (error) {
        console.error(
            "Ошибка удаления квиза:",
            error
        );

        res.status(500).json({
            message: "Ошибка удаления квиза"
        });
    }
}

module.exports = {
    createQuiz,
    getMyQuizzes,
    getQuizById,
    updateQuiz,
    deleteQuiz
};