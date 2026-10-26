--
-- PostgreSQL database dump
--

\restrict V7VsS5REIUZ6dJVePCvgu8ZOxNueyNB60glALY3HIdkeBPlX71JnFQX8bpDrYns

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: answer_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.answer_type AS ENUM (
    'single',
    'multiple'
);


ALTER TYPE public.answer_type OWNER TO postgres;

--
-- Name: question_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_type AS ENUM (
    'text',
    'image'
);


ALTER TYPE public.question_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'participant',
    'organizer'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: get_total_score(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_total_score(p_participant bigint) RETURNS integer
    LANGUAGE plpgsql
    AS $$

DECLARE

total_score INTEGER;

BEGIN

SELECT COALESCE(score,0)

INTO total_score

FROM participants

WHERE id=p_participant;

RETURN total_score;

END;

$$;


ALTER FUNCTION public.get_total_score(p_participant bigint) OWNER TO postgres;

--
-- Name: prevent_answer_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_answer_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Удаление ответа запрещено.';
END;
$$;


ALTER FUNCTION public.prevent_answer_delete() OWNER TO postgres;

--
-- Name: prevent_answer_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_answer_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Изменение ответа запрещено.';
END;
$$;


ALTER FUNCTION public.prevent_answer_update() OWNER TO postgres;

--
-- Name: save_quiz_results(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.save_quiz_results() RETURNS trigger
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


ALTER FUNCTION public.save_quiz_results() OWNER TO postgres;

--
-- Name: set_finished_time(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_finished_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'finished' AND OLD.status <> 'finished' THEN
        NEW.finished_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_finished_time() OWNER TO postgres;

--
-- Name: set_started_time(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_started_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'started' AND OLD.status <> 'started' THEN
        NEW.started_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_started_time() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.answers (
    id bigint NOT NULL,
    question_id bigint NOT NULL,
    answer_text text NOT NULL,
    is_correct boolean DEFAULT false
);


ALTER TABLE public.answers OWNER TO postgres;

--
-- Name: answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.answers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.answers_id_seq OWNER TO postgres;

--
-- Name: answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.answers_id_seq OWNED BY public.answers.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id bigint NOT NULL,
    original_name character varying(255) NOT NULL,
    stored_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size bigint NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.files_id_seq OWNER TO postgres;

--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: participant_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participant_answers (
    id bigint NOT NULL,
    participant_id bigint NOT NULL,
    question_id bigint NOT NULL,
    answer_id bigint NOT NULL,
    answered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.participant_answers OWNER TO postgres;

--
-- Name: participant_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_answers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_answers_id_seq OWNER TO postgres;

--
-- Name: participant_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_answers_id_seq OWNED BY public.participant_answers.id;


--
-- Name: participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participants (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    user_id bigint NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    score integer DEFAULT 0,
    CONSTRAINT chk_score CHECK ((score >= 0))
);


ALTER TABLE public.participants OWNER TO postgres;

--
-- Name: participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participants_id_seq OWNER TO postgres;

--
-- Name: participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participants_id_seq OWNED BY public.participants.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    id bigint NOT NULL,
    quiz_id bigint NOT NULL,
    question_text text NOT NULL,
    question_type public.question_type NOT NULL,
    answer_type public.answer_type NOT NULL,
    points integer DEFAULT 1,
    question_order integer NOT NULL,
    file_id bigint,
    CONSTRAINT chk_points CHECK ((points > 0))
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: quiz_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_results (
    id bigint NOT NULL,
    quiz_id bigint NOT NULL,
    session_id bigint NOT NULL,
    participant_id bigint NOT NULL,
    total_score integer DEFAULT 0 NOT NULL,
    correct_answers integer DEFAULT 0 NOT NULL,
    wrong_answers integer DEFAULT 0 NOT NULL,
    place integer,
    completed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.quiz_results OWNER TO postgres;

--
-- Name: quiz_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quiz_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_results_id_seq OWNER TO postgres;

--
-- Name: quiz_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quiz_results_id_seq OWNED BY public.quiz_results.id;


--
-- Name: quiz_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_sessions (
    id bigint NOT NULL,
    quiz_id bigint NOT NULL,
    room_code character varying(10) NOT NULL,
    started_at timestamp without time zone,
    finished_at timestamp without time zone,
    status character varying(20) DEFAULT 'waiting'::character varying,
    current_question_index integer,
    current_question_started_at timestamp without time zone,
    CONSTRAINT chk_status CHECK (((status)::text = ANY ((ARRAY['waiting'::character varying, 'started'::character varying, 'finished'::character varying])::text[])))
);


ALTER TABLE public.quiz_sessions OWNER TO postgres;

--
-- Name: quiz_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quiz_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_sessions_id_seq OWNER TO postgres;

--
-- Name: quiz_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quiz_sessions_id_seq OWNED BY public.quiz_sessions.id;


--
-- Name: quiz_statistics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.quiz_statistics AS
SELECT
    NULL::bigint AS id,
    NULL::character varying(255) AS title,
    NULL::bigint AS questions,
    NULL::bigint AS participants;


ALTER VIEW public.quiz_statistics OWNER TO postgres;

--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quizzes (
    id bigint NOT NULL,
    organizer_id bigint NOT NULL,
    category_id bigint,
    title character varying(255) NOT NULL,
    description text,
    question_time integer DEFAULT 30 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_question_time CHECK (((question_time >= 5) AND (question_time <= 300)))
);


ALTER TABLE public.quizzes OWNER TO postgres;

--
-- Name: quizzes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quizzes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quizzes_id_seq OWNER TO postgres;

--
-- Name: quizzes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quizzes_id_seq OWNED BY public.quizzes.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: participant_answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_answers ALTER COLUMN id SET DEFAULT nextval('public.participant_answers_id_seq'::regclass);


--
-- Name: participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants ALTER COLUMN id SET DEFAULT nextval('public.participants_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: quiz_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results ALTER COLUMN id SET DEFAULT nextval('public.quiz_results_id_seq'::regclass);


--
-- Name: quiz_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_sessions ALTER COLUMN id SET DEFAULT nextval('public.quiz_sessions_id_seq'::regclass);


--
-- Name: quizzes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quizzes ALTER COLUMN id SET DEFAULT nextval('public.quizzes_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: files files_stored_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_stored_name_key UNIQUE (stored_name);


--
-- Name: participant_answers participant_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_answers
    ADD CONSTRAINT participant_answers_pkey PRIMARY KEY (id);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_results quiz_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT quiz_results_pkey PRIMARY KEY (id);


--
-- Name: quiz_sessions quiz_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_pkey PRIMARY KEY (id);


--
-- Name: quiz_sessions quiz_sessions_room_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_room_code_key UNIQUE (room_code);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: participant_answers uq_participant_answer; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_answers
    ADD CONSTRAINT uq_participant_answer UNIQUE (participant_id, question_id, answer_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_answers_question; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_question ON public.answers USING btree (question_id);


--
-- Name: idx_participant_answers_participant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_participant_answers_participant ON public.participant_answers USING btree (participant_id);


--
-- Name: idx_participants_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_participants_session ON public.participants USING btree (session_id);


--
-- Name: idx_questions_quiz; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_quiz ON public.questions USING btree (quiz_id);


--
-- Name: idx_quizzes_organizer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quizzes_organizer ON public.quizzes USING btree (organizer_id);


--
-- Name: quiz_statistics _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.quiz_statistics AS
 SELECT q.id,
    q.title,
    count(DISTINCT qu.id) AS questions,
    count(DISTINCT p.id) AS participants
   FROM (((public.quizzes q
     LEFT JOIN public.questions qu ON ((qu.quiz_id = q.id)))
     LEFT JOIN public.quiz_sessions s ON ((s.quiz_id = q.id)))
     LEFT JOIN public.participants p ON ((p.session_id = s.id)))
  GROUP BY q.id;


--
-- Name: participant_answers trg_prevent_answer_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_answer_delete BEFORE DELETE ON public.participant_answers FOR EACH ROW EXECUTE FUNCTION public.prevent_answer_delete();


--
-- Name: participant_answers trg_prevent_answer_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_answer_update BEFORE UPDATE ON public.participant_answers FOR EACH ROW EXECUTE FUNCTION public.prevent_answer_update();


--
-- Name: quiz_sessions trg_save_results; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_save_results AFTER UPDATE OF status ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.save_quiz_results();


--
-- Name: quiz_sessions trg_session_finished; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_session_finished BEFORE UPDATE OF status ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.set_finished_time();


--
-- Name: quiz_sessions trg_session_started; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_session_started BEFORE UPDATE OF status ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.set_started_time();


--
-- Name: answers fk_answer_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT fk_answer_question FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: participant_answers fk_pa_answer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_answers
    ADD CONSTRAINT fk_pa_answer FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE;


--
-- Name: participant_answers fk_pa_participant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_answers
    ADD CONSTRAINT fk_pa_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: participant_answers fk_pa_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_answers
    ADD CONSTRAINT fk_pa_question FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: participants fk_participant_session; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT fk_participant_session FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(id) ON DELETE CASCADE;


--
-- Name: participants fk_participant_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT fk_participant_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: questions fk_question_file; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT fk_question_file FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE SET NULL;


--
-- Name: questions fk_question_quiz; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT fk_question_quiz FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes fk_quiz_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT fk_quiz_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: quizzes fk_quiz_organizer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT fk_quiz_organizer FOREIGN KEY (organizer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_results fk_result_participant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT fk_result_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE CASCADE;


--
-- Name: quiz_results fk_result_quiz; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT fk_result_quiz FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quiz_results fk_result_session; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_results
    ADD CONSTRAINT fk_result_session FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(id) ON DELETE CASCADE;


--
-- Name: quiz_sessions fk_session_quiz; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT fk_session_quiz FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict V7VsS5REIUZ6dJVePCvgu8ZOxNueyNB60glALY3HIdkeBPlX71JnFQX8bpDrYns

