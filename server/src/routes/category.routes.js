const router =
    require("express").Router();

const categoryController =
    require("../controllers/category.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

router.get(
    "/",
    authMiddleware,
    categoryController.getCategories
);

module.exports = router;