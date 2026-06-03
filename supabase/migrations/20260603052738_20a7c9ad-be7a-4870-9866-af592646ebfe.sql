CREATE TABLE public.ai_writer_draft_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.ai_writer_drafts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  label text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_writer_draft_versions_draft_idx
  ON public.ai_writer_draft_versions(draft_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_writer_draft_versions TO authenticated;
GRANT ALL ON public.ai_writer_draft_versions TO service_role;

ALTER TABLE public.ai_writer_draft_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own draft versions"
  ON public.ai_writer_draft_versions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND is_admin())
  WITH CHECK (auth.uid() = user_id AND is_admin());