-- Step 1: Create a users table for signup/login data
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Insert the requested user row
INSERT INTO public.users (email, password, location)
VALUES ('subham33537@gmail.com', 'subham33537', 'dhenkanal,odisha,india')
ON CONFLICT (email) DO UPDATE
SET
    password = EXCLUDED.password,
    location = EXCLUDED.location;