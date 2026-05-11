
-- 1. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.newsletter_subscribers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_messages;

-- 2. Restrict authors SELECT to admins, expose public fields via a view
DROP POLICY IF EXISTS "Anyone can read authors" ON public.authors;

CREATE POLICY "Admins can read authors"
ON public.authors
FOR SELECT
TO public
USING (is_admin());

CREATE OR REPLACE VIEW public.public_authors
WITH (security_invoker = true) AS
SELECT id, name, role, bio, image, twitter, instagram, is_active, created_at, updated_at
FROM public.authors
WHERE is_active = true;

GRANT SELECT ON public.public_authors TO anon, authenticated;

-- 3. Restrict site_settings SELECT to admins only
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
