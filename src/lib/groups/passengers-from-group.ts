import type { GroupMember } from "@/types/domain";
import {
  formatPassengers,
  type PassengerBreakdown,
} from "@/lib/passengers/format";

export type { PassengerBreakdown };

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
  return formatPassengers(p);
}
