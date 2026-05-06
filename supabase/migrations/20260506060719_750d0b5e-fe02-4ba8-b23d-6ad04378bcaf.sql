-- Restrict public access to author email addresses while keeping other author fields public.
REVOKE SELECT (email) ON public.authors FROM anon;
REVOKE SELECT (email) ON public.authors FROM public;