const router =
    require("express").Router();

const historyController =
    require("../controllers/history.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

router.get(
    "/",
    authMiddleware,
    historyController.getHistory
);

module.exports = router;