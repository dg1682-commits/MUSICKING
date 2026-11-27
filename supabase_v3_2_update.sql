-- ============================================================================
-- [음악왕 V3.2] 오락실 오늘의 핫 게임(황금주화 2배) + 일일 퀘스트 + 웰컴 패키지 SQL
-- Supabase SQL Editor에 전체 붙여넣기 후 [RUN] 한 번만 실행해 주세요! (재실행 안전/멱등)
-- ============================================================================

-- 1) KST 오전 06:00 기준 일자 키 ('YYYY-MM-DD')
CREATE OR REPLACE FUNCTION public.get_kst_day_key()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT to_char((timezone('Asia/Seoul', NOW()) - INTERVAL '6 hours')::date, 'YYYY-MM-DD');
$$;

REVOKE ALL ON FUNCTION public.get_kst_day_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kst_day_key() TO anon, authenticated;

-- 2) 오늘의 오락실 핫 게임 ID (매일 KST 06:00 자동 변경 · JS와 100% 동일 공식)
CREATE OR REPLACE FUNCTION public.get_arcade_hot_game_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_games TEXT[] := ARRAY[
    'star_dodge',
    'side_sort',
    'animal_match',
    'melody_memory',
    'jump_runner',
    'color_sort',
    'brick_breaker',
    'note_pang'
  ];
  v_days INTEGER;
  v_idx INTEGER;
BEGIN
  v_days := ((timezone('Asia/Seoul', NOW()) - INTERVAL '6 hours')::date - DATE '2026-01-01');
  v_idx := MOD(MOD(v_days * 3 + 5, 8) + 8, 8) + 1;
  RETURN v_games[v_idx];
END;
$$;

REVOKE ALL ON FUNCTION public.get_arcade_hot_game_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_arcade_hot_game_id() TO anon, authenticated;

