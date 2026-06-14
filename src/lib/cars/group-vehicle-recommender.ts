export type VehicleClass =
  | "economy"
  | "compact"
  | "suv"
  | "wagon"
  | "minivan_7"
  | "minivan_9"
  | "minibus_12";

export type GroupVehicleOption = {
  configuration: "single_vehicle" | "two_vehicles" | "three_vehicles" | "transfer";
  vehicles: Array<{
    class: VehicleClass;
    name_pl: string;
    seats: number;
    estimated_daily_eur: number;
  }>;
  total_capacity: number;
  baggage_capacity: number;
  estimated_daily_total_pln: number;
  pros: string[];
  cons: string[];
  is_recommended: boolean;
  reasoning: string;
};

const VEHICLE_INFO: Record<
  VehicleClass,
  { name_pl: string; seats: number; baggage: number; daily_eur: number }
> = {
  economy: {
    name_pl: "Economy (Toyota Yaris klasy)",
    seats: 5,
    baggage: 2,
    daily_eur: 25,
  },
  compact: {
    name_pl: "Compact (VW Golf klasy)",
    seats: 5,
    baggage: 3,
    daily_eur: 32,
  },
  suv: {
    name_pl: "SUV (Toyota RAV4 klasy)",
    seats: 5,
    baggage: 4,
    daily_eur: 55,
  },
  wagon: {
    name_pl: "Wagon/Combi (Octavia klasy)",
    seats: 5,
    baggage: 4,
    daily_eur: 45,
  },
  minivan_7: {
    name_pl: "Minivan 7-os (Renault Trafic)",
    seats: 7,
    baggage: 7,
    daily_eur: 70,
  },
  minivan_9: {
    name_pl: "Minivan 9-os (Mercedes Vito)",
    seats: 9,
    baggage: 9,
    daily_eur: 95,
  },
  minibus_12: {
    name_pl: "Minibus 12-os",
    seats: 12,
    baggage: 10,
    daily_eur: 130,
  },
};

const EUR_PLN = 4.35;

