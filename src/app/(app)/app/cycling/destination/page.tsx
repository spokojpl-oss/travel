import { redirect } from "next/navigation";

/** Legacy URL — jedna strona destynacji pod /app/destination */
export default async function CyclingDestinationRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
  }
  redirect(`/app/destination?${qs.toString()}`);
}
