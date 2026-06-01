
CREATE TABLE public.ai_writer_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled draft',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_writer_drafts TO authenticated;
GRANT ALL ON public.ai_writer_drafts TO service_role;

ALTER TABLE public.ai_writer_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own AI drafts"
  ON public.ai_writer_drafts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.is_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_admin());

CREATE INDEX idx_ai_writer_drafts_user_updated
  ON public.ai_writer_drafts (user_id, updated_at DESC);

CREATE TRIGGER trg_ai_writer_drafts_updated_at
  BEFORE UPDATE ON public.ai_writer_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
