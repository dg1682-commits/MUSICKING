-- ============================================================================
-- [음악왕 V4.0] 손낚시(어망·도감·물고기 랭킹 Top 5) + 퀴즈광장(상설 6방·서버 카운트·호스트 승계)
-- Supabase SQL Editor에 전체 붙여넣기 후 [RUN] 한 번 실행하세요. (재실행 안전/멱등)
-- ============================================================================

-- 1) profiles 테이블 확장: 어망(fish_bag) & 물고기 도감(fish_dex)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fish_bag JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fish_dex JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2) 어종별 Top 5 물고기 길이 랭킹 테이블 (1유저 어종당 최고 기록 1건 유지)
CREATE TABLE IF NOT EXISTS public.fish_rankings (
  fish_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  cm NUMERIC(6, 1) NOT NULL CHECK (cm > 0),
  is_max BOOLEAN NOT NULL DEFAULT FALSE,
  caught_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fish_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fish_rankings_cm
  ON public.fish_rankings (fish_id, cm DESC, caught_at ASC);

ALTER TABLE public.fish_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fish_rankings_select_all" ON public.fish_rankings;
CREATE POLICY "fish_rankings_select_all"
  ON public.fish_rankings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "fish_rankings_insert_own" ON public.fish_rankings;
CREATE POLICY "fish_rankings_insert_own"
  ON public.fish_rankings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fish_rankings_update_own" ON public.fish_rankings;
CREATE POLICY "fish_rankings_update_own"
  ON public.fish_rankings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 어종별 신기록일 때만 안전하게 갱신 (기존 기록보다 클 때만 반영)
CREATE OR REPLACE FUNCTION public.submit_fish_ranking_record(
  p_fish_id TEXT,
  p_cm NUMERIC,
  p_is_max BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_nick TEXT := '도전자';
  v_clean_cm NUMERIC(6, 1);
  v_prev_cm NUMERIC(6, 1) := NULL;
  v_updated BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_fish_id IS NULL OR btrim(p_fish_id) = '' THEN
    RAISE EXCEPTION 'INVALID_FISH_ID';
  END IF;

  v_clean_cm := ROUND(COALESCE(p_cm, 0)::numeric, 1);
  IF v_clean_cm <= 0 THEN
    RAISE EXCEPTION 'INVALID_CM';
  END IF;

  SELECT COALESCE(NULLIF(btrim(nickname), ''), '도전자')
    INTO v_nick
  FROM public.profiles
  WHERE id = v_uid
  LIMIT 1;

  SELECT cm
    INTO v_prev_cm
  FROM public.fish_rankings
  WHERE fish_id = p_fish_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.fish_rankings (fish_id, user_id, nickname, cm, is_max, caught_at)
    VALUES (p_fish_id, v_uid, v_nick, v_clean_cm, COALESCE(p_is_max, FALSE), NOW());
    v_updated := TRUE;
  ELSIF v_clean_cm > v_prev_cm OR (v_clean_cm = v_prev_cm AND COALESCE(p_is_max, FALSE)) THEN
    UPDATE public.fish_rankings
       SET nickname = v_nick,
           cm = GREATEST(v_prev_cm, v_clean_cm),
           is_max = COALESCE(p_is_max, FALSE) OR is_max,
           caught_at = NOW()
     WHERE fish_id = p_fish_id AND user_id = v_uid;
    v_updated := TRUE;
  ELSE
    UPDATE public.fish_rankings
       SET nickname = v_nick
     WHERE fish_id = p_fish_id AND user_id = v_uid AND nickname IS DISTINCT FROM v_nick;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'updated', v_updated,
    'fish_id', p_fish_id,
    'cm', GREATEST(COALESCE(v_prev_cm, 0), v_clean_cm)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_fish_ranking_record(TEXT, NUMERIC, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_fish_ranking_record(TEXT, NUMERIC, BOOLEAN) TO authenticated;

-- 3) 퀴즈광장 상설 공개방 테이블 (게임별 2방 = 총 6방)
CREATE TABLE IF NOT EXISTS public.quiz_plaza_rooms (
  room_id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL CHECK (game_type IN ('ox', 'typing', 'climb')),
  title TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing')),
  host_id UUID NULL,
  countdown_end_at TIMESTAMPTZ NULL,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.quiz_plaza_rooms (room_id, game_type, title, max_players, status)
VALUES
  ('ox_1', 'ox', '🥊 OX 링 1번방', 8, 'waiting'),
  ('ox_2', 'ox', '🥊 OX 링 2번방', 8, 'waiting'),
  ('typing_1', 'typing', '🏜️ 사막 타자왕 1번방', 8, 'waiting'),
  ('typing_2', 'typing', '🏜️ 사막 타자왕 2번방', 8, 'waiting'),
  ('climb_1', 'climb', '🏞️ 올라강 1번방', 8, 'waiting'),
  ('climb_2', 'climb', '🏞️ 올라강 2번방', 8, 'waiting')
ON CONFLICT (room_id) DO NOTHING;

ALTER TABLE public.quiz_plaza_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_plaza_rooms_select_all" ON public.quiz_plaza_rooms;
CREATE POLICY "quiz_plaza_rooms_select_all"
  ON public.quiz_plaza_rooms FOR SELECT TO anon, authenticated
  USING (true);

-- 내부 유틸: 오래된 유령 참가자 정리 + 0명 시 대기중 자동 리셋
CREATE OR REPLACE FUNCTION public._cleanup_quiz_plaza_room_row(p_room_id TEXT)
RETURNS public.quiz_plaza_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_row public.quiz_plaza_rooms%ROWTYPE;
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
  v_stale_ms BIGINT;
  v_elem JSONB;
  v_clean JSONB := '[]'::jsonb;
  v_host_alive BOOLEAN := FALSE;
  v_next_host UUID := NULL;
BEGIN
  SELECT * INTO v_row
  FROM public.quiz_plaza_rooms
  WHERE room_id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN v_row;
  END IF;

  v_stale_ms := CASE WHEN v_row.status = 'playing' THEN 90000 ELSE 45000 END;

  IF jsonb_typeof(v_row.players) = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_row.players)
    LOOP
      IF COALESCE((v_elem->>'lastSeenAt')::bigint, 0) > (v_now_ms - v_stale_ms) THEN
        v_clean := v_clean || jsonb_build_array(v_elem);
        IF v_row.host_id IS NOT NULL AND (v_elem->>'id') = v_row.host_id::text THEN
          v_host_alive := TRUE;
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF jsonb_array_length(v_clean) = 0 THEN
    IF v_row.status <> 'waiting'
       OR v_row.host_id IS NOT NULL
       OR v_row.countdown_end_at IS NOT NULL
       OR jsonb_array_length(COALESCE(v_row.players, '[]'::jsonb)) > 0 THEN
      UPDATE public.quiz_plaza_rooms
         SET status = 'waiting',
             host_id = NULL,
             countdown_end_at = NULL,
             players = '[]'::jsonb,
             question_payload = '[]'::jsonb,
             game_state = '{}'::jsonb,
             updated_at = NOW()
       WHERE room_id = p_room_id
       RETURNING * INTO v_row;
    END IF;
  ELSE
    IF NOT v_host_alive THEN
      v_next_host := ((v_clean->0)->>'id')::uuid;
    ELSE
      v_next_host := v_row.host_id;
    END IF;

    IF v_clean IS DISTINCT FROM v_row.players OR v_next_host IS DISTINCT FROM v_row.host_id THEN
      UPDATE public.quiz_plaza_rooms
         SET players = v_clean,
             host_id = v_next_host,
             updated_at = NOW()
       WHERE room_id = p_room_id
       RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public._cleanup_quiz_plaza_room_row(TEXT) FROM PUBLIC, anon, authenticated;

-- 방 목록 + 서버 현재시각 조회
CREATE OR REPLACE FUNCTION public.get_quiz_plaza_rooms()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_id TEXT;
  v_row public.quiz_plaza_rooms%ROWTYPE;
  v_list JSONB := '[]'::jsonb;
BEGIN
  FOR v_id IN
    SELECT room_id FROM public.quiz_plaza_rooms ORDER BY game_type, room_id
  LOOP
    v_row := public._cleanup_quiz_plaza_room_row(v_id);
    v_list := v_list || jsonb_build_array(to_jsonb(v_row));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'server_now', NOW(),
    'rooms', v_list
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_plaza_rooms() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_plaza_rooms() TO anon, authenticated;

-- 방 입장 (실유저 1명 이상 시 서버 기준 30초 카운트다운 자동 시작)
CREATE OR REPLACE FUNCTION public.join_quiz_plaza_room(
  p_room_id TEXT,
  p_player JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.quiz_plaza_rooms%ROWTYPE;
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
  v_elem JSONB;
  v_next_players JSONB := '[]'::jsonb;
  v_exists BOOLEAN := FALSE;
  v_clean_player JSONB;
  v_countdown TIMESTAMPTZ;
  v_host UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_row := public._cleanup_quiz_plaza_room_row(p_room_id);
  IF v_row.room_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'ROOM_NOT_FOUND', 'server_now', NOW());
  END IF;

  IF v_row.status = 'playing' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'ROOM_PLAYING', 'server_now', NOW(), 'room', to_jsonb(v_row));
  END IF;

  v_clean_player := jsonb_build_object(
    'id', v_uid::text,
    'nickname', COALESCE(NULLIF(btrim(p_player->>'nickname'), ''), '도전자'),
    'exp', GREATEST(0, COALESCE((p_player->>'exp')::integer, 0)),
    'avatarConfig', COALESCE(p_player->'avatarConfig', '{}'::jsonb),
    'joinedAt', v_now_ms,
    'lastSeenAt', v_now_ms
  );

  FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_row.players, '[]'::jsonb))
  LOOP
    IF (v_elem->>'id') = v_uid::text THEN
      v_next_players := v_next_players || jsonb_build_array(
        v_clean_player || jsonb_build_object('joinedAt', COALESCE((v_elem->>'joinedAt')::bigint, v_now_ms))
      );
      v_exists := TRUE;
    ELSE
      v_next_players := v_next_players || jsonb_build_array(v_elem);
    END IF;
  END LOOP;

  IF NOT v_exists THEN
    IF jsonb_array_length(v_next_players) >= GREATEST(1, v_row.max_players) THEN
      RETURN jsonb_build_object('ok', FALSE, 'error', 'ROOM_FULL', 'server_now', NOW(), 'room', to_jsonb(v_row));
    END IF;
    v_next_players := v_next_players || jsonb_build_array(v_clean_player);
  END IF;

  v_host := COALESCE(v_row.host_id, ((v_next_players->0)->>'id')::uuid);
  v_countdown := COALESCE(v_row.countdown_end_at, NOW() + INTERVAL '30 seconds');

  UPDATE public.quiz_plaza_rooms
     SET players = v_next_players,
         host_id = v_host,
         countdown_end_at = v_countdown,
         updated_at = NOW()
   WHERE room_id = p_room_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', TRUE, 'server_now', NOW(), 'room', to_jsonb(v_row));
