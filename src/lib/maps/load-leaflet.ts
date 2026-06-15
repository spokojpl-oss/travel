let leafletPromise: Promise<typeof L> | null = null;

function loadStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load ${href}`));
    document.head.appendChild(link);
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export async function loadLeaflet(): Promise<typeof L> {
  if (leafletPromise) return leafletPromise;

  leafletPromise = (async () => {
    await loadStylesheet("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    if (typeof window !== "undefined" && "L" in window) {
      return (window as Window & { L: typeof L }).L;
    }
    await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
    const leaflet = (window as Window & { L?: typeof L }).L;
    if (!leaflet) {
      throw new Error("Leaflet failed to initialize");
    }
    return leaflet;
  })();

  return leafletPromise;
}
