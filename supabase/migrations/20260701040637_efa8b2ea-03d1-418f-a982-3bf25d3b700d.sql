
CREATE TABLE public.security_tool_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('use','error')),
  error_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_tool_events_tool_created ON public.security_tool_events(tool_id, created_at DESC);
CREATE INDEX idx_security_tool_events_type ON public.security_tool_events(event_type);

GRANT INSERT ON public.security_tool_events TO anon, authenticated;
GRANT SELECT ON public.security_tool_events TO authenticated;
GRANT ALL ON public.security_tool_events TO service_role;

ALTER TABLE public.security_tool_events ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can log an event; enforce tool_id length + no PII fields exist by schema
CREATE POLICY "Anyone can log tool events"
  ON public.security_tool_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(tool_id) BETWEEN 1 AND 40
    AND (error_code IS NULL OR char_length(error_code) <= 60)
  );

-- Only admins can read aggregated analytics
CREATE POLICY "Admins can read tool events"
  ON public.security_tool_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Append Security Tools link to navbar_config if not already there
UPDATE public.navbar_config
SET nav_links = COALESCE(nav_links, '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object(
    'label', 'Security Tools',
    'href', '/security-tools',
    'visible', true,
    'order', COALESCE((SELECT MAX((elem->>'order')::int) FROM jsonb_array_elements(nav_links) elem), 0) + 1
  )
)
WHERE NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(COALESCE(nav_links, '[]'::jsonb)) elem
  WHERE elem->>'href' = '/security-tools'
);