END;
$$;

REVOKE ALL ON FUNCTION public.join_quiz_plaza_room(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_quiz_plaza_room(TEXT, JSONB) TO authenticated;

-- 방 퇴장 (카운트다운 중 전원 퇴장 시 즉시 대기중 초기화, 게임중 봇만 남으면 즉시 대기중 리셋, 방장 퇴장 시 자동 승계)
CREATE OR REPLACE FUNCTION public.leave_quiz_plaza_room(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.quiz_plaza_rooms%ROWTYPE;
  v_elem JSONB;
  v_remaining JSONB := '[]'::jsonb;
  v_next_host UUID := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_row
  FROM public.quiz_plaza_rooms
  WHERE room_id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'ROOM_NOT_FOUND', 'server_now', NOW());
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_row.players, '[]'::jsonb))
  LOOP
    IF (v_elem->>'id') <> v_uid::text THEN
      v_remaining := v_remaining || jsonb_build_array(v_elem);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_remaining) = 0 THEN
    UPDATE public.quiz_plaza_rooms
       SET status = 'waiting',
           host_id = NULL,
           countdown_end_at = NULL,
           players = '[]'::jsonb,
           question_payload = '[]'::jsonb,
           game_state = '{}'::jsonb,
           updated_at = NOW()
     WHERE room_id = p_room_id
     RETURNING * INTO v_row;
  ELSE
    v_next_host := CASE
      WHEN v_row.host_id IS NULL OR v_row.host_id = v_uid THEN ((v_remaining->0)->>'id')::uuid
      ELSE v_row.host_id
    END;
    UPDATE public.quiz_plaza_rooms
       SET players = v_remaining,
           host_id = v_next_host,
           updated_at = NOW()
     WHERE room_id = p_room_id
     RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'server_now', NOW(), 'room', to_jsonb(v_row));
