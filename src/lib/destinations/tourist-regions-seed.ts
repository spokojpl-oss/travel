import type { TouristRegion } from "./tourist-regions";
import { SEED_TOURIST_REGIONS_EXTRA } from "./tourist-regions-seed-extra";
import { SEED_TOURIST_REGIONS_COASTAL } from "./tourist-regions-seed-coastal";
import { SEED_TOURIST_REGIONS_COASTAL_2 } from "./tourist-regions-seed-coastal-2";
import { SEED_TOURIST_REGIONS_EUROPE } from "./tourist-regions-seed-europe";
import { SEED_TOURIST_REGIONS_CYPRUS } from "./tourist-regions-cyprus-seed";

export const SEED_TOURIST_REGIONS: TouristRegion[] = [
  {
    "id": "al-ksamil",
    "destination_keys": [
      "saranda",
      "albania",
      "ksamil"
    ],
    "slug": "ksamil-saranda",
    "name_pl": "Ksamil i Saranda",
    "name_en": "Ksamil & Saranda",
    "character": "resort",
    "vibe": "popular",
    "overview_pl": "Najpopularniejsza baza na albańskiej rivierze — turkusowe plaże Ksamil, promenada w Sarandzie i łatwy dojazd do Butrintu.",
    "overview_en": "The most popular base on the Albanian Riviera — turquoise Ksamil beaches, Saranda promenade, easy day trip to Butrint.",
    "stay_hint_pl": "Dobra baza na plażowanie i wycieczki po południu — hotele i apartamenty w Ksamil i Sarandzie.",
    "stay_hint_en": "Good base for beach days and afternoon trips — hotels and apartments in Ksamil and Saranda.",
    "center_lat": 39.77,
    "center_lon": 20,
    "picks": [
      {
        "day_theme": "beach_relax",
        "name_pl": "Plaże Ksamil",
        "name_en": "Ksamil beaches",
        "why_pl": "Turkusowa woda i wysepki — najczęściej polecane plaże Albanii.",
        "why_en": "Turquoise water and islets — Albania's most recommended beaches.",
        "activity_slugs": [
          "sandy_beaches",
          "boat_tour"
        ],
        "rank": 1
      },
      {
        "day_theme": "beach_relax",
        "name_pl": "Mirror Beach",
        "name_en": "Mirror Beach",
        "why_pl": "Mniej tłumów niż Ksamil, 10–15 min jazdy na południe.",
        "why_en": "Less crowded than Ksamil, 10–15 min drive south.",
        "activity_slugs": [
          "sandy_beaches"
        ],
        "rank": 2
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Butrint (UNESCO)",
        "name_en": "Butrint (UNESCO)",
        "why_pl": "Ruiny grecko-rzymskie nad laguną — klasyk jednodniowej wycieczki z Sarandy.",
        "why_en": "Greco-Roman ruins by the lagoon — classic day trip from Saranda.",
        "activity_slugs": [
          "archaeology",
          "old_towns"
        ],
        "rank": 1
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Saranda — promenada i forteca",
        "name_en": "Saranda promenade & castle",
        "why_pl": "Wieczorny spacer, kawiarnie, widok na zatokę.",
        "why_en": "Evening stroll, cafés, bay views.",
        "activity_slugs": [
          "old_towns",
          "viewpoints"
        ],
        "rank": 2
      }
    ]
  },
  {
    "id": "al-dhermi",
    "destination_keys": [
      "saranda",
      "albania",
      "dhermi",
      "vlore",
      "vlorë"
    ],
    "slug": "dhermi-riviera",
    "name_pl": "Dhërmi i albańska riviera",
    "name_en": "Dhërmi & Albanian Riviera",
    "character": "wild",
    "vibe": "offbeat",
    "overview_pl": "Dziksze plaże między górami a morzem — mniej infrastruktury niż Ksamil, bardziej „odkrywczo”.",
    "overview_en": "Wilder beaches between mountains and sea — less infrastructure than Ksamil, more exploratory.",
    "stay_hint_pl": "Wybierz mały hotel lub apartament w Dhërmi lub okolicy — samochód praktycznie konieczny.",
    "stay_hint_en": "Pick a small hotel or apartment in Dhërmi — a car is practically essential.",
    "center_lat": 40.15,
    "center_lon": 19.64,
    "picks": [
      {
        "day_theme": "beach_relax",
        "name_pl": "Plaża Dhërmi",
        "name_en": "Dhërmi beach",
        "why_pl": "Długi odcinek kamienisto-piaszczysty, mniej masowej turystyki.",
        "why_en": "Long pebble-sand stretch, less mass tourism.",
        "activity_slugs": [
          "rocky_beaches",
          "sandy_beaches"
        ],
        "rank": 1
      },
      {
        "day_theme": "beach_relax",
        "name_pl": "Plaża Gjipe (wąwóz)",
        "name_en": "Gjipe beach (canyon)",
        "why_pl": "Plaża na końcu wąwozu — krótki trekking, spektakularne zdjęcia.",
        "why_en": "Beach at the canyon end — short hike, spectacular photos.",
        "activity_slugs": [
          "rocky_beaches",
          "hiking_trails"
        ],
        "rank": 2
      },
      {
        "day_theme": "nature",
        "name_pl": "Wąwóz Gjipe",
        "name_en": "Gjipe canyon",
        "why_pl": "Półdniowa wędrówka do ukrytej plaży.",
        "why_en": "Half-day hike to a hidden beach.",
        "activity_slugs": [
          "hiking_trails",
          "canyons"
        ],
        "rank": 1
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Berat (wycieczka)",
        "name_en": "Berat (day trip)",
        "why_pl": "„Miasto tysiąca okien” — UNESCO, ok. 2,5 h jazdy.",
        "why_en": "The \"city of a thousand windows\" — UNESCO, ~2.5 h drive.",
        "activity_slugs": [
          "old_towns",
          "museums"
        ],
        "rank": 1
      }
    ]
  },
  {
    "id": "al-tirana",
    "destination_keys": [
      "tirana",
      "tirane",
      "berat",
      "gjirokaster",
      "gjirokastër",
      "albania"
    ],
    "slug": "tirana-centrum",
    "name_pl": "Tirana i centrum",
    "name_en": "Tirana & central Albania",
    "character": "historic",
    "vibe": "balanced",
    "overview_pl": "Stolica z kolorową architekturą, muzeami i bazą na wycieczki do Beratu i Gjirokastry (UNESCO).",
    "overview_en": "Capital with colourful architecture, museums, and day trips to Berat and Gjirokastër (UNESCO).",
    "stay_hint_pl": "Hotele w centrum Tirany — blisko restauracji i muzeów; samochód na wycieczki poza miasto.",
    "stay_hint_en": "Hotels in central Tirana — close to restaurants and museums; car for trips outside the city.",
    "center_lat": 41.3275,
    "center_lon": 19.8187,
    "picks": [
      {
        "day_theme": "city_culture",
        "name_pl": "Tirana — Skanderbeg i Blloku",
        "name_en": "Tirana — Skanderbeg & Blloku",
        "why_pl": "Plac Skanderbega, muzea i modna dzielnica Blloku — dobry pierwszy dzień.",
        "why_en": "Skanderbeg Square, museums and trendy Blloku — a solid first day.",
        "activity_slugs": [
          "old_towns",
          "museums"
        ],
        "rank": 1
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Berat (UNESCO)",
        "name_en": "Berat (UNESCO)",
        "why_pl": "„Miasto tysiąca okien” — ok. 2 h jazdy z Tirany.",
        "why_en": "The \"city of a thousand windows\" — ~2 h drive from Tirana.",
        "activity_slugs": [
          "old_towns",
          "museums"
        ],
        "rank": 2
      },
      {
        "day_theme": "nature",
        "name_pl": "Park Narodowy Llogara",
        "name_en": "Llogara National Park",
        "why_pl": "Przełęcz z widokiem na rivierę — po drodze na południe kraju.",
        "why_en": "Mountain pass with Riviera views — en route to the south.",
        "activity_slugs": [
          "viewpoints",
          "hiking_trails"
        ],
        "rank": 1
      },
      {
        "day_theme": "active_outdoor",
        "name_pl": "Gjirokastër (UNESCO)",
        "name_en": "Gjirokastër (UNESCO)",
        "why_pl": "Kamienne domy i twierdza — południowa Albania, ok. 3–4 h z Tirany.",
        "why_en": "Stone houses and fortress — southern Albania, ~3–4 h from Tirana.",
        "activity_slugs": [
          "old_towns",
          "viewpoints"
        ],
        "rank": 1
      }
    ]
  },
  {
    "id": "es-lanzarote-playa-blanca",
    "destination_keys": [
      "lanzarote",
      "yaiza",
      "playa blanca"
    ],
    "slug": "playa-blanca-yaiza",
    "name_pl": "Playa Blanca i południe",
    "name_en": "Playa Blanca & south",
    "character": "resort",
    "vibe": "popular",
    "overview_pl": "Spokojniejsza baza na południu wyspy — plaże, prom i blisko Timanfaya.",
    "overview_en": "Quieter base in the south — beaches, promenade, close to Timanfaya.",
    "stay_hint_pl": "Rodzinne resorty i apartamenty; prom na Fuerteventurę z portu.",
    "stay_hint_en": "Family resorts and apartments; ferry to Fuerteventura from the port.",
    "center_lat": 28.86,
    "center_lon": -13.86,
    "picks": [
      {
        "day_theme": "beach_relax",
        "name_pl": "Playa Papagayo",
        "name_en": "Papagayo beaches",
        "why_pl": "Zatoczki z białym piaskiem — najczęściej polecane na południu.",
        "why_en": "White-sand coves — most recommended in the south.",
        "activity_slugs": [
          "sandy_beaches",
          "boat_tour"
        ],
        "rank": 1
      },
      {
        "day_theme": "nature",
        "name_pl": "Timanfaya",
        "name_en": "Timanfaya National Park",
        "why_pl": "Krajobraz wulkaniczny — obowiązkowy punkt Lanzarote.",
        "why_en": "Volcanic landscape — Lanzarote must-see.",
        "activity_slugs": [
          "national_parks",
          "viewpoints"
        ],
        "rank": 1
      },
      {
        "day_theme": "active_outdoor",
        "name_pl": "Wędrówki po Parku Timanfaya",
        "name_en": "Timanfaya guided routes",
        "why_pl": "Rezerwacja wstępu z przewodnikiem — unikalny krajobraz geologiczny.",
        "why_en": "Guided park access — unique geological scenery.",
        "activity_slugs": [
          "hiking_trails",
          "national_parks"
        ],
        "rank": 1
      }
    ]
  },
  {
    "id": "es-lanzarote-puerto-carmen",
    "destination_keys": [
      "lanzarote",
      "puerto del carmen",
      "arrecife"
    ],
    "slug": "puerto-del-carmen",
    "name_pl": "Puerto del Carmen",
    "name_en": "Puerto del Carmen",
    "character": "resort",
    "vibe": "popular",
    "overview_pl": "Największy kurort na wyspie — plaża, restauracje, łatwy wypad w całą Lanzarote.",
    "overview_en": "The island's largest resort — beach, restaurants, easy access to all Lanzarote.",
    "stay_hint_pl": "Dużo hoteli all-inclusive; dobra baza na pierwszą wizytę.",
    "stay_hint_en": "Many all-inclusive hotels; good base for a first trip.",
    "center_lat": 28.92,
    "center_lon": -13.67,
    "picks": [
      {
        "day_theme": "beach_relax",
        "name_pl": "Playa Grande (Puerto del Carmen)",
        "name_en": "Playa Grande",
        "why_pl": "Główna plaża kurortu — długa, piaszczysta, z łagodnym zejściem.",
        "why_en": "Main resort beach — long, sandy, gentle slope.",
        "activity_slugs": [
          "sandy_beaches"
        ],
        "rank": 1
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Arrecife i Castillo de San Gabriel",
        "name_en": "Arrecife & San Gabriel castle",
        "why_pl": "Stolica wyspy — 15 min autobusem, spacer nad laguną.",
        "why_en": "Island capital — 15 min by bus, lagoon walk.",
        "activity_slugs": [
          "old_towns",
          "castles"
        ],
        "rank": 1
      },
      {
        "day_theme": "active_outdoor",
        "name_pl": "Nurkowanie / snorkeling",
        "name_en": "Diving & snorkeling",
        "why_pl": "Centra nurkowe w kurorcie — Atlantyk z czystą wodą.",
        "why_en": "Dive centres in resort — Atlantic with clear water.",
        "activity_slugs": [
          "snorkeling",
          "diving"
        ],
        "rank": 1
      }
    ]
  },
  {
    "id": "gr-crete-chania",
    "destination_keys": [
      "kreta",
      "crete",
      "chania",
      "hania"
    ],
    "slug": "chania-west",
    "name_pl": "Chania i zachodnia Kreta",
    "name_en": "Chania & western Crete",
    "character": "mixed",
    "vibe": "balanced",
    "overview_pl": "Wenecki stary port, plaże Balos i Falassarna — mix zwiedzania i plażowania.",
    "overview_en": "Venetian old harbour, Balos and Falassarna beaches — culture and beach mix.",
    "stay_hint_pl": "Baza w Chani lub małej miejscowości (Agia Marina, Platanias) — wynajem auta praktyczny.",
    "stay_hint_en": "Base in Chania or nearby (Agia Marina) — car rental recommended.",
    "center_lat": 35.51,
    "center_lon": 24.02,
    "picks": [
      {
        "day_theme": "city_culture",
        "name_pl": "Stary port w Chanii",
        "name_en": "Chania old harbour",
        "why_pl": "Latarnia morska, meczety, tawerny — serce zachodniej Krety.",
        "why_en": "Lighthouse, mosques, tavernas — heart of western Crete.",
        "activity_slugs": [
          "old_towns",
          "museums"
        ],
        "rank": 1
      },
      {
        "day_theme": "beach_relax",
        "name_pl": "Balos",
        "name_en": "Balos lagoon",
        "why_pl": "Laguna w odcieniach błękitu — wymaga wczesnego wyjazdu lub łodzi.",
        "why_en": "Multi-blue lagoon — early start or boat trip required.",
        "activity_slugs": [
          "sandy_beaches",
          "boat_tour"
        ],
        "rank": 1
      },
      {
        "day_theme": "beach_relax",
        "name_pl": "Falassarna",
        "name_en": "Falassarna",
        "why_pl": "Długa piaszczysta plaża zachodu — zachód słońca.",
        "why_en": "Long western sandy beach — sunset spot.",
        "activity_slugs": [
          "sandy_beaches"
        ],
        "rank": 2
      },
      {
        "day_theme": "nature",
        "name_pl": "Wąwóz Samaria (sezon)",
        "name_en": "Samaria gorge (seasonal)",
        "why_pl": "Klasyczna całodzienna wędrówka — rezerwacja z wyprzedzeniem.",
        "why_en": "Classic full-day hike — book ahead.",
        "activity_slugs": [
          "hiking_trails",
          "canyons"
        ],
        "rank": 1
      }
    ]
  },
  {
    "id": "gr-crete-elafonisi",
    "destination_keys": [
      "kreta",
      "crete",
      "elafonisi",
      "kissamos"
    ],
    "slug": "elafonisi-southwest",
    "name_pl": "Elafonisi i południowy zachód",
    "name_en": "Elafonisi & southwest",
    "character": "wild",
    "vibe": "offbeat",
    "overview_pl": "Różowe piaski Elafonisi i dzikie zachodnie wybrzeże — mniej zatłoczone niż północ.",
    "overview_en": "Elafonisi pink sands and wild west coast — less crowded than the north.",
    "stay_hint_pl": "Małe hotele w Kissamos lub Paleochora — spokojniejszy rytm.",
    "stay_hint_en": "Small hotels in Kissamos or Paleochora — slower pace.",
    "center_lat": 35.27,
    "center_lon": 23.54,
    "picks": [
      {
        "day_theme": "beach_relax",
        "name_pl": "Elafonisi",
        "name_en": "Elafonisi beach",
        "why_pl": "Różowy piasek i płytkie laguny — jedna z najsłynniejszych plaż Krety.",
        "why_en": "Pink sand and shallow lagoons — one of Crete's most famous beaches.",
        "activity_slugs": [
          "sandy_beaches"
        ],
        "rank": 1
      },
      {
        "day_theme": "beach_relax",
        "name_pl": "Kedrodasos",
        "name_en": "Kedrodasos",
        "why_pl": "Dzika plaża z cedrami — alternatywa dla tłumów Elafonisi.",
        "why_en": "Wild cedar beach — alternative to Elafonisi crowds.",
        "activity_slugs": [
          "rocky_beaches"
        ],
        "rank": 2
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Paleochora",
        "name_en": "Paleochora",
        "why_pl": "Małe miasteczko z dwiema plażami — spokojne wieczory.",
        "why_en": "Small town with two beaches — quiet evenings.",
        "activity_slugs": [
          "old_towns",
          "sandy_beaches"
        ],
        "rank": 1
      }
    ]
  },
  {
    "id": "hr-dubrovnik",
    "destination_keys": [
      "dubrovnik",
      "dubrownik",
      "croatia",
      "chorwacja",
      "hrvatska"
    ],
    "slug": "dubrovnik-old-town",
    "name_pl": "Dubrownik — Stare Miasto",
    "name_en": "Dubrovnik Old Town",
    "character": "historic",
    "vibe": "popular",
    "overview_pl": "Mur miejski, Stradun i widoki na Adriatyck — klasyk Chorwacji z plażami w okolicy.",
    "overview_en": "City walls, Stradun and Adriatic views — Croatia classic with nearby beaches.",
    "stay_hint_pl": "Apartamenty w Starym Mieście lub Lapad — rezerwuj wcześnie latem.",
    "stay_hint_en": "Apartments in Old Town or Lapad — book early in summer.",
    "center_lat": 42.6507,
    "center_lon": 18.0944,
    "picks": [
      {
        "day_theme": "city_culture",
        "name_pl": "Spacer po murach",
        "name_en": "City walls walk",
        "why_pl": "360° widok na miasto i morze — obowiązkowy punkt.",
        "why_en": "360° views over town and sea — must-do.",
        "activity_slugs": [
          "old_towns",
          "viewpoints"
        ],
        "rank": 1
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Stradun i port",
        "name_en": "Stradun & harbour",
        "why_pl": "Serce Dubrownika — kawiarnie, kościoły, wieczorne życie.",
        "why_en": "Heart of Dubrovnik — cafés, churches, evening life.",
        "activity_slugs": [
          "old_towns",
          "museums"
        ],
        "rank": 2
      },
      {
        "day_theme": "beach_relax",
        "name_pl": "Banje Beach",
        "name_en": "Banje Beach",
        "why_pl": "Plaża pod murami — szybki dojazd z centrum.",
        "why_en": "Beach below the walls — quick hop from centre.",
        "activity_slugs": [
          "sandy_beaches"
        ],
        "rank": 1
      },
      {
        "day_theme": "active_outdoor",
        "name_pl": "Wyspa Lokrum",
        "name_en": "Lokrum island",
        "why_pl": "Krótki rejs promem — botaniczny ogród i kąpiel.",
        "why_en": "Short ferry ride — botanical garden and swim.",
        "activity_slugs": [
          "boat_tour",
          "hiking_trails"
        ],
        "rank": 1
      }
    ]
  },
  {
    "id": "es-mallorca-alcudia",
    "destination_keys": [
      "mallorca",
      "majorka",
      "alcudia",
      "palma",
      "baleares"
    ],
    "slug": "alcudia-north",
    "name_pl": "Alcúdia i północ Majorki",
    "name_en": "Alcúdia & north Mallorca",
    "character": "resort",
    "vibe": "balanced",
    "overview_pl": "Długa plaża Alcúdia, stary port i blisko Tramuntany na wycieczki.",
    "overview_en": "Long Alcúdia beach, old port and easy access to Tramuntana day trips.",
    "stay_hint_pl": "Port d'Alcúdia na plażę, Alcúdia na klimat — oba dobre bazy.",
    "stay_hint_en": "Port d'Alcúdia for beach, Alcúdia for charm — both work well.",
    "center_lat": 39.853,
    "center_lon": 3.121,
    "picks": [
      {
        "day_theme": "beach_relax",
        "name_pl": "Platja d'Alcúdia",
        "name_en": "Platja d'Alcúdia",
        "why_pl": "Piaszczysta, płytka woda — najlepsza do rodzinnego plażowania.",
        "why_en": "Sandy, shallow water — best for family beach days.",
        "activity_slugs": [
          "sandy_beaches"
        ],
        "rank": 1
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Stare miasto Alcúdia",
        "name_en": "Alcúdia old town",
        "why_pl": "Mury, targ w niedzielę, lokalne restauracje.",
        "why_en": "Walls, Sunday market, local restaurants.",
        "activity_slugs": [
          "old_towns",
          "museums"
        ],
        "rank": 1
      },
      {
        "day_theme": "nature",
        "name_pl": "Cap de Formentor",
        "name_en": "Cap de Formentor",
        "why_pl": "Widokowa droga i latarnia — półdniowa wycieczka autem.",
        "why_en": "Scenic road and lighthouse — half-day drive.",
        "activity_slugs": [
          "viewpoints",
          "hiking_trails"
        ],
        "rank": 1
      },
      {
        "day_theme": "active_outdoor",
        "name_pl": "Serra de Tramuntana",
        "name_en": "Serra de Tramuntana",
        "why_pl": "Wędrówki w górach — Valldemossa lub Sóller.",
        "why_en": "Mountain hikes — Valldemossa or Sóller.",
        "activity_slugs": [
          "hiking_trails",
          "viewpoints"
        ],
        "rank": 1
      }
    ]
  },
  {
    id: "gr-santorini-caldera",
    destination_keys: [
      "santorini",
      "thira",
      "fira",
      "oia",
      "cyclades",
      "kyklady",
      "grecja",
      "greece",
    ],
    slug: "santorini-caldera",
    name_pl: "Oia i kaldera Santorini",
    name_en: "Oia & Santorini caldera",
    character: "historic",
    vibe: "popular",
    overview_pl:
      "Białe domki, zachody słońca w Oii i wulkaniczna kaldera — najbardziej rozpoznawalna wyspa Grecji.",
    overview_en:
      "White houses, Oia sunsets and the volcanic caldera — Greece's most iconic island.",
    stay_hint_pl:
      "Oia na widoki (rezerwuj wcześnie), Fira na komunikację — transfer z lotniska ok. 20–30 min.",
    stay_hint_en:
      "Oia for views (book early), Fira for transport — airport transfer ~20–30 min.",
    center_lat: 36.4618,
    center_lon: 25.3753,
    picks: [
      {
        day_theme: "city_culture",
        name_pl: "Oia — zachód słońca",
        name_en: "Oia sunset",
        why_pl: "Najbardziej fotografowany zachód w Grecji — przyjdź godzinę wcześniej.",
        why_en: "Greece's most photographed sunset — arrive an hour early.",
        activity_slugs: ["old_towns", "viewpoints"],
        rank: 1,
      },
      {
        day_theme: "city_culture",
        name_pl: "Fira i muzea",
        name_en: "Fira & museums",
        why_pl: "Stolica wyspy, kawiarnie na klifie, muzeum prehistorii.",
        why_en: "Island capital, cliff-side cafés, prehistoric museum.",
        activity_slugs: ["museums", "old_towns"],
        rank: 2,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Plaża czerwona (Kokkini)",
        name_en: "Red Beach",
        why_pl: "Wulkaniczne skały i krystaliczna woda — krótki dojazd od Akrotiri.",
        why_en: "Volcanic cliffs and clear water — short drive from Akrotiri.",
        activity_slugs: ["rocky_beaches"],
        rank: 1,
      },
      {
        day_theme: "active_outdoor",
        name_pl: "Wędrówka Fira–Oia",
        name_en: "Fira to Oia hike",
        why_pl: "Klasyczna trasa wzdłuż kaldery — ok. 3 h, widoki non stop.",
        why_en: "Classic caldera trail — ~3 h with non-stop views.",
        activity_slugs: ["hiking_trails", "viewpoints"],
        rank: 1,
      },
    ],
  },
  {
    id: "gr-santorini-beaches",
    destination_keys: [
      "santorini",
      "thira",
      "perissa",
      "kamari",
      "grecja",
      "greece",
    ],
    slug: "santorini-east-coast",
    name_pl: "Perissa i Kamari",
    name_en: "Perissa & Kamari",
    character: "resort",
    vibe: "balanced",
    overview_pl:
      "Czarne plaże wulkaniczne na wschodzie — tańsze noclegi niż kaldera, dobre dla rodzin.",
    overview_en:
      "Black volcanic beaches on the east — cheaper stays than the caldera, family-friendly.",
    stay_hint_pl:
      "Perissa i Kamari mają długie plaże i taverny — bus do Firy ok. 15 min.",
    stay_hint_en:
      "Perissa and Kamari have long beaches and tavernas — bus to Fira ~15 min.",
    center_lat: 36.35,
    center_lon: 25.47,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Plaża Perissa",
        name_en: "Perissa beach",
        why_pl: "Długa czarna plaża, leżaki i sport wodny — mniej tłumów niż kaldera.",
        why_en: "Long black sand beach, sunbeds and water sports.",
        activity_slugs: ["sandy_beaches", "snorkeling"],
        rank: 1,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Kamari",
        name_en: "Kamari beach",
        why_pl: "Promenada, taverny i płytkie zejście do morza.",
        why_en: "Promenade, tavernas and gentle sea entry.",
        activity_slugs: ["sandy_beaches"],
        rank: 2,
      },
      {
        day_theme: "city_culture",
        name_pl: "Akrotiri — minojska osada",
        name_en: "Akrotiri excavations",
        why_pl: "Prehistoryczne miasto pod ziemią — idealne na upalne popołudnie.",
        why_en: "Prehistoric buried town — perfect for hot afternoons.",
        activity_slugs: ["archaeology", "museums"],
        rank: 1,
      },
    ],
  },
  {
    id: "gr-zakynthos-laganas",
    destination_keys: [
      "zakynthos",
      "zakinthos",
      "zante",
      "zakhyntos",
      "laganas",
      "grecja",
      "greece",
      "wyspy jonskie",
      "ionian",
    ],
    slug: "zakynthos-laganas",
    name_pl: "Laganas i południe Zakynthos",
    name_en: "Laganas & south Zakynthos",
    character: "resort",
    vibe: "popular",
    overview_pl:
      "Najpopularniejsza baza na wyspie — długa plaża, łodzie na Zatokę Wraku i rejsy wokół wyspy.",
    overview_en:
      "The island's main resort base — long beach, shipwreck cove boats and island cruises.",
    stay_hint_pl:
      "Laganas na plażę i wypożyczalnie łodzi; Kalamaki bliżej lotniska — oba dobre z dziećmi.",
    stay_hint_en:
      "Laganas for beach and boat rentals; Kalamaki closer to airport — both family-friendly.",
    center_lat: 37.718,
    center_lon: 20.868,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Plaża Laganas",
        name_en: "Laganas beach",
        why_pl: "Długa, piaszczysta, płytkie morze — chroniona żółwiami morskimi latem.",
        why_en: "Long sandy beach, shallow sea — loggerhead turtles nest here in summer.",
        activity_slugs: ["sandy_beaches"],
        rank: 1,
      },
      {
        day_theme: "beach_relax",
        name_pl: "Navagio — Zatoka Wraku",
        name_en: "Navagio Shipwreck Cove",
        why_pl: "Ikoniczne zdjęcie Grecji — rejs łodzią z portu w Agios Nikolaos lub widok z klifu.",
        why_en: "Greece's iconic cove — boat trip or cliff viewpoint.",
        activity_slugs: ["boat_tour", "rocky_beaches"],
        rank: 1,
      },
      {
        day_theme: "active_outdoor",
        name_pl: "Rejs wokół wyspy",
        name_en: "Island boat tour",
        why_pl: "Błękitne groty i pływanie w zatoce — pół- lub całodniowy rejs.",
        why_en: "Blue caves and swimming stops — half or full-day cruise.",
        activity_slugs: ["boat_tour", "snorkeling"],
        rank: 1,
      },
      {
        day_theme: "kids",
        name_pl: "Turtle Spotting (Laganas Bay)",
        name_en: "Turtle spotting (Laganas Bay)",
        why_pl: "Sezonowe obserwacje żółwi z łodzi — atrakcja dla starszych dzieci.",
        why_en: "Seasonal turtle watching by boat — great for older kids.",
        activity_slugs: ["boat_tour"],
        rank: 1,
      },
    ],
  },
  {
    id: "gr-zakynthos-north",
    destination_keys: [
      "zakynthos",
      "zakinthos",
      "zante",
      "alykes",
      "tsilivi",
      "grecja",
      "greece",
      "ionian",
    ],
    slug: "zakynthos-north",
    name_pl: "Alykes i północ wyspy",
    name_en: "Alykes & north Zakynthos",
    character: "mixed",
    vibe: "balanced",
    overview_pl:
      "Spokojniejsza północ — piaszczyste plaże, mniej imprezowego zgiełku niż Laganas.",
    overview_en:
      "Quieter north — sandy beaches, less party noise than Laganas.",
    stay_hint_pl:
      "Alykes lub Tsilivi — dobre dla rodzinnego wypoczynku, wynajem auta na Navagio.",
    stay_hint_en:
      "Alykes or Tsilivi — relaxed family stays, car useful for Navagio.",
    center_lat: 37.83,
    center_lon: 20.78,
    picks: [
      {
        day_theme: "beach_relax",
        name_pl: "Plaża Alykes",
        name_en: "Alykes beach",
        why_pl: "Piaszczysta, płytka, taverny wzdłuż brzegu.",
        why_en: "Sandy, shallow, tavernas along the shore.",
        activity_slugs: ["sandy_beaches"],
        rank: 1,
      },
      {
        day_theme: "nature",
        name_pl: "Widok na Navagio (Platforma)",
        name_en: "Navagio viewpoint",
        why_pl: "Platforma widokowa nad wrakiem — wcześnie rano mniej tłumów.",
        why_en: "Cliff-top platform above the wreck — go early to avoid crowds.",
        activity_slugs: ["viewpoints"],
        rank: 1,
      },
      {
        day_theme: "city_culture",
        name_pl: "Zakynthos Town",
        name_en: "Zakynthos Town",
        why_pl: "Stolica wyspy — wieczorny spacer, lokalne jedzenie.",
        why_en: "Island capital — evening stroll and local food.",
        activity_slugs: ["old_towns", "museums"],
        rank: 1,
      },
    ],
  },
  ...SEED_TOURIST_REGIONS_EXTRA,
  ...SEED_TOURIST_REGIONS_COASTAL,
  ...SEED_TOURIST_REGIONS_COASTAL_2,
  ...SEED_TOURIST_REGIONS_EUROPE,
  ...SEED_TOURIST_REGIONS_CYPRUS,
] as TouristRegion[];
