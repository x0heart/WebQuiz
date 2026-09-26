const pool = require("../config/database");

async function getCategories() {

    const result = await pool.query(
        `
        SELECT
            id,
            name
        FROM categories
        ORDER BY name
        `
    );

    return result.rows;
}

module.exports = {
    getCategories
};