-- 3) 기존 finish_arcade_game(UUID, INTEGER)을 _finish_arcade_game_v31로 안전 래핑 (핫 게임 황금주화 2배!)
DO $$
BEGIN
  IF to_regprocedure('public._finish_arcade_game_v31(uuid, integer)') IS NULL
     AND to_regprocedure('public.finish_arcade_game(uuid, integer)') IS NOT NULL THEN
    ALTER FUNCTION public.finish_arcade_game(uuid, integer) RENAME TO _finish_arcade_game_v31;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public._finish_arcade_game_v31(uuid, integer)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public._finish_arcade_game_v31(uuid, integer) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.finish_arcade_game(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.finish_arcade_game(p_session_id UUID, p_score INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_game_id TEXT := NULL;
  v_hot_id TEXT := public.get_arcade_hot_game_id();
  v_is_hot BOOLEAN := FALSE;
  v_res JSONB;
  v_base_golden INTEGER := 0;
  v_new_golden INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF to_regprocedure('public._finish_arcade_game_v31(uuid, integer)') IS NULL THEN
    RAISE EXCEPTION 'BASE_FINISH_ARCADE_GAME_MISSING';
  END IF;

  -- 기존 finish 함수가 세션 행을 수정/삭제하기 전에 game_id 확보
  BEGIN
    SELECT s.game_id::text
      INTO v_game_id
    FROM public.arcade_sessions s
    WHERE s.id = p_session_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_game_id := NULL;
  END;

  v_res := public._finish_arcade_game_v31(p_session_id, p_score)::jsonb;

  IF v_game_id IS NULL THEN
    v_game_id := NULLIF(btrim(COALESCE(v_res->>'game_id', '')), '');
  END IF;

  v_base_golden := GREATEST(0, COALESCE((v_res->>'gained_golden')::integer, 0));
  v_is_hot := (v_game_id IS NOT NULL AND v_game_id = v_hot_id);

  IF v_is_hot AND v_base_golden > 0 THEN
    UPDATE public.profiles
    SET golden_coins = GREATEST(0, COALESCE(golden_coins, 0)) + v_base_golden,
        updated_at = NOW()
    WHERE id = v_uid
    RETURNING COALESCE(golden_coins, 0) INTO v_new_golden;

    v_res := v_res || jsonb_build_object(
      'gained_golden', v_base_golden * 2,
      'golden_coins', v_new_golden,
      'is_hot_game', TRUE,
      'hot_game_id', v_hot_id,
      'game_id', v_game_id
    );
  ELSE
    v_res := v_res || jsonb_build_object(
      'is_hot_game', FALSE,
      'hot_game_id', v_hot_id
    );
  END IF;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_arcade_game(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_arcade_game(UUID, INTEGER) TO authenticated;

-- 4) 🎁 웰컴 패키지 1회 수령 보안 테이블 & RPC (1인 1회 · 오락실 동전 2개 보안 지급)
CREATE TABLE IF NOT EXISTS public.welcome_package_claims (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.welcome_package_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "welcome_claims_select_own" ON public.welcome_package_claims;
CREATE POLICY "welcome_claims_select_own"
  ON public.welcome_package_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_welcome_package()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cfg JSONB := '{}'::jsonb;
  v_arcade INTEGER := 0;
  v_cd INTEGER := 0;
  v_inserted UUID := NULL;
  v_inv JSONB := '{}'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT COALESCE(avatar_config, '{}'::jsonb),
         COALESCE(arcade_coins, 0),
         COALESCE(cd_coins, 0)
    INTO v_cfg, v_arcade, v_cd
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  INSERT INTO public.welcome_package_claims (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'already_claimed', TRUE,
      'arcade_coins', v_arcade,
      'cd_coins', v_cd
    );
  END IF;

  IF jsonb_typeof(v_cfg) <> 'object' THEN
    v_cfg := '{}'::jsonb;
  END IF;

  v_inv := COALESCE(v_cfg->'_inventory', '{}'::jsonb);
  IF jsonb_typeof(v_inv) <> 'object' THEN
    v_inv := '{}'::jsonb;
  END IF;
  v_inv := (v_inv - 'welcome_box') || jsonb_build_object(
    'item_3sec', GREATEST(0, COALESCE((v_inv->>'item_3sec')::integer, 0)) + 1,
    'item_chosung', GREATEST(0, COALESCE((v_inv->>'item_chosung')::integer, 0)) + 1
  );

  v_cfg := v_cfg || jsonb_build_object(
    '_v32WelcomeGranted', TRUE,
    '_v32WelcomeOpened', TRUE,
    '_inventory', v_inv
  );

  UPDATE public.profiles
  SET arcade_coins = GREATEST(0, COALESCE(arcade_coins, 0)) + 2,
      cd_coins = GREATEST(0, COALESCE(cd_coins, 0)) + 1000,
      avatar_config = v_cfg,
      updated_at = NOW()
  WHERE id = v_uid
  RETURNING COALESCE(arcade_coins, 0), COALESCE(cd_coins, 0)
    INTO v_arcade, v_cd;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'already_claimed', FALSE,
    'gained_cd', 1000,
    'gained_arcade', 2,
    'arcade_coins', v_arcade,
    'cd_coins', v_cd
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_welcome_package() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_welcome_package() TO authenticated;

-- 5) 📋 참여형 일일 퀘스트 수령 테이블 & 개별 보상 수령 RPC (중복 수령 원천 차단)
CREATE TABLE IF NOT EXISTS public.daily_quest_claims (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  quest_idx INTEGER NOT NULL CHECK (quest_idx BETWEEN 0 AND 2),
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day_key, quest_idx)
);

ALTER TABLE public.daily_quest_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_quest_claims_select_own" ON public.daily_quest_claims;
CREATE POLICY "daily_quest_claims_select_own"
  ON public.daily_quest_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_daily_quest_reward(
  p_day_key TEXT,
  p_quest_idx INTEGER,
  p_reward_type TEXT,
  p_reward_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_today TEXT := public.get_kst_day_key();
  v_cfg JSONB := '{}'::jsonb;
  v_arcade INTEGER := 0;
  v_golden INTEGER := 0;
  v_cd INTEGER := 0;
  v_exp INTEGER := 0;
  v_inserted_idx INTEGER := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_day_key IS DISTINCT FROM v_today THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'DAY_MISMATCH', 'today', v_today);
  END IF;

  IF p_quest_idx IS NULL OR p_quest_idx < 0 OR p_quest_idx > 2 THEN
    RAISE EXCEPTION 'INVALID_QUEST_IDX';
  END IF;

  IF p_reward_type = 'cd' THEN
    IF p_reward_amount < 100 OR p_reward_amount > 200 THEN RAISE EXCEPTION 'INVALID_REWARD_AMOUNT'; END IF;
  ELSIF p_reward_type IN ('arcade_coin', 'golden_coin') THEN
    IF p_reward_amount < 1 OR p_reward_amount > 3 THEN RAISE EXCEPTION 'INVALID_REWARD_AMOUNT'; END IF;
  ELSIF p_reward_type = 'exp' THEN
    IF p_reward_amount < 500 OR p_reward_amount > 1000 THEN RAISE EXCEPTION 'INVALID_REWARD_AMOUNT'; END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_REWARD_TYPE';
  END IF;

  SELECT COALESCE(avatar_config, '{}'::jsonb),
         COALESCE(arcade_coins, 0),
         COALESCE(golden_coins, 0),
         COALESCE(cd_coins, 0)
    INTO v_cfg, v_arcade, v_golden, v_cd
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  IF jsonb_typeof(v_cfg) <> 'object' THEN
    v_cfg := '{}'::jsonb;
  END IF;

  v_exp := GREATEST(0, COALESCE((v_cfg->>'_exp')::integer, 0));

  INSERT INTO public.daily_quest_claims (user_id, day_key, quest_idx, reward_type, reward_amount)
  VALUES (v_uid, v_today, p_quest_idx, p_reward_type, p_reward_amount)
  ON CONFLICT (user_id, day_key, quest_idx) DO NOTHING
  RETURNING quest_idx INTO v_inserted_idx;

  IF v_inserted_idx IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'already_claimed', TRUE,
      'arcade_coins', v_arcade,
      'golden_coins', v_golden,
      'cd_coins', v_cd,
      'exp', v_exp
    );
  END IF;

  IF p_reward_type = 'exp' THEN
    v_exp := v_exp + p_reward_amount;
    v_cfg := v_cfg || jsonb_build_object('_exp', v_exp);
  ELSIF p_reward_type = 'cd' THEN
    v_cd := v_cd + p_reward_amount;
  ELSIF p_reward_type = 'arcade_coin' THEN
    v_arcade := v_arcade + p_reward_amount;
  ELSIF p_reward_type = 'golden_coin' THEN
    v_golden := v_golden + p_reward_amount;
  END IF;

  UPDATE public.profiles
  SET cd_coins = v_cd,
      arcade_coins = v_arcade,
      golden_coins = v_golden,
      avatar_config = v_cfg,
      updated_at = NOW()
  WHERE id = v_uid
  RETURNING COALESCE(cd_coins, 0), COALESCE(arcade_coins, 0), COALESCE(golden_coins, 0)
    INTO v_cd, v_arcade, v_golden;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'already_claimed', FALSE,
    'reward_type', p_reward_type,
    'reward_amount', p_reward_amount,
    'cd_coins', v_cd,
    'arcade_coins', v_arcade,
    'golden_coins', v_golden,
    'exp', v_exp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_quest_reward(TEXT, INTEGER, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_quest_reward(TEXT, INTEGER, TEXT, INTEGER) TO authenticated;
