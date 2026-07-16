const pool = require("../config/database");


// создание квиза

async function createQuiz(
    organizerId,
    title,
    description,
    categoryId,
    questionTime
){

    const result = await pool.query(
        `
        INSERT INTO quizzes
        (
            organizer_id,
            category_id,
            title,
            description,
            question_time
        )

        VALUES
        ($1,$2,$3,$4,$5)

        RETURNING *
        `,
        [
            organizerId,
            categoryId,
            title,
            description,
            questionTime
        ]
    );


    return result.rows[0];

}



module.exports = {
    createQuiz
};