export function recommendGroupVehicles({
  groupSize,
  childrenUnder12,
  hasSportsBaggage,
  durationDays,
}: {
  groupSize: number;
  childrenUnder12: number;
  hasSportsBaggage: boolean;
  durationDays: number;
}): GroupVehicleOption[] {
  const options: GroupVehicleOption[] = [];

  if (groupSize <= 3) {
    options.push(
      makeOption({
        configuration: "single_vehicle",
        vehicles: [hasSportsBaggage ? "wagon" : "economy"],
        groupSize,
        durationDays,
        isRecommended: true,
        reasoning: `Grupa ${groupSize} osób - jedno auto ${hasSportsBaggage ? "kombi (sprzęt sportowy)" : "kompaktowe"} wystarczy.`,
        pros: ["Najtańsza opcja", "Łatwy parking"],
        cons: hasSportsBaggage ? [] : ["Mało miejsca na sprzęt sportowy"],
      }),
    );
  } else if (groupSize <= 5) {
    const main = hasSportsBaggage || childrenUnder12 > 0 ? "suv" : "compact";
    options.push(
      makeOption({
        configuration: "single_vehicle",
        vehicles: [main],
        groupSize,
        durationDays,
        isRecommended: true,
        reasoning: `Grupa ${groupSize} osób - SUV/wagon mieści wszystkich z bagażem.`,
        pros: [
          "Jedno auto, jeden kierowca",
          main === "suv" ? "Wygodne dla dzieci" : "Niskie spalanie",
        ],
        cons:
          childrenUnder12 > 0
            ? [
                `${childrenUnder12} fotelik${childrenUnder12 === 1 ? "" : "i"} dziecięc${childrenUnder12 === 1 ? "y" : "e"} extra (~8-15€/dzień każdy)`,
              ]
            : [],
      }),
    );
  } else if (groupSize === 6) {
    options.push(
      makeOption({
        configuration: "single_vehicle",
        vehicles: ["minivan_7"],
        groupSize,
        durationDays,
        isRecommended: true,
        reasoning:
          "6 osób + bagaż = van 7-osobowy. Wszyscy razem, jeden parking, jeden kierowca.",
        pros: ["Wszyscy razem", "Dużo miejsca na bagaż"],
        cons: ["Większy parking", "Wyższe spalanie"],
      }),
    );
    options.push(
      makeOption({
        configuration: "two_vehicles",
        vehicles: ["compact", "compact"],
        groupSize,
        durationDays,
        isRecommended: false,
        reasoning:
          "Alternatywa: 2 mniejsze auta - elastyczność, ale 2 kierowców i 2 parkingi.",
        pros: [
          "Niezależność (grupa może się rozdzielać)",
          "Łatwy parking",
        ],
        cons: ["2 kierowców potrzebnych", "Komplikacja logistyczna"],
      }),
    );
  } else if (groupSize <= 8) {
    options.push(
      makeOption({
        configuration: "single_vehicle",
        vehicles: [groupSize === 7 ? "minivan_7" : "minivan_9"],
        groupSize,
        durationDays,
        isRecommended: true,
        reasoning: `${groupSize} osób = van 7/9-osobowy. Rezerwuj wcześniej w sezonie.`,
        pros: ["Wszyscy razem", "Dużo bagażnika"],
        cons: ["Drogie w sezonie", "Trudniej zaparkować"],
      }),
    );
    options.push(
      makeOption({
        configuration: "two_vehicles",
        vehicles: ["suv", "suv"],
        groupSize,
        durationDays,
        isRecommended: false,
        reasoning: "Alternatywa: 2 SUV. Drożej ale więcej elastyczności.",
        pros: [
          "Dwa kierowcy, dwa parkingi (czasem łatwiej)",
          "Backup gdy jedno auto się popsuje",
        ],
        cons: ["2x koszt"],
      }),
    );
  } else if (groupSize <= 12) {
    options.push(
      makeOption({
        configuration: "two_vehicles",
        vehicles: ["minivan_7", "minivan_7"],
        groupSize,
        durationDays,
        isRecommended: true,
        reasoning: `${groupSize} osób = 2 vany 7-os. Najpraktyczniej dla codziennych wyjazdów do atrakcji.`,
        pros: [
          "Wszystko mieści się",
          "Można się rozdzielać (różne tempo zwiedzania)",
        ],
        cons: ["2 kierowców", "2 parkingi"],
      }),
    );
    options.push(
      makeOption({
        configuration: "transfer",
        vehicles: ["minibus_12"],
        groupSize,
        durationDays,
        isRecommended: false,
        reasoning:
          "Alternatywa: minibus 12-os z kierowcą. Nikt nie prowadzi, ale codzienne wyjazdy = drogo.",
        pros: [
          "Nikt nie prowadzi (relaks)",
          "Lokalny kierowca = wie gdzie parkować",
        ],
        cons: [
          "Bardzo drogo na cały tydzień self-drive",
          "Lepsze dla pojedynczych transferów (lotnisko ↔ hotel)",
        ],
      }),
    );
    options.push(
      makeOption({
        configuration: "three_vehicles",
        vehicles: ["compact", "compact", "compact"],
        groupSize,
        durationDays,
        isRecommended: false,
        reasoning:
          "Alternatywa #2: 3 kompaktowe auta. Większa elastyczność ale 3 kierowców.",
        pros: [
          "Maksymalna elastyczność",
          "Każde auto łatwe do zaparkowania",
        ],
        cons: ["3 kierowców", "Konwoje na trasach"],
      }),
    );
  } else {
    options.push(
      makeOption({
        configuration: "transfer",
        vehicles: ["minibus_12"],
        groupSize,
        durationDays,
        isRecommended: true,
        reasoning: `${groupSize} osób - self-drive prawnie i logistycznie trudne. Sugestia: minibus z kierowcą + ewentualne małe auta dodatkowe.`,
        pros: ["Lokalny kierowca", "Bez prawa jazdy w grupie"],
        cons: [
          "Drogie codzienne wynajmowanie",
          "Brak elastyczności godzinowej",
        ],
      }),
    );
  }

  return options;
}

function makeOption({
  configuration,
  vehicles,
  durationDays,
  isRecommended,
  reasoning,
  pros,
  cons,
}: {
  configuration: GroupVehicleOption["configuration"];
  vehicles: VehicleClass[];
  groupSize: number;
  durationDays: number;
  isRecommended: boolean;
  reasoning: string;
  pros: string[];
  cons: string[];
}): GroupVehicleOption {
  void durationDays;

  const vehicleDetails = vehicles.map((v) => ({
    class: v,
    name_pl: VEHICLE_INFO[v].name_pl,
    seats: VEHICLE_INFO[v].seats,
    estimated_daily_eur: VEHICLE_INFO[v].daily_eur,
  }));
  const totalCapacity = vehicles.reduce((s, v) => s + VEHICLE_INFO[v].seats, 0);
  const totalBaggage = vehicles.reduce((s, v) => s + VEHICLE_INFO[v].baggage, 0);
  const dailyTotalEur = vehicles.reduce(
    (s, v) => s + VEHICLE_INFO[v].daily_eur,
    0,
  );

  return {
    configuration,
    vehicles: vehicleDetails,
    total_capacity: totalCapacity,
    baggage_capacity: totalBaggage,
    estimated_daily_total_pln: Math.round(dailyTotalEur * EUR_PLN),
    pros,
    cons,
    is_recommended: isRecommended,
    reasoning,
  };
}
