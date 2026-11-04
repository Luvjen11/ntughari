-- Songs to start with for each music artist, shown with a YouTube search link.
-- Titles only: the app builds the search, so no video or stream is linked or hosted.
ALTER TABLE public.culture_items
  ADD COLUMN top_songs TEXT[] NOT NULL DEFAULT '{}';

-- Each list is taken from the artist's Wikipedia article (the row's source), plus
-- Afrocritik for Osadebe. Oriental Brothers stay empty until a source names songs.
UPDATE public.culture_items SET top_songs = '{"Osondi Owendi","Onuigbo","Gwam Okwu","Yoba Chukwu","Makojo"}'
  WHERE type = 'music' AND title = 'Chief Stephen Osita Osadebe';
UPDATE public.culture_items SET top_songs = '{"People''s Club of Nigeria","Identity","Nnukwu Mmanwu","Biri Ka Mbiri","Nempi Social Club"}'
  WHERE type = 'music' AND title = 'Oliver De Coque';
UPDATE public.culture_items SET top_songs = '{"Ije Enu","Igede","Money Palava","No Condition Is Permanent","Okwukwe Na Nchekwube"}'
  WHERE type = 'music' AND title = 'Celestine Ukwu';
UPDATE public.culture_items SET top_songs = '{"Ka Esi Le Onye Isi Oche","Ome Ka Agu","Ofu Nwanne"}'
  WHERE type = 'music' AND title = 'Mike Ejeagha';
UPDATE public.culture_items SET top_songs = '{"Because of English","Ube Nwanne","Respect Africa","African Style"}'
  WHERE type = 'music' AND title = 'Bright Chimezie';
UPDATE public.culture_items SET top_songs = '{"Iyogogo","In the Morning Light","Madawolohun (Let Them Say)","Masterplan","Choices"}'
  WHERE type = 'music' AND title = 'Onyeka Onwenu';
UPDATE public.culture_items SET top_songs = '{"Nwa Baby (Ashawo Remix)","Ada Ada","Kwarikwa","Golibe","Levels"}'
  WHERE type = 'music' AND title = 'Flavour';
UPDATE public.culture_items SET top_songs = '{"Ghost Mode","Man of the Year (Obago)","Parcel","O Set","Fada Fada"}'
  WHERE type = 'music' AND title = 'Phyno';
