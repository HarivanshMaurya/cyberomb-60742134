
CREATE TABLE public.sec_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sec_rate_limits_lookup_idx ON public.sec_rate_limits (bucket, ip_hash, created_at DESC);
GRANT ALL ON public.sec_rate_limits TO service_role;
ALTER TABLE public.sec_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.sec_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
