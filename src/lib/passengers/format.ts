export type PassengerBreakdown = {
  adults: number;
  children: number;
  childAges: number[];
};

export function defaultPassengers(): PassengerBreakdown {
  return { adults: 2, children: 0, childAges: [] };
}

function formatChildAgeSegment(age: number): string {
  return `${age} lat`;
}

export function formatPassengers(p: PassengerBreakdown): string {
  const parts: string[] = [];
  if (p.adults === 1) parts.push("1 dorosły");
  else parts.push(`${p.adults} dorosłych`);

  if (p.children === 1) {
    const age = p.childAges[0] ?? 8;
    parts.push(`1 dziecko (${formatChildAgeSegment(age)})`);
  } else if (p.children > 1) {
    const ages = p.childAges
      .slice(0, p.children)
      .map((a) => formatChildAgeSegment(a ?? 8));
    parts.push(`${p.children} dzieci (${ages.join(", ")})`);
  }

  return parts.join(", ");
}

export function parsePassengers(text: string): PassengerBreakdown {
  const fallback = defaultPassengers();
  if (!text.trim()) return fallback;

  const adultsMatch = text.match(/(\d+)\s+dorosł/i);
  const childrenMatch = text.match(/(\d+)\s+dziec/i);

  const adults = adultsMatch ? Number(adultsMatch[1]) : fallback.adults;
  const children = childrenMatch ? Number(childrenMatch[1]) : 0;
  const childAges = [...text.matchAll(/(\d+)\s*lat/gi)].map((m) =>
    Number(m[1]),
  );

  while (childAges.length < children) childAges.push(8);

  return {
    adults: Math.min(Math.max(adults, 1), 9),
    children: Math.min(Math.max(children, 0), 6),
    childAges: childAges.slice(0, children),
  };
}
