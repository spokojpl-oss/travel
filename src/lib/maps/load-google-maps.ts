import type { Locale } from "@/i18n/config";
import { DEFAULT_LOCALE } from "@/i18n/config";

const googleMapsPromises = new Map<string, Promise<typeof google.maps>>();

type GoogleMapsWindow = Window & {
  google?: { maps: typeof google.maps };
};

function isLanguageLoaded(language: Locale): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(`script[data-travel-lang="${language}"]`) &&
      (window as GoogleMapsWindow).google?.maps,
  );
}

export function loadGoogleMaps(
  apiKey: string,
  language: Locale = DEFAULT_LOCALE,
): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps dostępne tylko w przeglądarce"));
  }

  const win = window as GoogleMapsWindow;
  const cacheKey = `${apiKey}:${language}`;

  if (isLanguageLoaded(language)) {
    return Promise.resolve(win.google!.maps);
  }

  const existing = googleMapsPromises.get(cacheKey);
  if (existing) return existing;

  const promise = new Promise<typeof google.maps>((resolve, reject) => {
    const callbackName = `__travelGoogleMapsInit_${language}`;

    (win as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (win as unknown as Record<string, unknown>)[callbackName];
      if (win.google?.maps) {
        resolve(win.google.maps);
      } else {
        reject(new Error("Google Maps nie zainicjalizowało się"));
      }
    };

    const params = new URLSearchParams({
      key: apiKey,
      callback: callbackName,
      loading: "async",
      language,
    });

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.travelLang = language;
    script.onerror = () => {
      googleMapsPromises.delete(cacheKey);
      reject(new Error("Nie udało się załadować Google Maps"));
    };
    document.head.appendChild(script);
  });

  googleMapsPromises.set(cacheKey, promise);
  return promise;
}
