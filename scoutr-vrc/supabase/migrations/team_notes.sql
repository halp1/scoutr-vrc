CREATE TABLE team_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_number text NOT NULL,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, team_number)
);

ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes" ON team_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
