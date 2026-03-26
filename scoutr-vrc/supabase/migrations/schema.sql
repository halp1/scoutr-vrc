-- ─── Scoutr VRC — full schema ────────────────────────────────────────────────
-- Run this against a fresh Supabase project to get the database up and running.

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE team_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_number text        NOT NULL,
  note        text        NOT NULL DEFAULT '',
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, team_number)
);

CREATE TABLE scouting_teams (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  seed       text        NOT NULL,
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE scouting_team_members (
  team_id      uuid        REFERENCES scouting_teams(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid        REFERENCES auth.users(id)     ON DELETE CASCADE NOT NULL,
  display_name text        NOT NULL,
  joined_at    timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

-- ─── Column-level security: hide seed from API clients ───────────────────────

REVOKE SELECT ON scouting_teams FROM authenticated, anon;
GRANT  SELECT (id, name, created_by, created_at) ON scouting_teams TO authenticated;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE team_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_team_members ENABLE ROW LEVEL SECURITY;

-- Helper: returns the team IDs the calling user belongs to.
-- SECURITY DEFINER so that RLS policies can call it without recursing into
-- the policies on scouting_team_members themselves.
CREATE OR REPLACE FUNCTION get_my_team_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM scouting_team_members WHERE user_id = auth.uid();
$$;

CREATE POLICY "members_can_view_team" ON scouting_teams FOR SELECT
  USING (id IN (SELECT get_my_team_ids()));

CREATE POLICY "members_can_view_teammates" ON scouting_team_members FOR SELECT
  USING (team_id IN (SELECT get_my_team_ids()));

CREATE POLICY "users_can_leave_team" ON scouting_team_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "users_can_insert_own_notes" ON team_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_notes" ON team_notes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_notes" ON team_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_read_own_and_teammate_notes" ON team_notes FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT stm.user_id
      FROM scouting_team_members stm
      WHERE stm.team_id IN (SELECT get_my_team_ids())
        AND stm.user_id <> auth.uid()
    )
  );

-- ─── Helper: derive invite code from seed + UTC hour offset ──────────────────
-- Produces an 8-char uppercase hex string (16^8 ≈ 4 billion combos).
-- search_path includes extensions so digest() from pgcrypto is found even
-- when called from functions locked to SET search_path = public.

CREATE OR REPLACE FUNCTION _compute_invite_code(p_seed text, p_hour_offset integer DEFAULT 0)
RETURNS char(8)
LANGUAGE sql
STABLE
SET search_path = extensions, public
AS $$
  SELECT upper(left(
    encode(
      digest(p_seed || ':' || (floor(extract(epoch from now()) / 3600) + p_hour_offset)::text, 'sha256'),
      'hex'
    ),
    8
  ))
$$;

-- ─── RPC: create_scouting_team ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_scouting_team(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_display_name text;
  v_team_id      uuid;
  v_seed         text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Team name cannot be empty';
  END IF;

  v_seed := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  SELECT COALESCE(raw_user_meta_data->>'full_name', email, id::text)
  INTO v_display_name
  FROM auth.users WHERE id = v_user_id;

  INSERT INTO scouting_teams (name, seed, created_by)
  VALUES (trim(p_name), v_seed, v_user_id)
  RETURNING id INTO v_team_id;

  INSERT INTO scouting_team_members (team_id, user_id, display_name)
  VALUES (v_team_id, v_user_id, v_display_name);

  RETURN jsonb_build_object('id', v_team_id, 'name', trim(p_name));
END;
$$;

-- ─── RPC: join_scouting_team ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION join_scouting_team(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_display_name text;
  v_team_id      uuid;
  v_team_name    text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, name INTO v_team_id, v_team_name
  FROM scouting_teams
  WHERE _compute_invite_code(seed,  0) = upper(p_code)
     OR _compute_invite_code(seed, -1) = upper(p_code)
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM scouting_team_members
    WHERE team_id = v_team_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('id', v_team_id, 'name', v_team_name);
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'full_name', email, id::text)
  INTO v_display_name
  FROM auth.users WHERE id = v_user_id;

  INSERT INTO scouting_team_members (team_id, user_id, display_name)
  VALUES (v_team_id, v_user_id, v_display_name);

  RETURN jsonb_build_object('id', v_team_id, 'name', v_team_name);
END;
$$;

-- ─── RPC: get_my_invite_code ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_invite_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_seed    text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT st.seed INTO v_seed
  FROM scouting_teams st
  JOIN scouting_team_members stm ON stm.team_id = st.id
  WHERE stm.user_id = v_user_id
    AND st.id = p_team_id;

  IF v_seed IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN _compute_invite_code(v_seed, 0);
END;
$$;

-- ─── RPC: update_my_display_name ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_my_display_name(p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_display_name IS NULL OR length(trim(p_display_name)) = 0 THEN
    RAISE EXCEPTION 'Display name cannot be empty';
  END IF;

  UPDATE scouting_team_members
  SET display_name = trim(p_display_name)
  WHERE user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_teammate_notes(p_team_number text)
RETURNS TABLE(display_name text, note text, shared_teams text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    MIN(stm_author.display_name)::text                   AS display_name,
    tn.note,
    array_agg(DISTINCT st.name ORDER BY st.name)::text[] AS shared_teams
  FROM team_notes tn
  JOIN scouting_team_members stm_author ON stm_author.user_id = tn.user_id
  JOIN scouting_team_members stm_viewer ON stm_viewer.team_id = stm_author.team_id
                                        AND stm_viewer.user_id = v_user_id
  JOIN scouting_teams st ON st.id = stm_author.team_id
  WHERE tn.team_number = p_team_number
    AND tn.user_id <> v_user_id
    AND tn.note <> ''
  GROUP BY tn.id, tn.user_id, tn.note;
END;
$$;
