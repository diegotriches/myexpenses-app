import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "./adapter";
import { db } from "@/db";
import { users, categorias } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  // Verificar se já tem categorias
  const categoriasExistentes = await db
    .select()
    .from(categorias)
    .where(eq(categorias.userId, userId))
    .limit(1);

  if (categoriasExistentes.length > 0) {
    return; // Já tem categorias
  }

  // Categorias padrão de ENTRADA
  const categoriasEntrada = [
    { nome: "Salário", icon: "FaWallet" },
    { nome: "Freelance", icon: "FaBriefcase" },
    { nome: "Investimentos", icon: "FaPiggyBank" },
    { nome: "Vendas", icon: "FaShoppingBag" },
    { nome: "Aluguel recebido", icon: "FaHome" },
    { nome: "Reembolso", icon: "FaFileInvoiceDollar" },
    { nome: "Prêmios", icon: "FaGift" },
    { nome: "Saldo inicial", icon: "FaMoneyBill" },
    { nome: "Transferência interna", icon: "FaRegCreditCard" },
    { nome: "Outras receitas", icon: "FaMoneyBill" },
  ];

  // Categorias padrão de SAÍDA
  const categoriasSaida = [
    { nome: "Alimentação", icon: "FaUtensils" },
    { nome: "Assinaturas", icon: "FaRegCreditCard" },
    { nome: "Compras", icon: "FaShoppingCart" },
    { nome: "Delivery", icon: "MdFastfood" },
    { nome: "Educação", icon: "FaBook" },
    { nome: "Energia e água", icon: "FaBolt" },
    { nome: "Internet", icon: "FaPhoneAlt" },
    { nome: "Lazer", icon: "FaGamepad" },
    { nome: "Mercado", icon: "MdLocalGroceryStore" },
    { nome: "Moradia", icon: "FaHome" },
    { nome: "Outras despesas", icon: "FaRegSmile" },
    { nome: "Pagamentos", icon: "FaFileInvoiceDollar" },
    { nome: "Pets", icon: "MdPets" },
    { nome: "Presentes", icon: "FaGift" },
    { nome: "Restaurantes", icon: "MdRestaurant" },
    { nome: "Saúde", icon: "FaHeart" },
    { nome: "Transporte", icon: "FaCar" },
    { nome: "Vestuário", icon: "FaTshirt" },
    { nome: "Viagem", icon: "FaPlane" },
  ];

  // Inserir todas de uma vez
  const todasCategorias = [
    ...categoriasEntrada.map(cat => ({ ...cat, tipo: "entrada", userId })),
    ...categoriasSaida.map(cat => ({ ...cat, tipo: "saida", userId })),
  ];

  await db.insert(categorias).values(todasCategorias);

  console.log(`✅ Categorias padrão criadas para usuário ${userId}`);
}