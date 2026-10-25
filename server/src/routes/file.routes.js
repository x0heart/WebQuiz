const router =
    require("express").Router();

const fileController =
    require("../controllers/file.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const roleMiddleware =
    require("../middleware/role.middleware");

const upload =
    require("../middleware/upload.middleware");

router.post(
    "/upload",
    authMiddleware,
    roleMiddleware("organizer"),
    upload.single("file"),
    fileController.uploadFile
);

module.exports = router;