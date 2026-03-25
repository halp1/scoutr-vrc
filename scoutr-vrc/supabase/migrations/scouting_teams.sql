CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE scouting_teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  seed       text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE scouting_team_members (
  team_id      uuid REFERENCES scouting_teams(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  joined_at    timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

-- ─── Column-level security: hide seed from API clients ───────────────────────

REVOKE SELECT ON scouting_teams FROM authenticated, anon;
GRANT  SELECT (id, name, created_by, created_at) ON scouting_teams TO authenticated;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE scouting_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_view_team" ON scouting_teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM scouting_team_members
    WHERE team_id = scouting_teams.id AND user_id = auth.uid()
  ));

CREATE POLICY "members_can_view_teammates" ON scouting_team_members FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM scouting_team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "users_can_leave_team" ON scouting_team_members FOR DELETE
  USING (user_id = auth.uid());

-- Update team_notes: split the ALL policy into individual ones so teammate reads work
DROP POLICY IF EXISTS "Users can manage their own notes" ON team_notes;

CREATE POLICY "users_can_insert_own_notes" ON team_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_notes" ON team_notes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_notes" ON team_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_read_own_and_teammate_notes" ON team_notes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM scouting_team_members m1
      JOIN scouting_team_members m2 ON m1.team_id = m2.team_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = team_notes.user_id
    )
  );

-- ─── Helper: derive invite code from seed + UTC hour offset ──────────────────
-- Produces an 8-char uppercase hex string (16^8 ≈ 4 billion combos).
-- Offset=0 is the current hour; offset=-1 is the previous hour (grace period).

CREATE OR REPLACE FUNCTION _compute_invite_code(p_seed text, p_hour_offset integer DEFAULT 0)
RETURNS char(8)
LANGUAGE sql
STABLE
AS $$
  SELECT upper(left(
    encode(
      digest(p_seed || ':' || (floor(extract(epoch from now()) / 3600) + p_hour_offset)::text, 'sha256'),
      'hex'
    ),
    8
  ))
$$;

-- ─── RPC: create_scouting_team ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_scouting_team(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_display_name text;
  v_team_id      uuid;
  v_seed         text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM scouting_team_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Already in a scouting team';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Team name cannot be empty';
  END IF;

  v_seed := encode(gen_random_bytes(32), 'hex');

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

-- ─── RPC: join_scouting_team ──────────────────────────────────────────────────

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

  IF EXISTS (SELECT 1 FROM scouting_team_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Already in a scouting team';
  END IF;

  -- Accept current or previous hour to handle boundary transitions
  SELECT id, name INTO v_team_id, v_team_name
  FROM scouting_teams
  WHERE _compute_invite_code(seed,  0) = upper(p_code)
     OR _compute_invite_code(seed, -1) = upper(p_code)
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'full_name', email, id::text)
  INTO v_display_name
  FROM auth.users WHERE id = v_user_id;

  INSERT INTO scouting_team_members (team_id, user_id, display_name)
  VALUES (v_team_id, v_user_id, v_display_name);

  RETURN jsonb_build_object('id', v_team_id, 'name', v_team_name);
END;
$$;

-- ─── RPC: get_my_invite_code ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_invite_code()
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
  WHERE stm.user_id = v_user_id;

  IF v_seed IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN _compute_invite_code(v_seed, 0);
END;
$$;

-- ─── RPC: get_teammate_notes ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_teammate_notes(p_team_number text)
RETURNS TABLE(display_name text, note text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT stm.team_id INTO v_team_id
  FROM scouting_team_members stm
  WHERE stm.user_id = v_user_id;

  IF v_team_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT stm.display_name, tn.note
  FROM scouting_team_members stm
  JOIN team_notes tn ON tn.user_id = stm.user_id
  WHERE stm.team_id = v_team_id
    AND stm.user_id <> v_user_id
    AND tn.team_number = p_team_number
    AND tn.note <> '';
END;
$$;
