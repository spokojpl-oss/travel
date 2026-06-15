import type { GroupMember } from "@/types/domain";

export type PassengerBreakdown = {
  adults: number;
  children: number;
  childAges: number[];
};

export function passengersFromGroupMembers(
  members: Pick<GroupMember, "member_type" | "age">[],
): PassengerBreakdown {
  let adults = 0;
  let children = 0;
  const childAges: number[] = [];

  for (const m of members) {
    if (m.member_type === "child" || m.member_type === "infant") {
      children += 1;
      childAges.push(m.age ?? 8);
    } else {
      adults += 1;
    }
  }

  if (adults < 1) adults = 1;

  return {
    adults: Math.min(adults, 9),
    children: Math.min(children, 6),
    childAges: childAges.slice(0, children),
  };
}

export function formatPassengerBreakdown(p: PassengerBreakdown): string {
  const parts: string[] = [];
  if (p.adults === 1) parts.push("1 dorosły");
  else parts.push(`${p.adults} dorosłych`);

  if (p.children === 1) {
    const age = p.childAges[0];
    parts.push(
      age != null && age > 0 ? `1 dziecko (${age} lat)` : "1 dziecko",
    );
  } else if (p.children > 1) {
    const ages = p.childAges
      .slice(0, p.children)
      .filter((a) => a > 0)
      .map((a) => `${a} lat`);
    parts.push(
      ages.length > 0
        ? `${p.children} dzieci (${ages.join(", ")})`
        : `${p.children} dzieci`,
    );
  }

  return parts.join(", ");
}
