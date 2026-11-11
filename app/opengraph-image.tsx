import { ImageResponse } from "next/og";

// Imagem de prévia ao compartilhar o link (WhatsApp, LinkedIn etc.)
export const alt = "MyExpenses: finanças pessoais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 45%, #7e22ce 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 700 }}>
          {/* Mesmo desenho de components/common/LogoMarca.tsx (aqui sem hooks, pois roda no gerador de imagem) */}
          <div style={{ display: "flex", borderRadius: 16, border: "2px solid rgba(255,255,255,0.45)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
            <svg width="68" height="68" viewBox="0 0 512 512">
              <defs>
                <linearGradient id="logo-og" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="512" y2="512">
                  <stop offset="0" stopColor="#536DFE" />
                  <stop offset="1" stopColor="#6A3DE8" />
                </linearGradient>
              </defs>
              <rect width="512" height="512" rx="112" fill="url(#logo-og)" />
              <circle cx="256" cy="256" r="150" fill="#fff" />
              <g fill="none" stroke="url(#logo-og)" strokeWidth="27" strokeLinecap="butt" strokeLinejoin="round">
                <path d="M256 150v34M256 330v32" />
                <path d="M300 210C293 192 276 180 254 180C228 180 209 194 209 217C209 241 230 249 256 256C284 264 306 273 306 297C306 320 286 334 257 334C232 334 213 321 206 300" />
              </g>
            </svg>
          </div>
          MyExpenses
        </div>
        <div style={{ marginTop: 40, fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>Minhas finanças,</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, color: "#fde047" }}>em um só lugar</div>
        <div style={{ marginTop: 36, fontSize: 30, color: "#dbeafe" }}>Contas, cartões, investimentos e IR da bolsa</div>
        <div style={{ marginTop: 8, fontSize: 26, color: "#bfdbfe" }}>Next.js 16 · TypeScript · PostgreSQL</div>
      </div>
    ),
    size,
  );
}
