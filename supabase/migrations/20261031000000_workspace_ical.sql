-- Run in Supabase SQL Editor. Private read-only calendar subscriptions.
BEGIN;
CREATE TABLE IF NOT EXISTS public.workspace_calendar_feeds (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_calendar_feeds ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policy: browser never reads or writes feed tokens.
REVOKE ALL ON public.workspace_calendar_feeds FROM anon, authenticated;
-- Authenticated user can obtain or rotate their own token using security-definer RPC.
CREATE OR REPLACE FUNCTION public.workspace_calendar_feed_token(rotate boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.workspace_owner o WHERE o.user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.workspace_calendar_feeds (owner_id)
  VALUES (auth.uid()) ON CONFLICT (owner_id) DO NOTHING;
  IF rotate THEN
    UPDATE public.workspace_calendar_feeds
    SET token = gen_random_uuid(), updated_at = now()
    WHERE owner_id = auth.uid();
  END IF;
  SELECT f.token INTO t FROM public.workspace_calendar_feeds f WHERE f.owner_id = auth.uid();
  RETURN t;
END; $$;
REVOKE ALL ON FUNCTION public.workspace_calendar_feed_token(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workspace_calendar_feed_token(boolean) TO authenticated;
COMMIT;
