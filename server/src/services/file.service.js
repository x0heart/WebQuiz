const pool = require("../config/database");
const fs = require("fs");
const path = require("path");

async function createFile(
    originalName,
    storedName,
    filePath,
    mimeType,
    fileSize
) {
    const result = await pool.query(
        `
        INSERT INTO files
        (
            original_name,
            stored_name,
            file_path,
            mime_type,
            file_size
        )
        VALUES
        ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
            originalName,
            storedName,
            filePath,
            mimeType,
            fileSize
        ]
    );

    return result.rows[0];
}

async function getFileById(fileId) {
    const result = await pool.query(
        `
        SELECT *
        FROM files
        WHERE id = $1
        `,
        [fileId]
    );

    return result.rows[0] || null;
}

async function deleteFile(fileId) {
    const result = await pool.query(
        `
        DELETE FROM files
        WHERE id = $1
        RETURNING *
        `,
        [fileId]
    );

    return result.rows[0] || null;
}

async function removePhysicalFile(file) {
    if (!file || !file.stored_name) {
        return;
    }

    const filePath = path.join(
        __dirname,
        "../uploads",
        file.stored_name
    );

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function deleteFileIfUnused(fileId) {
    const usageResult = await pool.query(
        `
        SELECT id
        FROM questions
        WHERE file_id = $1
        `,
        [fileId]
    );

    if (usageResult.rows.length > 0) {
        return false;
    }

    const file = await deleteFile(fileId);

    if (file) {
        await removePhysicalFile(file);
    }

    return file;
}

module.exports = {
    createFile,
    getFileById,
    deleteFile,
    deleteFileIfUnused
};