END;
$$;

REVOKE ALL ON FUNCTION public.leave_quiz_plaza_room(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_quiz_plaza_room(TEXT) TO authenticated;

-- 하트비트 & 호스트 생존 확인
CREATE OR REPLACE FUNCTION public.heartbeat_quiz_plaza_room(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.quiz_plaza_rooms%ROWTYPE;
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
  v_elem JSONB;
  v_next JSONB := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_row := public._cleanup_quiz_plaza_room_row(p_room_id);
  IF v_row.room_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'ROOM_NOT_FOUND', 'server_now', NOW());
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_row.players, '[]'::jsonb))
  LOOP
    IF (v_elem->>'id') = v_uid::text THEN
      v_next := v_next || jsonb_build_array(v_elem || jsonb_build_object('lastSeenAt', v_now_ms));
    ELSE
      v_next := v_next || jsonb_build_array(v_elem);
    END IF;
  END LOOP;

  UPDATE public.quiz_plaza_rooms
     SET players = v_next,
         updated_at = NOW()
   WHERE room_id = p_room_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', TRUE, 'server_now', NOW(), 'room', to_jsonb(v_row));
END;
$$;

REVOKE ALL ON FUNCTION public.heartbeat_quiz_plaza_room(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.heartbeat_quiz_plaza_room(TEXT) TO authenticated;

-- 30초 카운트다운 종료 시 호스트(또는 선착순 마스터)가 공통 10문제로 게임 시작
CREATE OR REPLACE FUNCTION public.start_quiz_plaza_room(
  p_room_id TEXT,
  p_question_payload JSONB,
  p_game_state JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.quiz_plaza_rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_row := public._cleanup_quiz_plaza_room_row(p_room_id);
  IF v_row.room_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'ROOM_NOT_FOUND', 'server_now', NOW());
  END IF;

  IF jsonb_array_length(COALESCE(v_row.players, '[]'::jsonb)) = 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'NO_HUMAN_PLAYERS', 'server_now', NOW(), 'room', to_jsonb(v_row));
  END IF;

  IF v_row.status = 'playing' THEN
    RETURN jsonb_build_object('ok', TRUE, 'already_started', TRUE, 'server_now', NOW(), 'room', to_jsonb(v_row));
  END IF;

  IF v_row.countdown_end_at IS NOT NULL AND NOW() < (v_row.countdown_end_at - INTERVAL '2 seconds') THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'COUNTDOWN_ACTIVE', 'server_now', NOW(), 'room', to_jsonb(v_row));
  END IF;

  UPDATE public.quiz_plaza_rooms
     SET status = 'playing',
         countdown_end_at = NULL,
         question_payload = COALESCE(p_question_payload, '[]'::jsonb),
         game_state = COALESCE(p_game_state, '{}'::jsonb),
         updated_at = NOW()
   WHERE room_id = p_room_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', TRUE, 'already_started', FALSE, 'server_now', NOW(), 'room', to_jsonb(v_row));
