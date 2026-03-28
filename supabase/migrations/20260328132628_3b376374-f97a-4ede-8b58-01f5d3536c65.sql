ALTER TABLE public.profiles ADD COLUMN email text;

-- Backfill from auth.users
UPDATE public.profiles SET email = u.email
FROM auth.users u WHERE u.id = profiles.id;

-- Update trigger to also save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;