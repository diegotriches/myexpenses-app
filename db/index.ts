import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Validar que a DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL não está definida no .env.local");
}

// Criar cliente Neon HTTP
const sql = neon(process.env.DATABASE_URL);

// Inicializar Drizzle com o schema
export const db = drizzle(sql, { schema });

// Log de inicialização (apenas em desenvolvimento)
if (process.env.NODE_ENV === "development") {
  console.log("✅ Drizzle conectado ao Neon (HTTP)");
}