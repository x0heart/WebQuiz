const pool = require("../config/database");

async function getOrganizerHistory(userId) {
    const result = await pool.query(
        `
        SELECT
            qs.id AS session_id,
            q.id AS quiz_id,
            q.title,
            c.name AS category,
            qs.room_code,
            qs.status,
            qs.started_at,
            qs.finished_at,
            COUNT(p.id) AS participants_count
        FROM quiz_sessions qs
        JOIN quizzes q
            ON q.id = qs.quiz_id
        LEFT JOIN categories c
            ON c.id = q.category_id
        LEFT JOIN participants p
            ON p.session_id = qs.id
        WHERE q.organizer_id = $1
        GROUP BY
            qs.id,
            q.id,
            q.title,
            c.name,
            qs.room_code,
            qs.status,
            qs.started_at,
            qs.finished_at
        ORDER BY qs.started_at DESC NULLS LAST
        `,
        [userId]
    );

    return result.rows;
}


async function getParticipantHistory(userId) {
    const result = await pool.query(
        `
        SELECT
            qr.id AS result_id,
            qr.quiz_id,
            q.title,
            c.name AS category,
            qr.session_id,
            qr.total_score,
            qr.correct_answers,
            qr.wrong_answers,
            qr.place,
            qr.completed_at
        FROM quiz_results qr
        JOIN quizzes q
            ON q.id = qr.quiz_id
        LEFT JOIN categories c
            ON c.id = q.category_id
        JOIN participants p
            ON p.id = qr.participant_id
        WHERE p.user_id = $1
        ORDER BY qr.completed_at DESC
        `,
        [userId]
    );

    return result.rows;
}

module.exports = {
    getOrganizerHistory,
    getParticipantHistory
};