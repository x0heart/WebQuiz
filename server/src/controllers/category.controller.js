const categoryService =
    require("../services/category.service");

async function getCategories(req, res) {

    try {

        const categories =
            await categoryService.getCategories();

        res.json({
            categories
        });

    }
    catch (error) {

        console.error(
            "Ошибка получения категорий:",
            error
        );

        res.status(500).json({
            message: "Ошибка получения категорий"
        });
    }
}

module.exports = {
    getCategories
};