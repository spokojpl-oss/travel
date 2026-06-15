import { NextResponse } from "next/server";
import { fetchDestinationHeroImage } from "@/lib/api/destination-hero-image";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const label = searchParams.get("label")?.trim();

  if (!label || label.length < 2) {
    return NextResponse.json({ error: "Missing label" }, { status: 400 });
  }

  try {
    const image_url = await fetchDestinationHeroImage(label);
    return NextResponse.json({ image_url });
  } catch {
    return NextResponse.json({ image_url: null });
  }
}
