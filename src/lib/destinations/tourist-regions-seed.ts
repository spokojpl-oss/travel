import type { TouristRegion } from "./tourist-regions";

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
    "stay_hint_pl": "Dużo hoteli all-inclusive; dobra baza na pierwszy wyjazd.",
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
    "id": "cy-paphos",
    "destination_keys": [
      "pafos",
      "paphos",
      "cyprus",
      "cypr"
    ],
    "slug": "paphos-coast",
    "name_pl": "Pafos i wybrzeże",
    "name_en": "Paphos & coast",
    "character": "mixed",
    "vibe": "balanced",
    "overview_pl": "Plaże, stanowiska archeologiczne i spokojniejsze tempo niż Ajia Napa.",
    "overview_en": "Beaches, archaeological sites and a slower pace than Ayia Napa.",
    "stay_hint_pl": "Kato Paphos przy promenadzie — blisko ruin i plaż.",
    "stay_hint_en": "Kato Paphos on the promenade — close to ruins and beaches.",
    "center_lat": 34.7571,
    "center_lon": 32.4144,
    "picks": [
      {
        "day_theme": "beach_relax",
        "name_pl": "Coral Bay",
        "name_en": "Coral Bay",
        "why_pl": "Piaszczysta zatoka na północ od centrum — dobra na rodziny.",
        "why_en": "Sandy bay north of centre — family-friendly.",
        "activity_slugs": [
          "sandy_beaches"
        ],
        "rank": 1
      },
      {
        "day_theme": "city_culture",
        "name_pl": "Park archeologiczny Pafos",
        "name_en": "Pafos Archaeological Park",
        "why_pl": "Mozaiki i ruiny rzymskie — UNESCO u wybrzeża.",
        "why_en": "Roman mosaics and ruins — UNESCO by the sea.",
        "activity_slugs": [
          "archaeology",
          "old_towns"
        ],
        "rank": 1
      },
      {
        "day_theme": "nature",
        "name_pl": "Akamas — Blue Lagoon",
        "name_en": "Akamas Blue Lagoon",
        "why_pl": "Wycieczka łodzią lub jeep safari na półwysep.",
        "why_en": "Boat trip or jeep safari to the peninsula.",
        "activity_slugs": [
          "boat_tour",
          "viewpoints"
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
        "why_pl": "Piaszczysta, płytka woda — najlepsza na rodzinne plażowanie.",
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
  }
] as TouristRegion[];
