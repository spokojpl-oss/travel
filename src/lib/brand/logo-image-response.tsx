import { ImageResponse } from "next/og";

export type LogoIconOptions = {
  size: number;
  maskable?: boolean;
};

/** JSX do ImageResponse — pół słońce / pół księżyc. */
export function LogoIconJsx({ size, maskable = false }: LogoIconOptions) {
  const pad = maskable ? size * 0.18 : 0;
  const inner = size - pad * 2;
  const radius = inner * 0.25;
  const sun = inner * 0.52;
  const moon = inner * 0.42;
  const moonCut = inner * 0.36;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? "#001b4a" : "transparent",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          display: "flex",
          borderRadius: radius,
          background: "linear-gradient(135deg, #001b4a 0%, #002d7a 100%)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Słońce — lewa połowa */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              width: sun,
              height: sun,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ffb347 0%, #ff5b00 100%)",
              marginRight: -sun * 0.15,
            }}
          />
        </div>

        {/* Księżyc — prawa połowa */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: inner * 0.14,
              left: inner * 0.04,
              width: moon,
              height: moon,
              borderRadius: "50%",
              background: "#f0f5fc",
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: inner * 0.08,
              left: inner * 0.18,
              width: moonCut,
              height: moonCut,
              borderRadius: "50%",
              background: "#002d7a",
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: inner * 0.12,
              left: inner * 0.06,
              width: inner * 0.055,
              height: inner * 0.055,
              borderRadius: "50%",
              background: "#aac3e9",
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: inner * 0.22,
              left: inner * 0.28,
              width: inner * 0.04,
              height: inner * 0.04,
              borderRadius: "50%",
              background: "#7ba3dd",
            }}
          />
        </div>

        {/* Oś podziału */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: "50%",
            top: inner * 0.12,
            width: 1,
            height: inner * 0.76,
            background: "rgba(255,255,255,0.12)",
            transform: "translateX(-50%)",
          }}
        />
      </div>
    </div>
  );
}

export function logoImageResponse(
  size: number,
  maskable = false,
): ImageResponse {
  return new ImageResponse(
    <LogoIconJsx size={size} maskable={maskable} />,
    { width: size, height: size },
  );
}

export function ogImageResponse(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(135deg, #001b4a 0%, #002d7a 60%, #001b4a 100%)",
          padding: 80,
        }}
      >
        <LogoIconJsx size={280} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 64,
            color: "white",
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>
            Travel.app
          </div>
          <div style={{ fontSize: 32, color: "#aac3e9", marginTop: 16 }}>
            Planuj wakacje od aktywności
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
