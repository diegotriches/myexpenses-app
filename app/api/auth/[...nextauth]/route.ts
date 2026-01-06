import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@/lib/auth/adapter";
import { db } from "@/db";
import { users, categorias } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";

// Função auxiliar para criar categorias padrão
async function criarCategoriasIniciaisSeNecessario(userId: string) {
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

  // ✅ Inserir todas de uma vez com campo 'icone'
  const todasCategorias = [
    ...categoriasEntrada.map((cat) => ({ 
      ...cat, 
      tipo: "entrada", 
      userId,
    })),
    ...categoriasSaida.map((cat) => ({ 
      ...cat, 
      tipo: "saida", 
      userId,
    })),
  ];

  await db.insert(categorias).values(todasCategorias);
  
  console.log(`✅ ${todasCategorias.length} categorias padrão criadas para usuário ${userId}`);
}

export const authOptions: AuthOptions = {
  adapter: DrizzleAdapter(),
  
  providers: [
    // 🔵 Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Permite vincular contas com mesmo email
    }),

    // 🔐 Login com Email/Senha
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

        // Buscar usuário no DB
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
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Adicionar userId ao token na primeira vez
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Adicionar userId à sessão
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },

    async signIn({ user, account }) {
      // Criar categorias padrão para novos usuários OAuth
      if (user?.id) {
        try {
          await criarCategoriasIniciaisSeNecessario(user.id);
        } catch (error) {
          console.error("Erro ao criar categorias:", error);
          // Não bloquear login se categorias falharem
        }
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };