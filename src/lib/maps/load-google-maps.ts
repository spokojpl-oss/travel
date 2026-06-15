let googleMapsPromise: Promise<typeof google.maps> | null = null;

type GoogleMapsWindow = Window & {
  google?: { maps: typeof google.maps };
  __travelGoogleMapsInit?: () => void;
};

export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps dostępne tylko w przeglądarce"));
  }

  const win = window as GoogleMapsWindow;

  if (win.google?.maps) {
    return Promise.resolve(win.google.maps);
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      win.__travelGoogleMapsInit = () => {
        delete win.__travelGoogleMapsInit;
        if (win.google?.maps) {
          resolve(win.google.maps);
        } else {
          reject(new Error("Google Maps nie zainicjalizowało się"));
        }
      };

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__travelGoogleMapsInit&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        googleMapsPromise = null;
        reject(new Error("Nie udało się załadować Google Maps"));
      };
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}
