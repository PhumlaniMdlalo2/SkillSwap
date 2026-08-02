-- =========================================================
-- SkillSwap — sample data
-- Run in the Supabase SQL Editor AFTER schema.sql.
-- Creates 6 demo teachers (real auth.users rows, so the
-- on_auth_user_created trigger fires and gives each one a
-- profile + wallet automatically), their skills, open
-- availability slots to book against, and one completed
-- session + review so ratings aren't empty on first browse.
--
-- Demo login for any of the 6 accounts: password "SkillSwap123!"
-- Sign up for your own account through the app as normal — the
-- open availability slots below are there for you to book.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Auth users (triggers profile + wallet + welcome bonus)
-- ---------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'amara@example.com', extensions.crypt('SkillSwap123!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Amara Ndlovu"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'sipho@example.com', extensions.crypt('SkillSwap123!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Sipho Khumalo"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'lerato@example.com', extensions.crypt('SkillSwap123!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Lerato Mokoena"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'thabo@example.com', extensions.crypt('SkillSwap123!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Thabo Dlamini"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'naledi@example.com', extensions.crypt('SkillSwap123!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Naledi Botha"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated',
   'kagiso@example.com', extensions.crypt('SkillSwap123!', extensions.gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Kagiso Molefe"}', '', '', '', '')
on conflict (id) do nothing;

-- Fill in avatar/bio (not part of raw_user_meta_data, so set directly).
update public.users set avatar = 'https://i.pravatar.cc/300?img=47', bio = 'Jazz pianist and vocal coach with 12 years of teaching experience.' where user_id = '11111111-1111-1111-1111-111111111111';
update public.users set avatar = 'https://i.pravatar.cc/300?img=12', bio = 'Full-stack developer. I teach React Native and Postgres basics.' where user_id = '22222222-2222-2222-2222-222222222222';
update public.users set avatar = 'https://i.pravatar.cc/300?img=32', bio = 'Home cook specializing in West-African cuisine. Let''s get cooking!' where user_id = '33333333-3333-3333-3333-333333333333';
update public.users set avatar = 'https://i.pravatar.cc/300?img=51', bio = 'Certified yoga & breathwork instructor.' where user_id = '44444444-4444-4444-4444-444444444444';
update public.users set avatar = 'https://i.pravatar.cc/300?img=25', bio = 'Watercolour painter, teaching beginner-friendly art sessions.' where user_id = '55555555-5555-5555-5555-555555555555';
update public.users set avatar = 'https://i.pravatar.cc/300?img=60', bio = 'Spanish & French tutor, 8 years abroad.' where user_id = '66666666-6666-6666-6666-666666666666';

-- ---------------------------------------------------------
-- 2. Skills
-- ---------------------------------------------------------
insert into public.skills (skill_id, user_id, title, description, category) values
  ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jazz Piano Fundamentals', 'Learn chord voicings, improvisation and jazz standards on piano.', 'Music'),
  ('a1111111-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'React Native for Beginners', 'Build your first mobile app with Expo and React Native.', 'Technology'),
  ('a1111111-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'West-African Cooking', 'Master jollof rice, suya spice blends and plantain dishes.', 'Cooking'),
  ('a1111111-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'Beginner Yoga & Breathwork', 'Gentle flows and breathing techniques for stress relief.', 'Wellness'),
  ('a1111111-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'Watercolour Painting Basics', 'Colour theory, brush control and your first landscape painting.', 'Art & Design'),
  ('a1111111-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666', 'Conversational Spanish', 'Build confidence speaking Spanish through real conversation practice.', 'Languages'),
  ('a1111111-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'Postgres for App Developers', 'Schema design, RLS policies and querying with Supabase.', 'Technology')
on conflict (skill_id) do nothing;

-- ---------------------------------------------------------
-- 3. Availability — open slots you can book from the app
-- ---------------------------------------------------------
insert into public.availability (availability_id, user_id, skill_id, start_time, end_time, booked) values
  ('b2222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', now() + interval '2 days' + interval '14 hours', now() + interval '2 days' + interval '15 hours', false),
  ('b2222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', now() + interval '4 days' + interval '16 hours', now() + interval '4 days' + interval '17 hours', false),
  ('b2222222-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'a1111111-0000-0000-0000-000000000003', now() + interval '5 days' + interval '11 hours', now() + interval '5 days' + interval '12 hours 30 minutes', false),
  ('b2222222-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'a1111111-0000-0000-0000-000000000004', now() + interval '1 day' + interval '7 hours', now() + interval '1 day' + interval '8 hours', false),
  ('b2222222-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'a1111111-0000-0000-0000-000000000005', now() + interval '6 days' + interval '13 hours', now() + interval '6 days' + interval '14 hours 30 minutes', false),
  -- already booked by Kagiso below, for the demo session/review
  ('b2222222-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'a1111111-0000-0000-0000-000000000002', now() - interval '7 days' + interval '9 hours', now() - interval '7 days' + interval '10 hours', true)
on conflict (availability_id) do nothing;

-- ---------------------------------------------------------
-- 4. One completed session + review, so ratings aren't empty.
-- Kagiso (learner) booked and completed Sipho's React Native
-- session last week. Written directly (bypassing the RPCs,
-- which require a real request-scoped auth.uid()) but mirrors
-- exactly what book_session()/complete_session() would do.
-- ---------------------------------------------------------
insert into public.sessions (session_id, availability_id, teacher_id, learner_id, session_date, duration, status) values
  ('c3333333-0000-0000-0000-000000000001', 'b2222222-0000-0000-0000-000000000006',
   '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666',
   now() - interval '7 days' + interval '9 hours', 60, 'completed')
on conflict (session_id) do nothing;

insert into public.token_transactions (user_id, session_id, type, amount, description) values
  ('66666666-6666-6666-6666-666666666666', 'c3333333-0000-0000-0000-000000000001', 'spend', -1, 'Booked React Native for Beginners'),
  ('22222222-2222-2222-2222-222222222222', 'c3333333-0000-0000-0000-000000000001', 'earn', 1, 'Taught React Native for Beginners');

update public.token_wallet set balance = balance - 1, updated_at = now() where user_id = '66666666-6666-6666-6666-666666666666';
update public.token_wallet set balance = balance + 1, updated_at = now() where user_id = '22222222-2222-2222-2222-222222222222';

insert into public.reviews (session_id, reviewer_id, reviewee_id, rating, comment) values
  ('c3333333-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222',
   5, 'Clear explanations and a great first project to build.')
on conflict (session_id, reviewer_id) do nothing;
-- users.rating / review_count update automatically via the reviews_refresh_rating trigger.
