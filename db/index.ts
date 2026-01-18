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
  maxRetries: number;
  retryDelay: number;
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
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
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
// FUNÇÃO DE CONEXÃO COM RETRY
// ============================================================================

/**
 * Tenta conectar ao banco de dados com retry automático
 */
async function connectWithRetry(
  url: string,
  attempt: number = 1
): Promise<Pool> {
  try {
    logger.info(`Tentativa ${attempt}/${config.maxRetries} de conexão (neon-serverless)...`);

    // Criar Pool de conexões Neon Serverless (suporta transações)
    const pool = new Pool({
      connectionString: url,
      max: config.poolSize,
      idleTimeoutMillis: 30000, // 30 segundos
      connectionTimeoutMillis: config.connectionTimeout,
    });

    // Teste de conexão simples
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    logger.info("✅ Conexão estabelecida com sucesso! (Transações habilitadas)");
    return pool;
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
          `3. Se as credenciais estão válidas\n` +
          `4. Se a porta WebSocket está aberta (transações)`
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
    const pool = await connectWithRetry(databaseUrl);

    // 3. Inicializar Drizzle com o schema
    const db = drizzle(pool, { schema });

    // 4. Log de sucesso
    logger.info("🚀 Drizzle ORM inicializado com neon-serverless (transações habilitadas)");

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
let poolInstance: Pool | null = null;

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
    if (poolInstance) {
      const client = await poolInstance.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info("✅ Health check passou");
      return true;
    }
    return false;
  } catch (error) {
    logger.error("❌ Health check falhou:", error);
    return false;
  }
}

/**
 * Fecha o pool de conexões (útil em testes ou shutdown graceful)
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
    initPromise = null;
    logger.info("🔌 Pool de conexões fechado");
  }
}

// ============================================================================
// EXPORT COMPATÍVEL COM CÓDIGO EXISTENTE (SÍNCRONO)
// ============================================================================

// Validar DATABASE_URL na importação
const databaseUrl = validateDatabaseUrl(process.env.DATABASE_URL);

// Criar Pool síncrono (para compatibilidade com código existente)
poolInstance = new Pool({
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