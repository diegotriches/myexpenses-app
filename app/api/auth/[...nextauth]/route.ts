import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@/lib/auth/adapter";
import { db } from "@/db";
import { users, categorias } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import { v4 as uuidv4 } from "uuid";

// ⚠️ VALIDAÇÃO CRÍTICA: Verificar variáveis de ambiente em produção
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("❌ NEXTAUTH_SECRET não está configurado nas variáveis de ambiente");
}

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL não está configurado nas variáveis de ambiente");
}

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  console.warn("⚠️ NEXTAUTH_URL não está configurado. Isso pode causar problemas em produção.");
}

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
      console.log(`✅ Usuário ${userId} já possui categorias`);
      return; // Já tem categorias
    }

    // Categorias padrão de ENTRADA
    const categoriasEntrada = [
      { nome: "Salário", icone: "DollarSign" },
      { nome: "Freelance", icone: "Briefcase" },
      { nome: "Investimentos", icone: "TrendingUp" },
      { nome: "Vendas", icone: "ShoppingCart" },
      { nome: "Prêmios", icone: "Award" },
      { nome: "Presentes", icone: "Gift" },
      { nome: "Restituição", icone: "RefreshCw" },
      { nome: "Aluguel Recebido", icone: "Home" },
      { nome: "Bonificação", icone: "Star" },
      { nome: "Outros Recebimentos", icone: "PlusCircle" },
    ];

    // Categorias padrão de SAÍDA
    const categoriasSaida = [
      { nome: "Alimentação", icone: "Utensils" },
      { nome: "Transporte", icone: "Car" },
      { nome: "Moradia", icone: "Home" },
      { nome: "Saúde", icone: "Heart" },
      { nome: "Educação", icone: "BookOpen" },
      { nome: "Lazer", icone: "Gamepad2" },
      { nome: "Compras", icone: "ShoppingBag" },
      { nome: "Vestuário", icone: "Shirt" },
      { nome: "Beleza", icone: "Sparkles" },
      { nome: "Pets", icone: "Dog" },
      { nome: "Viagens", icone: "Plane" },
      { nome: "Academia", icone: "Dumbbell" },
      { nome: "Streaming", icone: "Tv" },
      { nome: "Telefone", icone: "Phone" },
      { nome: "Internet", icone: "Wifi" },
      { nome: "Impostos", icone: "FileText" },
      { nome: "Seguros", icone: "Shield" },
      { nome: "Dívidas", icone: "CreditCard" },
      { nome: "Outros Gastos", icone: "MinusCircle" },
    ];

    // Inserir todas de uma vez com UUID
    const todasCategorias = [
      ...categoriasEntrada.map((cat) => ({ 
        id: uuidv4(),
        nome: cat.nome,
        icone: cat.icone,
        tipo: "entrada" as const,
        userId,
      })),
      ...categoriasSaida.map((cat) => ({ 
        id: uuidv4(),
        nome: cat.nome,
        icone: cat.icone,
        tipo: "saida" as const,
        userId,
      })),
    ];

    await db.insert(categorias).values(todasCategorias);
    
    console.log(`✅ ${todasCategorias.length} categorias criadas para usuário ${userId}`);
  } catch (error) {
    console.error("❌ Erro ao criar categorias iniciais:", error);
    // Não lançar erro para não bloquear o login
  }
}

export const authOptions: AuthOptions = {
  // ⚠️ CRÍTICO: Secret deve ser definido explicitamente
  secret: process.env.NEXTAUTH_SECRET,

  adapter: DrizzleAdapter(),
  
  providers: [
    // 🔵 Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // 🔐 Login com Email/Senha
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email e senha são obrigatórios");
          }

          // Buscar usuário no DB
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          if (!user) {
            throw new Error("Usuário não encontrado");
          }

          // Verificar se tem senha (pode ser só OAuth)
          if (!user.password) {
            throw new Error("Use o login com Google para esta conta");
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
        } catch (error: any) {
          console.error("❌ Erro no authorize:", error.message);
          throw error;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    updateAge: 24 * 60 * 60, // ✅ NOVO: Atualiza token a cada 24h
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ✅ CRÍTICO: Configuração de cookies para persistir sessão
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" 
          ? ".vercel.app"  // ← Permite cookies em subdomínios da Vercel
          : undefined,
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      // Adicionar userId ao token na primeira vez
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // ✅ NOVO: Atualizar token quando session é atualizada
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },

    async session({ session, token }) {
      // Adicionar dados do token à sessão
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },

    async signIn({ user, account }) {
      try {
        // Criar categorias padrão para novos usuários
        if (user?.id) {
          await criarCategoriasIniciaisSeNecessario(user.id);
        }
        return true;
      } catch (error) {
        console.error("❌ Erro no callback signIn:", error);
        // Não bloquear login se categorias falharem
        return true;
      }
    },
  },

  events: {
    async createUser({ user }) {
      try {
        // Criar categorias padrão quando criar usuário via credentials
        if (user.id) {
          await criarCategoriasIniciaisSeNecessario(user.id);
        }
      } catch (error) {
        console.error("❌ Erro no evento createUser:", error);
      }
    },
  },

  // Debug apenas em desenvolvimento
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };