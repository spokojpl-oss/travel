-- Migracja 020: Santorini + Zakynthos (upsert — bezpieczne po 019)

insert into tourist_regions (
  id, slug, destination_keys, name_pl, name_en, character, vibe,
  overview_pl, overview_en, stay_hint_pl, stay_hint_en,
  center_lat, center_lon, active, sort_order
) values
(
  'gr-santorini-caldera', 'santorini-caldera',
  array['santorini','thira','fira','oia','cyclades','kyklady','grecja','greece'],
  'Oia i kaldera Santorini', 'Oia & Santorini caldera',
  'historic', 'popular',
  'Białe domki, zachody słońca w Oii i wulkaniczna kaldera — najbardziej rozpoznawalna wyspa Grecji.',
  'White houses, Oia sunsets and the volcanic caldera — Greece''s most iconic island.',
  'Oia na widoki (rezerwuj wcześnie), Fira na komunikację — transfer z lotniska ok. 20–30 min.',
  'Oia for views (book early), Fira for transport — airport transfer ~20–30 min.',
  36.4618, 25.3753, true, 10
),
(
  'gr-santorini-beaches', 'santorini-east-coast',
  array['santorini','thira','perissa','kamari','grecja','greece'],
  'Perissa i Kamari', 'Perissa & Kamari',
  'resort', 'balanced',
  'Czarne plaże wulkaniczne na wschodzie — tańsze noclegi niż kaldera, dobre na rodziny.',
  'Black volcanic beaches on the east — cheaper stays than the caldera, family-friendly.',
  'Perissa i Kamari mają długie plaże i taverny — bus do Firy ok. 15 min.',
  'Perissa and Kamari have long beaches and tavernas — bus to Fira ~15 min.',
  36.35, 25.47, true, 11
),
(
  'gr-zakynthos-laganas', 'zakynthos-laganas',
  array['zakynthos','zakinthos','zante','zakhyntos','laganas','grecja','greece','wyspy jonskie','ionian'],
  'Laganas i południe Zakynthos', 'Laganas & south Zakynthos',
  'resort', 'popular',
  'Najpopularniejsza baza na wyspie — długa plaża, łodzie na Zatokę Wraku i rejsy wokół wyspy.',
  'The island''s main resort base — long beach, shipwreck cove boats and island cruises.',
  'Laganas na plażę i wypożyczalnie łodzi; Kalamaki bliżej lotniska — oba dobre z dziećmi.',
  'Laganas for beach and boat rentals; Kalamaki closer to airport — both family-friendly.',
  37.718, 20.868, true, 12
),
(
  'gr-zakynthos-north', 'zakynthos-north',
  array['zakynthos','zakinthos','zante','alykes','tsilivi','grecja','greece','ionian'],
  'Alykes i północ wyspy', 'Alykes & north Zakynthos',
  'mixed', 'balanced',
  'Spokojniejsza północ — piaszczyste plaże, mniej imprezowego zgiełku niż Laganas.',
  'Quieter north — sandy beaches, less party noise than Laganas.',
  'Alykes lub Tsilivi — dobre na rodzinny wypoczynek, wynajem auta na Navagio.',
  'Alykes or Tsilivi — relaxed family stays, car useful for Navagio.',
  37.83, 20.78, true, 13
)
on conflict (id) do update set
  slug = excluded.slug,
  destination_keys = excluded.destination_keys,
  name_pl = excluded.name_pl,
  name_en = excluded.name_en,
  character = excluded.character,
  vibe = excluded.vibe,
  overview_pl = excluded.overview_pl,
  overview_en = excluded.overview_en,
  stay_hint_pl = excluded.stay_hint_pl,
  stay_hint_en = excluded.stay_hint_en,
  center_lat = excluded.center_lat,
  center_lon = excluded.center_lon,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- picks: usuń stare i wstaw na nowo dla nowych regionów
delete from region_picks where region_id in (
  'gr-santorini-caldera','gr-santorini-beaches','gr-zakynthos-laganas','gr-zakynthos-north'
);

