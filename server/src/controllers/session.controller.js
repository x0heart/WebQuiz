const sessionService =
    require("../services/session.service");

async function createSession(req, res) {
    try {
        const quizId = req.params.quizId;

        const session =
            await sessionService.createSession(
                quizId,
                req.user.id
            );

        res.status(201).json({
            message: "Сессия создана",
            session
        });
    } catch (error) {
        console.error(
            "Ошибка создания сессии:",
            error
        );

        if (
            error.message === "Квиз не найден" ||
            error.message === "Квиз неактивен" ||
            error.message ===
                "Для этого квиза уже существует активная сессия"
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Ошибка создания сессии"
        });
    }
}

async function startSession(req, res) {
    try {
        const sessionId = req.params.sessionId;

        const session =
            await sessionService.startSession(
                sessionId,
                req.user.id
            );

        res.json({
            message: "Сессия запущена",
            session
        });
    } catch (error) {
        console.error(
            "Ошибка запуска сессии:",
            error
        );

        if (
            error.message === "Сессия не найдена" ||
            error.message ===
                "Запустить можно только сессию со статусом waiting"
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Ошибка запуска сессии"
        });
    }
}

async function finishSession(req, res) {
    try {
        const sessionId =
            req.params.sessionId;

        const session =
            await sessionService.finishSession(
                sessionId,
                req.user.id
            );

        res.json({
            message: "Сессия завершена",
            session
        });
    } catch (error) {
        console.error(
            "Ошибка завершения сессии:",
            error
        );

        if (
            error.message === "Сессия не найдена" ||
            error.message ===
                "Завершить можно только запущенную сессию"
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Ошибка завершения сессии"
        });
    }
}

async function joinSession(req, res) {
    try {
        const roomCode =
            req.params.roomCode.toUpperCase();

        const result =
            await sessionService.joinSession(
                roomCode,
                req.user.id
            );

        res.json({
            message: result.alreadyJoined
                ? "Вы уже подключены к сессии"
                : "Вы подключились к сессии",
            session: result.session,
            participant: result.participant
        });
    } catch (error) {
        console.error(
            "Ошибка подключения к сессии:",
            error
        );

        if (
            error.message === "Сессия не найдена" ||
            error.message ===
                "К этой сессии нельзя подключиться"
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Ошибка подключения к сессии"
        });
    }
}

async function getSessionParticipants(req, res) {
    try {
        const sessionId =
            req.params.sessionId;

        const result =
            await sessionService.getSessionParticipants(
                sessionId,
                req.user.id
            );

        res.json({
            session: result.session,
            participants: result.participants
        });
    } catch (error) {
        console.error(
            "Ошибка получения участников:",
            error
        );

        if (
            error.message === "Сессия не найдена"
        ) {
            return res.status(404).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Ошибка получения участников"
        });
    }
}

async function getCurrentQuestion(req, res) {
    try {
        const sessionId =
            req.params.sessionId;

        const result =
            await sessionService.getCurrentQuestion(
                sessionId,
                req.user.id
            );

        res.json(result);
    } catch (error) {
        console.error(
            "Ошибка получения текущего вопроса:",
            error
        );

        if (
            error.message ===
                "Сессия не найдена или участник не подключен" ||
            error.message ===
                "Сессия ещё не запущена" ||
            error.message ===
                "Сессия уже завершена"
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message:
                "Ошибка получения текущего вопроса"
        });
    }
}

async function submitAnswer(req, res) {
    try {
        const sessionId =
            req.params.sessionId;

        const {
            questionId,
            answerIds
        } = req.body;

        const result =
            await sessionService.submitAnswer(
                sessionId,
                req.user.id,
                questionId,
                answerIds
            );

        res.json({
            message: "Ответ принят",
            result
        });
    } catch (error) {
        console.error(
            "Ошибка отправки ответа:",
            error
        );

        const clientErrors = [
            "Вы не подключены к этой сессии",
            "Сессия не найдена",
            "Сессия сейчас не запущена",
            "Время викторины закончилось",
            "Этот вопрос сейчас не активен",
            "Один или несколько ответов не принадлежат этому вопросу",
            "Для этого вопроса необходимо выбрать один ответ",
            "Необходимо выбрать хотя бы один ответ",
            "На этот вопрос уже был отправлен ответ"
        ];

        if (clientErrors.includes(error.message)) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Ошибка отправки ответа"
        });
    }
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