-- Private bucket for generated TTS audio. Only the tts edge function (service role)
-- reads and writes it, so each phrase is paid for once instead of on every play.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', false)
ON CONFLICT (id) DO NOTHING;
