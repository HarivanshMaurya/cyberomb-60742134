-- Remove public direct read access to authors table (exposes email).
-- Public reads must go through the public_authors view which omits email.
DROP POLICY IF EXISTS "Public can read active authors" ON public.authors;
REVOKE SELECT ON public.authors FROM anon;

-- Ensure the public_authors view is readable by anon for public-facing pages.
GRANT SELECT ON public.public_authors TO anon, authenticated;