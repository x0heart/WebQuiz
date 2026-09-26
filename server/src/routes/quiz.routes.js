const router =
    require("express").Router();

const quizController =
    require("../controllers/quiz.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const roleMiddleware =
    require("../middleware/role.middleware");


router.post(
    "/",
    authMiddleware,
    roleMiddleware("organizer"),
    quizController.createQuiz
);


router.get(
    "/",
    authMiddleware,
    roleMiddleware("organizer"),
    quizController.getMyQuizzes
);


router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("organizer"),
    quizController.getQuizById
);


router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("organizer"),
    quizController.updateQuiz
);


router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("organizer"),
    quizController.deleteQuiz
);


module.exports = router;