insert into region_picks (region_id, day_theme, name_pl, name_en, why_pl, why_en, activity_slugs, rank) values
('gr-santorini-caldera','city_culture','Oia — zachód słońca','Oia sunset','Najbardziej fotografowany zachód w Grecji — przyjdź godzinę wcześniej.','Greece''s most photographed sunset — arrive an hour early.',array['old_towns','viewpoints'],1),
('gr-santorini-caldera','city_culture','Fira i muzea','Fira & museums','Stolica wyspy, kawiarnie na klifie, muzeum prehistorii.','Island capital, cliff-side cafés, prehistoric museum.',array['museums','old_towns'],2),
('gr-santorini-caldera','beach_relax','Plaża czerwona (Kokkini)','Red Beach','Wulkaniczne skały i krystaliczna woda — krótki dojazd od Akrotiri.','Volcanic cliffs and clear water — short drive from Akrotiri.',array['rocky_beaches'],1),
('gr-santorini-caldera','active_outdoor','Wędrówka Fira–Oia','Fira to Oia hike','Klasyczna trasa wzdłuż kaldery — ok. 3 h, widoki non stop.','Classic caldera trail — ~3 h with non-stop views.',array['hiking_trails','viewpoints'],1),
('gr-santorini-beaches','beach_relax','Plaża Perissa','Perissa beach','Długa czarna plaża, leżaki i sport wodny — mniej tłumów niż kaldera.','Long black sand beach, sunbeds and water sports.',array['sandy_beaches','snorkeling'],1),
('gr-santorini-beaches','beach_relax','Kamari','Kamari beach','Promenada, taverny i płytkie zejście do morza.','Promenade, tavernas and gentle sea entry.',array['sandy_beaches'],2),
('gr-santorini-beaches','city_culture','Akrotiri — minojska osada','Akrotiri excavations','Prehistoryczne miasto pod ziemią — idealne na upalne popołudnie.','Prehistoric buried town — perfect for hot afternoons.',array['archaeology','museums'],1),
('gr-zakynthos-laganas','beach_relax','Plaża Laganas','Laganas beach','Długa, piaszczysta, płytkie morze — chroniona żółwiami morskimi latem.','Long sandy beach, shallow sea — loggerhead turtles nest here in summer.',array['sandy_beaches'],1),
('gr-zakynthos-laganas','beach_relax','Navagio — Zatoka Wraku','Navagio Shipwreck Cove','Ikoniczne zdjęcie Grecji — rejs łodzią z portu w Agios Nikolaos lub widok z klifu.','Greece''s iconic cove — boat trip or cliff viewpoint.',array['boat_tour','rocky_beaches'],1),
('gr-zakynthos-laganas','active_outdoor','Rejs wokół wyspy','Island boat tour','Błękitne groty i pływanie w zatoce — pół- lub całodniowy rejs.','Blue caves and swimming stops — half or full-day cruise.',array['boat_tour','snorkeling'],1),
('gr-zakynthos-laganas','kids','Turtle Spotting (Laganas Bay)','Turtle spotting (Laganas Bay)','Sezonowe obserwacje żółwi z łodzi — atrakcja dla starszych dzieci.','Seasonal turtle watching by boat — great for older kids.',array['boat_tour'],1),
('gr-zakynthos-north','beach_relax','Plaża Alykes','Alykes beach','Piaszczysta, płytka, taverny wzdłuż brzegu.','Sandy, shallow, tavernas along the shore.',array['sandy_beaches'],1),
('gr-zakynthos-north','nature','Widok na Navagio (Platforma)','Navagio viewpoint','Platforma widokowa nad wrakiem — wcześnie rano mniej tłumów.','Cliff-top platform above the wreck — go early to avoid crowds.',array['viewpoints'],1),
('gr-zakynthos-north','city_culture','Zakynthos Town','Zakynthos Town','Stolica wyspy — wieczorny spacer, lokalne jedzenie.','Island capital — evening stroll and local food.',array['old_towns','museums'],1);
