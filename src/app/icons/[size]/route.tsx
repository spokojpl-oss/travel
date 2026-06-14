import { logoImageResponse } from "@/lib/brand/logo-image-response";

const ALLOWED = new Set([72, 96, 128, 144, 152, 192, 384, 512]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await params;
  const maskable = sizeParam.endsWith("-maskable");
  const num = parseInt(maskable ? sizeParam.replace("-maskable", "") : sizeParam, 10);

  if (!ALLOWED.has(num)) {
    return new Response("Not found", { status: 404 });
  }

  return logoImageResponse(num, maskable);
}
