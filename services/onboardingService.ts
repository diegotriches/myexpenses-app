import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * ============================================
 * 🚀 ONBOARDING SERVICE
 * ============================================
 * 
 * Responsável por criar dados iniciais para novos usuários.
 * 
 * Executado automaticamente quando:
 * - Usuário faz login via Google OAuth (signIn callback)
 * - Usuário cria conta via Credentials (createUser event)
 * 
 * Dados criados:
 * - ✅ Categorias padrão (entrada + saída)
 * - 🔜 Preferências de notificação (futuro)
 * - 🔜 Configurações iniciais (futuro)
 * 
 * ============================================
 */

/**
 * Cria todos os dados iniciais para um novo usuário
 * 
 * @param userId - ID do usuário recém-criado
 * @example
 * ```typescript
 * // No callback signIn do NextAuth
 * await criarDadosIniciaisUsuario(user.id);
 * ```
 */
export async function criarDadosIniciaisUsuario(userId: string): Promise<void> {
  try {
    // Criar categorias padrão
    await criarCategoriasIniciais(userId);
    
    // 🔜 Futuras implementações:
    // await criarPreferenciasNotificacao(userId);
    // await criarConfiguracoesIniciais(userId);
    
    console.log(`✅ Dados iniciais criados para usuário ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao criar dados iniciais para usuário ${userId}:`, error);
    // Não lançar erro para não bloquear o login/registro
  }
}

/**
 * Cria categorias padrão para um novo usuário
 * 
 * Categorias criadas:
 * - 10 categorias de ENTRADA (Salário, Freelance, Investimentos, etc)
 * - 19 categorias de SAÍDA (Alimentação, Transporte, Saúde, etc)
 * 
 * Total: 29 categorias
 * 
 * @param userId - ID do usuário
 */
async function criarCategoriasIniciais(userId: string): Promise<void> {
  try {
    // ============================================
    // 1. VERIFICAR SE JÁ TEM CATEGORIAS
    // ============================================
    const categoriasExistentes = await db
      .select()
      .from(categorias)
      .where(eq(categorias.userId, userId))
      .limit(1);

    if (categoriasExistentes.length > 0) {
      console.log(`ℹ️ Usuário ${userId} já possui categorias`);
      return; // Já tem categorias, não precisa criar
    }

    // ============================================
    // 2. DEFINIR CATEGORIAS PADRÃO
    // ============================================
    
    // 📥 CATEGORIAS DE ENTRADA (10 categorias)
    const categoriasEntrada = [
      { nome: "Salário", icone: "FaWallet" },
      { nome: "Freelance", icone: "FaBriefcase" },
      { nome: "Investimentos", icone: "FaPiggyBank" },
      { nome: "Vendas", icone: "FaShoppingBag" },
      { nome: "Aluguel recebido", icone: "FaHome" },
      { nome: "Reembolso", icone: "FaFileInvoiceDollar" },
      { nome: "Prêmios", icone: "FaGift" },
      { nome: "Saldo inicial", icone: "FaMoneyBill" },
      { nome: "Transferência interna", icone: "FaRegCreditCard" },
      { nome: "Outras receitas", icone: "FaMoneyBill" },
    ];

    // 📤 CATEGORIAS DE SAÍDA (19 categorias)
    const categoriasSaida = [
      { nome: "Alimentação", icone: "FaUtensils" },
      { nome: "Assinaturas", icone: "FaRegCreditCard" },
      { nome: "Compras", icone: "FaShoppingCart" },
      { nome: "Delivery", icone: "MdFastfood" },
      { nome: "Educação", icone: "FaBook" },
      { nome: "Energia e água", icone: "FaBolt" },
      { nome: "Internet", icone: "FaPhoneAlt" },
      { nome: "Lazer", icone: "FaGamepad" },
      { nome: "Mercado", icone: "MdLocalGroceryStore" },
      { nome: "Moradia", icone: "FaHome" },
      { nome: "Outras despesas", icone: "FaRegSmile" },
      { nome: "Pagamentos", icone: "FaFileInvoiceDollar" },
      { nome: "Pets", icone: "MdPets" },
      { nome: "Presentes", icone: "FaGift" },
      { nome: "Restaurantes", icone: "MdRestaurant" },
      { nome: "Saúde", icone: "FaHeart" },
      { nome: "Transporte", icone: "FaCar" },
      { nome: "Vestuário", icone: "FaTshirt" },
      { nome: "Viagem", icone: "FaPlane" },
    ];

    // ============================================
    // 3. PREPARAR DADOS PARA INSERÇÃO
    // ============================================
    const todasCategorias = [
      // Mapear categorias de entrada
      ...categoriasEntrada.map(cat => ({
        id: uuidv4(),
        userId,
        nome: cat.nome,
        tipo: "entrada" as const,
        icone: cat.icone,
      })),
      // Mapear categorias de saída
      ...categoriasSaida.map(cat => ({
        id: uuidv4(),
        userId,
        nome: cat.nome,
        tipo: "saida" as const,
        icone: cat.icone,
      })),
    ];

    // ============================================
    // 4. INSERIR TODAS DE UMA VEZ (BATCH INSERT)
    // ============================================
    await db.insert(categorias).values(todasCategorias);

    console.log(
      `✅ ${todasCategorias.length} categorias padrão criadas para usuário ${userId} ` +
      `(${categoriasEntrada.length} entrada + ${categoriasSaida.length} saída)`
    );
  } catch (error) {
    console.error(`❌ Erro ao criar categorias para usuário ${userId}:`, error);
    throw error; // Re-lançar para que criarDadosIniciaisUsuario() capture
  }
}

/**
 * 🔜 FUTURO: Criar preferências de notificação padrão
 * 
 * @param userId - ID do usuário
 */
// async function criarPreferenciasNotificacao(userId: string): Promise<void> {
//   try {
//     await db.insert(preferenciasNotificacao).values({
//       userId,
//       faturas: true,
//       limiteCartao: true,
//       saldoBaixo: true,
//       transacoesAltas: false,
//       diasAntesVencimento: 3,
//       limiteMinimoConta: 100,
//     });
//     console.log(`✅ Preferências de notificação criadas para usuário ${userId}`);
//   } catch (error) {
//     console.error(`❌ Erro ao criar preferências para usuário ${userId}:`, error);
//   }
// }

/**
 * 🔜 FUTURO: Criar configurações iniciais
 * 
 * @param userId - ID do usuário
 */
// async function criarConfiguracoesIniciais(userId: string): Promise<void> {
//   // Tema padrão, formato de data, etc
// }

// ============================================
// 📊 ESTATÍSTICAS
// ============================================

/**
 * Obtém estatísticas de onboarding (para analytics)
 * 
 * @param userId - ID do usuário
 * @returns Estatísticas de dados criados
 */
export async function obterEstatisticasOnboarding(userId: string) {
  const [result] = await db
    .select({
      totalCategorias: db.$count(categorias, eq(categorias.userId, userId)),
    })
    .from(categorias)
    .where(eq(categorias.userId, userId));

  return {
    categorias: result?.totalCategorias || 0,
    // preferencias: ... (futuro)
    // configuracoes: ... (futuro)
  };
}