-- Usunięcie historii wyszukiwań (funkcja wycofana z UI)

drop policy if exists "Users manage own search history" on search_history;
drop table if exists search_history;
drop type if exists search_type;
