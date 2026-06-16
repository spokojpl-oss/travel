-- Lepsze tagowanie quadów z OSM (nazwa atrakcji turystycznej).
insert into activity_osm_mappings (activity_slug, osm_query, priority)
select 'quads', '["tourism"="attraction"]["name"~"quad|ATV|quadbike"]', 1
where not exists (
  select 1 from activity_osm_mappings
  where activity_slug = 'quads'
    and osm_query = '["tourism"="attraction"]["name"~"quad|ATV|quadbike"]'
);
