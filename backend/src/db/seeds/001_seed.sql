INSERT INTO achievements (name, description, xp_required, streak_required)
VALUES
  ('Первые шаги', 'Наберите первые 50 XP', 50, 0),
  ('Фанат', 'Держите стрик 3 дня', 0, 3),
  ('Мыслитель', 'Наберите 300 XP', 300, 0),
  ('Победитель', 'Наберите 600 XP и стрик 7 дней', 600, 7)
ON CONFLICT DO NOTHING;

INSERT INTO courses (language, title, description, level, is_premium)
VALUES
  ('en', 'Базовый английский', 'Стартовый курс для начинающих', 'A1', FALSE),
  ('en', 'Повышение уровня', 'Углубленное изучение языка', 'B1', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO lessons (course_id, title, difficulty, order_index, topic, is_daily)
SELECT c.id, 'Лексика: Быт', 1, 1, 'vocabulary', TRUE
FROM courses c
WHERE c.language = 'en' AND c.level = 'A1'
ON CONFLICT DO NOTHING;

INSERT INTO lessons (course_id, title, difficulty, order_index, topic, is_daily)
SELECT c.id, 'Грамматика: Present Simple', 2, 2, 'grammar', TRUE
FROM courses c
WHERE c.language = 'en' AND c.level = 'A1'
ON CONFLICT DO NOTHING;

INSERT INTO lessons (course_id, title, difficulty, order_index, topic, is_daily)
SELECT c.id, 'Аудирование: Daily Conversation', 2, 3, 'listening', TRUE
FROM courses c
WHERE c.language = 'en' AND c.level = 'A1'
ON CONFLICT DO NOTHING;

INSERT INTO exercises (lesson_id, type, content, correct_answer, explanation, xp_reward)
SELECT l.id, 'word', '{"prompt":"Window","options":["Окно","Дверь","Дерево","Яблоко"]}'::jsonb, '"Окно"'::jsonb, 'Window переводится как Окно', 12
FROM lessons l
WHERE l.title = 'Лексика: Быт'
ON CONFLICT DO NOTHING;

INSERT INTO exercises (lesson_id, type, content, correct_answer, explanation, xp_reward)
SELECT l.id, 'gap', '{"prompt":"London is the ______ of Great Britain","options":["capital","door","tree","apple"]}'::jsonb, '"capital"'::jsonb, 'Правильное слово: capital', 12
FROM lessons l
WHERE l.title = 'Грамматика: Present Simple'
ON CONFLICT DO NOTHING;

INSERT INTO exercises (lesson_id, type, content, correct_answer, explanation, xp_reward)
SELECT l.id, 'build', '{"prompt":"Сегодня прекрасный день, я собираюсь прогуляться!"}'::jsonb, '["its","a","nice","day","im","going","for","walk"]'::jsonb, 'Порядок слов в английском предложении важен', 14
FROM lessons l
WHERE l.title = 'Грамматика: Present Simple'
ON CONFLICT DO NOTHING;

INSERT INTO exercises (lesson_id, type, content, correct_answer, explanation, xp_reward)
SELECT l.id, 'match', '{"left":["Окно","Дерево","Дверь","Яблоко"],"right":["Окно","Дерево","Дверь","Яблоко"]}'::jsonb, '{"pairs":[["Окно","Окно"],["Дерево","Дерево"],["Дверь","Дверь"],["Яблоко","Яблоко"]]}'::jsonb, 'Сопоставьте одинаковые значения', 12
FROM lessons l
WHERE l.title = 'Лексика: Быт'
ON CONFLICT DO NOTHING;

INSERT INTO exercises (lesson_id, type, content, correct_answer, explanation, xp_reward)
SELECT l.id, 'translation', '{"prompt":"London is the capital of Great Britain"}'::jsonb, '"Лондон — столица Великобритании"'::jsonb, 'Смысловой эквивалент перевода', 12
FROM lessons l
WHERE l.title = 'Лексика: Быт'
ON CONFLICT DO NOTHING;

INSERT INTO exercises (lesson_id, type, content, correct_answer, explanation, xp_reward)
SELECT l.id, 'audio', '{"prompt":"Прослушайте аудиозапись и переведите текст"}'::jsonb, '"Лондон — столица Великобритании"'::jsonb, 'Ключевой смысл должен совпадать', 12
FROM lessons l
WHERE l.title = 'Аудирование: Daily Conversation'
ON CONFLICT DO NOTHING;

INSERT INTO exercises (lesson_id, type, content, correct_answer, explanation, xp_reward)
SELECT l.id, 'speak', '{"prompt":"London is the capital of Great Britain"}'::jsonb, '"London is the capital of Great Britain"'::jsonb, 'Произнесенная фраза должна совпадать по смыслу', 12
FROM lessons l
WHERE l.title = 'Аудирование: Daily Conversation'
ON CONFLICT DO NOTHING;
