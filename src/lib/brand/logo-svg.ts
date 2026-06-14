export type LogoSvgOptions = {
  idPrefix?: string;
  bgStart?: string;
  bgEnd?: string;
};

/** Wspólne SVG logo — źródło dla komponentu React i generatora PNG. */
export function logoMarkSvg({
  idPrefix = "logo",
  bgStart = "#001b4a",
  bgEnd = "#002d7a",
}: LogoSvgOptions = {}): string {
  const left = `${idPrefix}-left`;
  const right = `${idPrefix}-right`;
  const sunGrad = `${idPrefix}-sun`;
  const bgGrad = `${idPrefix}-bg`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">
  <defs>
    <clipPath id="${left}"><rect x="0" y="0" width="18" height="36"/></clipPath>
    <clipPath id="${right}"><rect x="18" y="0" width="18" height="36"/></clipPath>
    <linearGradient id="${sunGrad}" x1="8" y1="8" x2="22" y2="28">
      <stop offset="0%" stop-color="#ffb347"/>
      <stop offset="100%" stop-color="#ff5b00"/>
    </linearGradient>
    <linearGradient id="${bgGrad}" x1="0" y1="0" x2="36" y2="36">
      <stop offset="0%" stop-color="${bgStart}"/>
      <stop offset="100%" stop-color="${bgEnd}"/>
    </linearGradient>
  </defs>
  <rect width="36" height="36" rx="9" fill="url(#${bgGrad})"/>
  <g clip-path="url(#${left})">
    <circle cx="18" cy="18" r="9.5" fill="url(#${sunGrad})"/>
    <g stroke="#ff8c33" stroke-width="1.4" stroke-linecap="round">
      <line x1="18" y1="5.5" x2="18" y2="8.2"/>
      <line x1="18" y1="27.8" x2="18" y2="30.5"/>
      <line x1="8.2" y1="18" x2="5.5" y2="18"/>
      <line x1="27.8" y1="18" x2="30.5" y2="18"/>
      <line x1="10.4" y1="10.4" x2="8.4" y2="8.4"/>
      <line x1="25.6" y1="25.6" x2="27.6" y2="27.6"/>
      <line x1="10.4" y1="25.6" x2="8.4" y2="27.6"/>
    </g>
  </g>
  <g clip-path="url(#${right})">
    <circle cx="24" cy="16" r="8.5" fill="#f0f5fc"/>
    <circle cx="27.5" cy="14" r="7.5" fill="url(#${bgGrad})"/>
    <circle cx="22" cy="26" r="1" fill="#aac3e9"/>
    <circle cx="28" cy="24" r="0.7" fill="#7ba3dd"/>
    <circle cx="25" cy="29" r="0.5" fill="#aac3e9"/>
  </g>
  <line x1="18" y1="6" x2="18" y2="30" stroke="white" stroke-opacity="0.12" stroke-width="0.75"/>
</svg>`;
}

/** Maskable PWA — logo wycentrowane z paddingiem (safe zone ~80%). */
export function logoMarkMaskableSvg(options: LogoSvgOptions = {}): string {
  const inner = logoMarkSvg({ ...options, idPrefix: `${options.idPrefix ?? "mask"}-m` });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#001b4a"/>
  <g transform="translate(100 100) scale(8.89)">
    ${inner.replace(/^<svg[^>]*>|<\/svg>$/g, "")}
  </g>
</svg>`;
}
