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
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "#fde047",
              color: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
            }}
          >
            $
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
