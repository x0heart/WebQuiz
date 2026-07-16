const router =
require("express").Router();


const quizController =
require("../controllers/quiz.controller");


const authMiddleware =
require("../middleware/auth.middleware");



router.post(
    "/",
    authMiddleware,
    quizController.createQuiz
);



module.exports = router;