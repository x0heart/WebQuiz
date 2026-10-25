const path = require("path");

const fileService =
    require("../services/file.service");

async function uploadFile(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Файл не загружен"
            });
        }

        const file = req.file;

        const savedFile =
            await fileService.createFile(
                file.originalname,
                file.filename,
                path.join(
                    "uploads",
                    file.filename
                ),
                file.mimetype,
                file.size
            );

        res.status(201).json({
            message: "Файл успешно загружен",
            file: savedFile
        });
    } catch (error) {
        console.error(
            "Ошибка загрузки файла:",
            error
        );

        res.status(500).json({
            message: "Ошибка загрузки файла"
        });
    }
}

module.exports = {
    uploadFile
};