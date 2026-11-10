import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes das regras puras (utils e funções sem banco de lib).
// TZ=UTC reproduz o servidor da Vercel: as regras de data não podem depender do fuso da máquina.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    environment: "node",
    env: { TZ: "UTC" },
  },
});
