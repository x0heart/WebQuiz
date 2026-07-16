CREATE TYPE user_role AS ENUM (
    'participant',
    'organizer'
);

CREATE TYPE question_type AS ENUM (
    'text',
    'image'
);

CREATE TYPE answer_type AS ENUM (
    'single',
    'multiple'
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role user_role NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
    id BIGSERIAL PRIMARY KEY,

    original_name VARCHAR(255) NOT NULL,

    stored_name VARCHAR(255) NOT NULL UNIQUE,

    file_path TEXT NOT NULL,

    mime_type VARCHAR(100) NOT NULL,

    file_size BIGINT NOT NULL,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE quizzes (
    id BIGSERIAL PRIMARY KEY,

    organizer_id BIGINT NOT NULL,

    category_id BIGINT,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    question_time INTEGER NOT NULL DEFAULT 30,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quiz_organizer
        FOREIGN KEY (organizer_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_quiz_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL
);

CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,

    quiz_id BIGINT NOT NULL,

    question_text TEXT NOT NULL,

    question_type question_type NOT NULL,

    answer_type answer_type NOT NULL,

    image_url TEXT,

    points INTEGER DEFAULT 1,

    question_order INTEGER NOT NULL,

    CONSTRAINT fk_question_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quizzes(id)
        ON DELETE CASCADE
);

CREATE TABLE answers (
    id BIGSERIAL PRIMARY KEY,

    question_id BIGINT NOT NULL,

    answer_text TEXT NOT NULL,

    is_correct BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_answer_question
        FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE
);

CREATE TABLE quiz_sessions (
    id BIGSERIAL PRIMARY KEY,

    quiz_id BIGINT NOT NULL,

    room_code VARCHAR(10) NOT NULL UNIQUE,

    started_at TIMESTAMP,

    finished_at TIMESTAMP,

    status VARCHAR(20) DEFAULT 'waiting',

    CONSTRAINT fk_session_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quizzes(id)
        ON DELETE CASCADE
);

CREATE TABLE participants (
    id BIGSERIAL PRIMARY KEY,

    session_id BIGINT NOT NULL,

    user_id BIGINT NOT NULL,

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    score INTEGER DEFAULT 0,

    CONSTRAINT fk_participant_session
        FOREIGN KEY (session_id)
        REFERENCES quiz_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_participant_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE quiz_results (
    id BIGSERIAL PRIMARY KEY,

    quiz_id BIGINT NOT NULL,

    session_id BIGINT NOT NULL,

    participant_id BIGINT NOT NULL,

    total_score INTEGER NOT NULL DEFAULT 0,

    correct_answers INTEGER NOT NULL DEFAULT 0,

    wrong_answers INTEGER NOT NULL DEFAULT 0,

    place INTEGER,

    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_result_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quizzes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_result_session
        FOREIGN KEY (session_id)
        REFERENCES quiz_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_result_participant
        FOREIGN KEY (participant_id)
        REFERENCES participants(id)
        ON DELETE CASCADE
);

CREATE TABLE participant_answers (
    id BIGSERIAL PRIMARY KEY,

    participant_id BIGINT NOT NULL,

    question_id BIGINT NOT NULL,

    answer_id BIGINT NOT NULL,

    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pa_participant
        FOREIGN KEY (participant_id)
        REFERENCES participants(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pa_question
        FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pa_answer
        FOREIGN KEY (answer_id)
        REFERENCES answers(id)
        ON DELETE CASCADE
    CONSTRAINT uq_participant_answer
        UNIQUE(participant_id, question_id, answer_id)
);

CREATE INDEX idx_quizzes_organizer
ON quizzes(organizer_id);

CREATE INDEX idx_questions_quiz
ON questions(quiz_id);

CREATE INDEX idx_answers_question
ON answers(question_id);

CREATE INDEX idx_participants_session
ON participants(session_id);

CREATE INDEX idx_participant_answers_participant
ON participant_answers(participant_id);

ALTER TABLE quizzes
ADD CONSTRAINT chk_question_time
CHECK (question_time BETWEEN 5 AND 300);

ALTER TABLE questions
ADD CONSTRAINT chk_points
CHECK (points > 0);

ALTER TABLE participants
ADD CONSTRAINT chk_score
CHECK (score >= 0);

ALTER TABLE quiz_sessions
ADD CONSTRAINT chk_status
CHECK (status IN ('waiting', 'started', 'finished'));

CREATE VIEW quiz_statistics AS

SELECT

q.id,

q.title,

COUNT(DISTINCT qu.id) AS questions,

COUNT(DISTINCT p.id) AS participants

FROM quizzes q

LEFT JOIN questions qu
ON qu.quiz_id=q.id

LEFT JOIN quiz_sessions s
ON s.quiz_id=q.id

LEFT JOIN participants p
ON p.session_id=s.id

GROUP BY q.id;

CREATE OR REPLACE FUNCTION get_total_score(p_participant BIGINT)

RETURNS INTEGER AS
$$

DECLARE

total_score INTEGER;

BEGIN

SELECT COALESCE(score,0)

INTO total_score

FROM participants

WHERE id=p_participant;

RETURN total_score;

END;

$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_finished_time()
RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.status = 'finished' AND OLD.status <> 'finished' THEN
        NEW.finished_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_session_finished
BEFORE UPDATE OF status
ON quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION set_finished_time();

CREATE OR REPLACE FUNCTION set_started_time()
RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.status = 'started' AND OLD.status <> 'started' THEN
        NEW.started_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_session_started
BEFORE UPDATE OF status
ON quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION set_started_time();

CREATE OR REPLACE FUNCTION prevent_answer_update()
RETURNS TRIGGER AS
$$
BEGIN
    RAISE EXCEPTION 'Изменение ответа запрещено.';
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_answer_update
BEFORE UPDATE
ON participant_answers
FOR EACH ROW
EXECUTE FUNCTION prevent_answer_update();

CREATE OR REPLACE FUNCTION prevent_answer_delete()
RETURNS TRIGGER AS
$$
BEGIN
    RAISE EXCEPTION 'Удаление ответа запрещено.';
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_answer_delete
BEFORE DELETE
ON participant_answers
FOR EACH ROW
EXECUTE FUNCTION prevent_answer_delete();

CREATE OR REPLACE FUNCTION save_quiz_results()
RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.status = 'finished' AND OLD.status <> 'finished' THEN

        INSERT INTO quiz_results
        (
            quiz_id,
            session_id,
            participant_id,
            total_score
        )
        SELECT
            NEW.quiz_id,
            p.session_id,
            p.id,
            p.score
        FROM participants p
        WHERE p.session_id = NEW.id;

    END IF;

    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_save_results
AFTER UPDATE OF status
ON quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION save_quiz_results();
