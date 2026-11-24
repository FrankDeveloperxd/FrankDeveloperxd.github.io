BEGIN;

CREATE TABLE public.vault_encrypted (
    owner_id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    encrypted_data BYTEA NOT NULL,

    revision UUID NOT NULL DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT vault_encrypted_size CHECK (
        octet_length(encrypted_data)
        BETWEEN 12 AND 5242880
    )
);

ALTER TABLE public.vault_encrypted
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vault_encrypted
    FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.vault_encrypted
    FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.vault_encrypted
    TO authenticated;

GRANT INSERT (owner_id, encrypted_data, revision)
    ON public.vault_encrypted TO authenticated;

GRANT UPDATE (encrypted_data, revision)
    ON public.vault_encrypted TO authenticated;

CREATE POLICY "vault_select_own"
ON public.vault_encrypted
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = owner_id
);

CREATE POLICY "vault_insert_own"
ON public.vault_encrypted
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = owner_id
);

CREATE POLICY "vault_update_own"
ON public.vault_encrypted
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) = owner_id
)
WITH CHECK (
    (SELECT auth.uid()) = owner_id
);

CREATE FUNCTION public.vault_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER vault_updated_at_trigger
BEFORE UPDATE ON public.vault_encrypted
FOR EACH ROW
EXECUTE FUNCTION public.vault_set_updated_at();

REVOKE ALL ON FUNCTION public.vault_set_updated_at()
FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;