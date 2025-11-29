-- Allow users to insert their own role during registration
CREATE POLICY "Users can insert own role during registration"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also add a policy to prevent duplicate role entries
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_key ON public.user_roles(user_id);