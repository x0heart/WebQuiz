const router =
    require("express").Router();

const profileController =
    require("../controllers/profile.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

router.get(
    "/",
    authMiddleware,
    profileController.getProfile
);

router.put(
    "/",
    authMiddleware,
    profileController.updateProfile
);

router.put(
    "/password",
    authMiddleware,
    profileController.changePassword
);

module.exports = router;