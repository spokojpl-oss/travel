import { ogImageResponse } from "@/lib/brand/logo-image-response";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Travel.app — planuj wakacje od aktywności";

export default function OpenGraphImage() {
  return ogImageResponse();
}
