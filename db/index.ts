import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";
import ws from "ws";

// ============================================================================
// CONFIGURAÇÃO WEBSOCKET (necessário para transações)
// ============================================================================

// ✅ Configurar WebSocket apenas no Node.js (não no Edge Runtime)
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as any;
}

// ============================================================================
// TIPOS
// ============================================================================

interface DatabaseConfig {
  connectionTimeout: number;
  poolSize: number;
}

interface LogLevel {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

// Tipo para o retorno do Drizzle
type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const config: DatabaseConfig = {
  connectionTimeout: 10000, // 10 segundos
  poolSize: 10, // Máximo de conexões simultâneas
};

// Logger simples (pode ser substituído por winston, pino, etc)
const logger: LogLevel = {
  info: (...args) => {
    if (process.env.NODE_ENV === "development") {
      console.log("ℹ️ [DB]", ...args);
    }
  },
  warn: (...args) => console.warn("⚠️ [DB]", ...args),
  error: (...args) => console.error("❌ [DB]", ...args),
};

// ============================================================================
// VALIDAÇÕES
// ============================================================================

/**
 * Valida se a DATABASE_URL está presente e no formato correto
 */
function validateDatabaseUrl(url: string | undefined): string {
  // Verificar se existe
  if (!url) {
    logger.error("DATABASE_URL não está definida");
    throw new Error(
      "❌ DATABASE_URL não está definida no .env ou .env.local\n" +
        "Configure a variável de ambiente DATABASE_URL com a URL de conexão do Neon."
    );
  }

  // Verificar formato básico
  const urlPattern = /^postgres(?:ql)?:\/\/.+/i;
  if (!urlPattern.test(url)) {
    logger.error("DATABASE_URL está em formato inválido:", url.substring(0, 20) + "...");
    throw new Error(
      "❌ DATABASE_URL está em formato inválido\n" +
        "Formato esperado: postgresql://user:password@host/database\n" +
        "Exemplo: postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/mydb"
    );
  }

  // Verificar se contém credenciais
  if (!url.includes("@") || !url.includes(":")) {
    logger.warn("DATABASE_URL pode estar incompleta (faltam credenciais)");
  }

  logger.info("DATABASE_URL validada com sucesso");
  return url;
}

// ============================================================================
// EXPORT COMPATÍVEL COM CÓDIGO EXISTENTE (SÍNCRONO)
// ============================================================================

// Validar DATABASE_URL na importação
const databaseUrl = validateDatabaseUrl(process.env.DATABASE_URL);

// Criar Pool síncrono (para compatibilidade com código existente)
const poolInstance = new Pool({
  connectionString: databaseUrl,
  max: config.poolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: config.connectionTimeout,
});

// Inicializar Drizzle com o schema (síncrono)
export const db = drizzle(poolInstance, { schema });

// Log de inicialização (apenas em desenvolvimento)
if (process.env.NODE_ENV === "development") {
  console.log("✅ Drizzle conectado ao Neon (neon-serverless com transações)");
  console.log("🔄 WebSocket habilitado para transações ACID");
}

// ============================================================================
// EXPORTS ADICIONAIS
// ============================================================================

export { schema };
export type { DatabaseConfig, LogLevel, DrizzleDB };