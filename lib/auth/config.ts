import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "./adapter";
import { db } from "@/db";
import { users, categorias } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(),

  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Permite vincular contas com mesmo email
    }),

    // Login com Email/Senha (opcional)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios");
        }

        // Buscar usuário
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        if (!user || !user.password) {
          throw new Error("Usuário não encontrado");
        }

        // Verificar senha
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Senha incorreta");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  pages: {
    signIn: "/auth/signin", // Página customizada de login
    // signOut: "/auth/signout",
    // error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Adicionar userId ao token na primeira vez
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Adicionar userId à sessão
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // Criar categorias padrão para novos usuários
      if (account?.provider === "google" && user.id) {
        await criarCategoriasIniciaisSeNecessario(user.id);
      }
      return true;
    },
  },

  events: {
    async createUser({ user }) {
      // Criar categorias padrão quando criar usuário via credentials
      if (user.id) {
        await criarCategoriasIniciaisSeNecessario(user.id);
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
};

// Função auxiliar para criar categorias padrão
async function criarCategoriasIniciaisSeNecessario(userId: string) {
  try {
    // Verificar se já tem categorias
    const categoriasExistentes = await db
      .select()
      .from(categorias)
      .where(eq(categorias.userId, userId))
      .limit(1);

    if (categoriasExistentes.length > 0) {
      return; // Já tem categorias
    }

    // ✅ CORREÇÃO: Usar 'icone' ao invés de 'icon'
    // Categorias padrão de ENTRADA
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

    // Categorias padrão de SAÍDA
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

    // ✅ Inserir todas de uma vez COM UUID e userId
    const todasCategorias = [
      ...categoriasEntrada.map(cat => ({
        id: uuidv4(),
        userId,
        nome: cat.nome,
        tipo: "entrada",
        icone: cat.icone,
      })),
      ...categoriasSaida.map(cat => ({
        id: uuidv4(),
        userId,
        nome: cat.nome,
        tipo: "saida",
        icone: cat.icone,
      })),
    ];

    await db.insert(categorias).values(todasCategorias);

    console.log(`✅ Categorias padrão criadas para usuário ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao criar categorias para usuário ${userId}:`, error);
    // Não lançar erro para não bloquear o login/registro
  }
}