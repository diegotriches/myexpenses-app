import { drizzle } from "drizzle-orm/neon-http";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import * as schema from "./schema";

// ============================================================================
// TIPOS
// ============================================================================

interface DatabaseConfig {
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
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
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  connectionTimeout: 10000, // 10 segundos
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
// FUNÇÃO DE CONEXÃO COM RETRY
// ============================================================================

/**
 * Tenta conectar ao banco de dados com retry automático
 */
async function connectWithRetry(
  url: string,
  attempt: number = 1
): Promise<NeonQueryFunction<false, false>> {
  try {
    logger.info(`Tentativa ${attempt}/${config.maxRetries} de conexão...`);

    // Criar cliente Neon HTTP
    const sql = neon(url);

    // Teste de conexão simples (query básica)
    await sql`SELECT 1`;

    logger.info("✅ Conexão estabelecida com sucesso!");
    return sql;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    logger.error(`Falha na tentativa ${attempt}:`, errorMessage);

    // Se atingiu o limite de tentativas, lançar erro
    if (attempt >= config.maxRetries) {
      logger.error("❌ Todas as tentativas de conexão falharam");
      throw new Error(
        `❌ Falha ao conectar ao banco de dados após ${config.maxRetries} tentativas.\n` +
          `Último erro: ${errorMessage}\n` +
          `Verifique:\n` +
          `1. Se a DATABASE_URL está correta\n` +
          `2. Se o banco de dados está acessível\n` +
          `3. Se as credenciais estão válidas`
      );
    }

    // Aguardar antes de tentar novamente (exponential backoff)
    const delay = config.retryDelay * attempt;
    logger.warn(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Tentar novamente
    return connectWithRetry(url, attempt + 1);
  }
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

/**
 * Inicializa a conexão com o banco de dados
 */
async function initializeDatabase(): Promise<DrizzleDB> {
  try {
    // 1. Validar DATABASE_URL
    const databaseUrl = validateDatabaseUrl(process.env.DATABASE_URL);

    // 2. Conectar com retry
    const sql = await connectWithRetry(databaseUrl);

    // 3. Inicializar Drizzle com o schema
    const db = drizzle(sql, { schema });

    // 4. Log de sucesso
    logger.info("🚀 Drizzle ORM inicializado com sucesso");

    return db;
  } catch (error) {
    logger.error("Falha crítica na inicialização do banco de dados");
    throw error;
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let dbInstance: DrizzleDB | null = null;
let initPromise: Promise<DrizzleDB> | null = null;

/**
 * Versão assíncrona - garante que o banco está inicializado
 * USE ESTA em API Routes e Server Components
 */
export async function getDb(): Promise<DrizzleDB> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!initPromise) {
    initPromise = initializeDatabase().then((db) => {
      dbInstance = db;
      return db;
    });
  }

  return initPromise;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Verifica se a conexão com o banco está saudável
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const db = await getDb();
    // Query simples para verificar conexão
    const sql = neon(process.env.DATABASE_URL!);
    await sql`SELECT 1`;
    logger.info("✅ Health check passou");
    return true;
  } catch (error) {
    logger.error("❌ Health check falhou:", error);
    return false;
  }
}

// ============================================================================
// EXPORT COMPATÍVEL COM CÓDIGO EXISTENTE
// ============================================================================

// Validar DATABASE_URL na importação
const databaseUrl = validateDatabaseUrl(process.env.DATABASE_URL);

// Criar cliente Neon HTTP (síncrono)
const sql = neon(databaseUrl);

// Inicializar Drizzle com o schema (síncrono)
export const db = drizzle(sql, { schema });

// Log de inicialização (apenas em desenvolvimento)
if (process.env.NODE_ENV === "development") {
  console.log("✅ Drizzle conectado ao Neon (HTTP)");
}

// ============================================================================
// EXPORTS ADICIONAIS
// ============================================================================

export { schema };
export type { DatabaseConfig, LogLevel, DrizzleDB };