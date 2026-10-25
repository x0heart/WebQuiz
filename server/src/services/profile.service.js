const pool = require("../config/database");
const bcrypt = require("bcrypt");

async function getProfile(userId) {
    const result = await pool.query(
        `
        SELECT
            id,
            username,
            email,
            role,
            created_at
        FROM users
        WHERE id = $1
        `,
        [userId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

async function updateProfile(
    userId,
    username,
    email
) {
    const result = await pool.query(
        `
        UPDATE users
        SET
            username = $1,
            email = $2
        WHERE id = $3
        RETURNING
            id,
            username,
            email,
            role,
            created_at
        `,
        [
            username,
            email,
            userId
        ]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

async function changePassword(
    userId,
    currentPassword,
    newPassword
) {
    const result = await pool.query(
        `
        SELECT password_hash
        FROM users
        WHERE id = $1
        `,
        [userId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const user = result.rows[0];

    const validPassword =
        await bcrypt.compare(
            currentPassword,
            user.password_hash
        );

    if (!validPassword) {
        throw new Error(
            "Неверный текущий пароль"
        );
    }

    const newPasswordHash =
        await bcrypt.hash(
            newPassword,
            10
        );

    await pool.query(
        `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        `,
        [
            newPasswordHash,
            userId
        ]
    );

    return true;
}

module.exports = {
    getProfile,
    updateProfile,
    changePassword
};