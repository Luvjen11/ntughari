CREATE TABLE public.tutor_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE public.tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.tutor_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  english TEXT,
  correction TEXT,
  correction_note TEXT,
  new_word JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX tutor_chats_user_updated_idx ON public.tutor_chats(user_id, updated_at DESC);
CREATE INDEX tutor_messages_chat_created_idx ON public.tutor_messages(chat_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_chats TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.tutor_messages TO authenticated;
GRANT ALL ON public.tutor_chats TO service_role;
GRANT ALL ON public.tutor_messages TO service_role;
ALTER TABLE public.tutor_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own chats" ON public.tutor_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create their own chats" ON public.tutor_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own chats" ON public.tutor_chats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own chats" ON public.tutor_chats FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users read their own chat messages" ON public.tutor_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add messages to their own chats" ON public.tutor_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tutor_chats c WHERE c.id = chat_id AND c.user_id = auth.uid()));
CREATE POLICY "Users delete their own chat messages" ON public.tutor_messages FOR DELETE USING (auth.uid() = user_id);