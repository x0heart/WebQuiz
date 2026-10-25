const router =
    require("express").Router();

const sessionController =
    require("../controllers/session.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const roleMiddleware =
    require("../middleware/role.middleware");

router.post(
    "/quizzes/:quizId/sessions",
    authMiddleware,
    roleMiddleware("organizer"),
    sessionController.createSession
);

router.patch(
    "/sessions/:sessionId/start",
    authMiddleware,
    roleMiddleware("organizer"),
    sessionController.startSession
);

router.patch(
    "/sessions/:sessionId/finish",
    authMiddleware,
    roleMiddleware("organizer"),
    sessionController.finishSession
);

router.post(
    "/sessions/:roomCode/join",
    authMiddleware,
    roleMiddleware("participant"),
    sessionController.joinSession
);

router.get(
    "/sessions/:sessionId/participants",
    authMiddleware,
    roleMiddleware("organizer"),
    sessionController.getSessionParticipants
);

router.get(
    "/sessions/:sessionId/current-question",
    authMiddleware,
    roleMiddleware("participant"),
    sessionController.getCurrentQuestion
);

router.post(
    "/sessions/:sessionId/answers",
    authMiddleware,
    roleMiddleware("participant"),
    sessionController.submitAnswer
);

module.exports = router;