END;
$$;

REVOKE ALL ON FUNCTION public.start_quiz_plaza_room(TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_quiz_plaza_room(TEXT, JSONB, JSONB) TO authenticated;

-- 게임 진행 상태 동기화 또는 종료 후 대기중 복귀
CREATE OR REPLACE FUNCTION public.sync_quiz_plaza_room_state(
  p_room_id TEXT,
  p_game_state JSONB DEFAULT NULL,
  p_reset_to_waiting BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.quiz_plaza_rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_row
  FROM public.quiz_plaza_rooms
  WHERE room_id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'ROOM_NOT_FOUND', 'server_now', NOW());
  END IF;

  IF COALESCE(p_reset_to_waiting, FALSE) THEN
    IF jsonb_array_length(COALESCE(v_row.players, '[]'::jsonb)) > 0 THEN
      UPDATE public.quiz_plaza_rooms
         SET status = 'waiting',
             countdown_end_at = NOW() + INTERVAL '30 seconds',
             question_payload = '[]'::jsonb,
             game_state = '{}'::jsonb,
             updated_at = NOW()
       WHERE room_id = p_room_id
       RETURNING * INTO v_row;
    ELSE
      UPDATE public.quiz_plaza_rooms
         SET status = 'waiting',
             host_id = NULL,
             countdown_end_at = NULL,
             question_payload = '[]'::jsonb,
             game_state = '{}'::jsonb,
             updated_at = NOW()
       WHERE room_id = p_room_id
       RETURNING * INTO v_row;
    END IF;
  ELSE
    UPDATE public.quiz_plaza_rooms
       SET game_state = COALESCE(p_game_state, v_row.game_state),
           updated_at = NOW()
     WHERE room_id = p_room_id
     RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'server_now', NOW(), 'room', to_jsonb(v_row));
END;
$$;

REVOKE ALL ON FUNCTION public.sync_quiz_plaza_room_state(TEXT, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_quiz_plaza_room_state(TEXT, JSONB, BOOLEAN) TO authenticated;

-- Realtime Publication 등록 (이미 등록돼 있어도 안전하게 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'quiz_plaza_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_plaza_rooms;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
