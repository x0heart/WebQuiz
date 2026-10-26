-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "answer_type" AS ENUM ('single', 'multiple');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('text', 'image');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('participant', 'organizer');

-- CreateTable
CREATE TABLE "answers" (
    "id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "answer_text" TEXT NOT NULL,
    "is_correct" BOOLEAN DEFAULT false,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" BIGSERIAL NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_name" VARCHAR(255) NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_answers" (
    "id" BIGSERIAL NOT NULL,
    "participant_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "answer_id" BIGINT NOT NULL,
    "answered_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" BIGSERIAL NOT NULL,
    "session_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER DEFAULT 0,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" BIGSERIAL NOT NULL,
    "quiz_id" BIGINT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "question_type" NOT NULL,
    "answer_type" "answer_type" NOT NULL,
    "points" INTEGER DEFAULT 1,
    "question_order" INTEGER NOT NULL,
    "file_id" BIGINT,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" BIGSERIAL NOT NULL,
    "quiz_id" BIGINT NOT NULL,
    "session_id" BIGINT NOT NULL,
    "participant_id" BIGINT NOT NULL,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "wrong_answers" INTEGER NOT NULL DEFAULT 0,
    "place" INTEGER,
    "completed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" BIGSERIAL NOT NULL,
    "quiz_id" BIGINT NOT NULL,
    "room_code" VARCHAR(10) NOT NULL,
    "started_at" TIMESTAMP(6),
    "finished_at" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'waiting',
    "current_question_index" INTEGER,
    "current_question_started_at" TIMESTAMP(6),

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" BIGSERIAL NOT NULL,
    "organizer_id" BIGINT NOT NULL,
    "category_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "question_time" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_answers_question" ON "answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "files_stored_name_key" ON "files"("stored_name");

-- CreateIndex
CREATE INDEX "idx_participant_answers_participant" ON "participant_answers"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_participant_answer" ON "participant_answers"("participant_id", "question_id", "answer_id");

-- CreateIndex
CREATE INDEX "idx_participants_session" ON "participants"("session_id");

-- CreateIndex
CREATE INDEX "idx_questions_quiz" ON "questions"("quiz_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_sessions_room_code_key" ON "quiz_sessions"("room_code");

-- CreateIndex
CREATE INDEX "idx_quizzes_organizer" ON "quizzes"("organizer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "fk_answer_question" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participant_answers" ADD CONSTRAINT "fk_pa_answer" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participant_answers" ADD CONSTRAINT "fk_pa_participant" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participant_answers" ADD CONSTRAINT "fk_pa_question" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "fk_participant_session" FOREIGN KEY ("session_id") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "fk_participant_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "fk_question_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "fk_question_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "fk_result_participant" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "fk_result_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "fk_result_session" FOREIGN KEY ("session_id") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "fk_session_quiz" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "fk_quiz_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "fk_quiz_organizer" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "participants"
    ADD CONSTRAINT "chk_score" CHECK ("score" >= 0);

ALTER TABLE "questions"
    ADD CONSTRAINT "chk_points" CHECK ("points" > 0);

ALTER TABLE "quiz_sessions"
    ADD CONSTRAINT "chk_status"
    CHECK ("status" IN ('waiting', 'started', 'finished'));

ALTER TABLE "quizzes"
    ADD CONSTRAINT "chk_question_time"
    CHECK ("question_time" >= 5 AND "question_time" <= 300);

CREATE OR REPLACE FUNCTION public.prevent_answer_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Answer delete is not allowed.';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_answer_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Answer update is not allowed.';
END;
$$;

CREATE OR REPLACE FUNCTION public.save_quiz_results() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN

    IF NEW.status = 'finished'
       AND OLD.status <> 'finished'
    THEN

        INSERT INTO quiz_results
        (
            quiz_id,
            session_id,
            participant_id,
            total_score,
            correct_answers,
            wrong_answers,
            place
        )
        WITH participant_scores AS
        (
            SELECT
                p.id AS participant_id,

                COALESCE(
                    SUM(
                        CASE
                            WHEN answer_check.is_correct
                            THEN q.points
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_score,

                COUNT(
                    CASE
                        WHEN answer_check.is_correct
                        THEN 1
                    END
                ) AS correct_answers,

                COUNT(
                    CASE
                        WHEN NOT answer_check.is_correct
                        THEN 1
                    END
                ) AS wrong_answers

            FROM participants p

            CROSS JOIN questions q

            LEFT JOIN LATERAL
            (
                SELECT
                    CASE

                        WHEN COUNT(pa.id) = 0
                        THEN false

                        WHEN q.answer_type = 'single'
                        THEN
                            COUNT(pa.id) = 1
                            AND BOOL_AND(a.is_correct)

                        WHEN q.answer_type = 'multiple'
						THEN
						    COUNT(pa.id) = (
						        SELECT COUNT(*)
						        FROM answers correct_a
						        WHERE correct_a.question_id = q.id
						          AND correct_a.is_correct = true
						    )
						    AND COUNT(pa.id) > 0
						    AND BOOL_AND(a.is_correct)
						    AND COUNT(pa.id) = (
						        SELECT COUNT(*)
						        FROM answers selected_a
						        WHERE selected_a.question_id = q.id
						          AND selected_a.is_correct = true
						          AND selected_a.id IN (
						              SELECT pa2.answer_id
						              FROM participant_answers pa2
						              WHERE pa2.participant_id = p.id
						                AND pa2.question_id = q.id
						          )
						    )

                        ELSE false

                    END AS is_correct

                FROM participant_answers pa

                JOIN answers a
                    ON a.id = pa.answer_id

                WHERE pa.participant_id = p.id
                  AND pa.question_id = q.id

            ) answer_check
            ON true

            WHERE p.session_id = NEW.id
              AND q.quiz_id = NEW.quiz_id

            GROUP BY p.id
        ),

        ranked_results AS
        (
            SELECT
                participant_id,
                total_score,
                correct_answers,
                wrong_answers,

                RANK() OVER (
                    ORDER BY total_score DESC
                ) AS place

            FROM participant_scores
        )

        SELECT
            NEW.quiz_id,
            NEW.id,
            participant_id,
            total_score,
            correct_answers,
            wrong_answers,
            place
        FROM ranked_results;

    END IF;

    RETURN NEW;

END;
$$;

CREATE OR REPLACE FUNCTION public.set_finished_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'finished' AND OLD.status <> 'finished' THEN
        NEW.finished_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_started_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'started' AND OLD.status <> 'started' THEN
        NEW.started_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_answer_delete
BEFORE DELETE ON public.participant_answers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_answer_delete();

CREATE TRIGGER trg_prevent_answer_update
BEFORE UPDATE ON public.participant_answers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_answer_update();

CREATE TRIGGER trg_save_results
AFTER UPDATE OF status ON public.quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION public.save_quiz_results();

CREATE TRIGGER trg_session_finished
BEFORE UPDATE OF status ON public.quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_finished_time();

CREATE TRIGGER trg_session_started
BEFORE UPDATE OF status ON public.quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_started_time();