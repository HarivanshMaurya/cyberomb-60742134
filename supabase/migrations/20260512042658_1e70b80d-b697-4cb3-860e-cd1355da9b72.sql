-- Recreate public_authors as a security-definer view (default), so it can be read
-- by anon/authenticated even though the base authors table is admin-only.
DROP VIEW IF EXISTS public.public_authors;

CREATE VIEW public.public_authors AS
SELECT id, name, role, bio, image, twitter, instagram, is_active, created_at, updated_at
FROM public.authors
WHERE is_active = true;

GRANT SELECT ON public.public_authors TO anon, authenticated;