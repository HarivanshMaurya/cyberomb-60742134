-- 1. Fix Security Definer View: recreate public_authors with security_invoker
DROP VIEW IF EXISTS public.public_authors;
CREATE VIEW public.public_authors
WITH (security_invoker = true)
AS
SELECT id, name, role, bio, image, twitter, instagram, is_active, created_at, updated_at
FROM public.authors
WHERE is_active = true;

GRANT SELECT ON public.public_authors TO anon, authenticated;

-- Allow anon/authenticated to read active authors via the view (needed since invoker uses caller's perms)
DROP POLICY IF EXISTS "Public can read active authors" ON public.authors;
CREATE POLICY "Public can read active authors"
ON public.authors
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2. Remove public listing on storage.objects for media bucket.
-- Public bucket files remain accessible via direct public URL; we just block listing.
DROP POLICY IF EXISTS "Anyone can view media files" ON storage.objects;

-- 3. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from public roles.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_admin_role() FROM PUBLIC, anon, authenticated;
