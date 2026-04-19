-- ─── Notifications schema ────────────────────────────────────────────────────

-- Stores Expo push tokens per user device.
CREATE TABLE notification_tokens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expo_push_token text        NOT NULL,
  platform        text        NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, expo_push_token)
);

-- Which RE teams a user wants notifications for.
CREATE TABLE notification_preferences (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  re_team_id   integer     NOT NULL,
  team_number  text        NOT NULL,
  program_id   integer     NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, re_team_id)
);

-- Global per-team poll state — owned by the edge function, no user RLS.
CREATE TABLE notification_poll_state (
  re_team_id           integer     PRIMARY KEY,
  event_id             integer,
  seen_match_ids       integer[]   DEFAULT '{}' NOT NULL,
  seen_award_ids       integer[]   DEFAULT '{}' NOT NULL,
  event_end            timestamptz,
  events_refreshed_at  timestamptz
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE notification_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
-- notification_poll_state is service-role only — no RLS policies needed for clients

CREATE POLICY "users_can_manage_own_tokens" ON notification_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_manage_own_preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
