-- Allow users to delete their own progress records (e.g. reset learning history)
CREATE POLICY "Users can delete their own progress"
ON public.user_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
