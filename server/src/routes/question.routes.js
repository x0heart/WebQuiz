const router =
    require("express").Router();

const questionController =
    require("../controllers/question.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const roleMiddleware =
    require("../middleware/role.middleware");

router.post(
    "/quizzes/:id/questions",
    authMiddleware,
    roleMiddleware("organizer"),
    questionController.createQuestion
);

router.get(
    "/quizzes/:id/questions",
    authMiddleware,
    roleMiddleware("organizer"),
    questionController.getQuestionsByQuiz
);

router.put(
    "/quizzes/:quizId/questions/:questionId",
    authMiddleware,
    roleMiddleware("organizer"),
    questionController.updateQuestion
);

router.delete(
    "/quizzes/:quizId/questions/:questionId",
    authMiddleware,
    roleMiddleware("organizer"),
    questionController.deleteQuestion
);

module.exports = router;