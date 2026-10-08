import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Quiero Café — Precios de café de especialidad en Argentina";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5eee1",
          color: "#1b120a",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 10,
            color: "#c04106",
          }}
        >
          COMPARADOR DE PRECIOS
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 900,
            marginTop: 28,
            letterSpacing: -5,
          }}
        >
          <span>Quiero </span>
          <span style={{ color: "#c04106" }}>Cafe</span>
        </div>
        <div style={{ fontSize: 42, color: "#6e6154", marginTop: 24 }}>
          Café de especialidad de 11 tostadores argentinos
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            background: "#1b120a",
            color: "#f5eee1",
            fontSize: 30,
            padding: "18px 48px",
            borderRadius: 999,
          }}
        >
          Precio por kilo comparable · datos a diario
        </div>
      </div>
    ),
    { ...size },
  );
}
