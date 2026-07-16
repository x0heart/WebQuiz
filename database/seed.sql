INSERT INTO categories(name)
VALUES
('История'),
('География'),
('Музыка'),
('Кино'),
('Игры'),
('Спорт'),
('Наука');

INSERT INTO users(username,email,password_hash,role)
VALUES
('admin','admin@mail.com','123456','organizer'),

('ivan','ivan@mail.com','123456','participant'),

('alex','alex@mail.com','123456','participant');

INSERT INTO quizzes
(
organizer_id,
category_id,
title,
description,
question_time
)
VALUES
(
1,
4,
'Кино 2025',
'Небольшой тест по современным фильмам',
30
);

INSERT INTO questions
(
quiz_id,
question_text,
question_type,
answer_type,
points,
question_order
)
VALUES
(
1,
'Кто снял фильм Интерстеллар?',
'text',
'single',
2,
1
);

INSERT INTO answers
(
question_id,
answer_text,
is_correct
)
VALUES
(1,'Кристофер Нолан',true),

(1,'Джеймс Кэмерон',false),

(1,'Стивен Спилберг',false),

(1,'Ридли Скотт',false);

