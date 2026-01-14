import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "./adapter";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { criarDadosIniciaisUsuario } from "@/services/onboardingService";

// ============================================
// ⚠️ VALIDAÇÃO CRÍTICA DE VARIÁVEIS DE AMBIENTE
// ============================================

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "❌ NEXTAUTH_SECRET não está configurado nas variáveis de ambiente.\n" +
    "Adicione ao arquivo .env.local:\n" +
    "NEXTAUTH_SECRET=sua_chave_secreta_aqui"
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL não está configurado nas variáveis de ambiente.\n" +
    "Adicione ao arquivo .env.local:\n" +
    "DATABASE_URL=sua_connection_string_do_neon"
  );
}

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  console.warn(
    "⚠️ NEXTAUTH_URL não está configurado para produção.\n" +
    "Isso pode causar problemas com callbacks OAuth.\n" +
    "Configure: NEXTAUTH_URL=https://seu-dominio.vercel.app"
  );
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn(
    "⚠️ Google OAuth não está configurado.\n" +
    "Para habilitar login com Google, configure:\n" +
    "GOOGLE_CLIENT_ID=seu_client_id\n" +
    "GOOGLE_CLIENT_SECRET=seu_client_secret"
  );
}

/**
 * Configuração do NextAuth
 * 
 * Providers:
 * - Google OAuth (allowDangerousEmailAccountLinking: true)
 * - Credentials (email/senha com bcrypt)
 * 
 * Session:
 * - Strategy: JWT (melhor performance)
 * - MaxAge: 30 dias
 * 
 * Features:
 * - Auto-onboarding (categorias padrão)
 * - Callbacks personalizados (jwt, session, signIn)
 * - Páginas customizadas (/auth/signin)
 */
export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(),

  providers: [
    // ============================================
    // 🔐 GOOGLE OAUTH
    // ============================================
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Permite vincular contas com mesmo email
    }),

    // ============================================
    // 📧 LOGIN COM EMAIL/SENHA
    // ============================================
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

  // ============================================
  // 🎫 SESSÃO
  // ============================================
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  // ============================================
  // 📄 PÁGINAS CUSTOMIZADAS
  // ============================================
  pages: {
    signIn: "/auth/signin",
  },

  // ============================================
  // 🔄 CALLBACKS
  // ============================================
  callbacks: {
    /**
     * JWT Callback - Adiciona userId ao token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    /**
     * Session Callback - Adiciona userId à sessão
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    /**
     * SignIn Callback - Auto-onboarding para novos usuários
     * Cria categorias padrão automaticamente
     */
    async signIn({ user, account }) {
      // Apenas para OAuth (Google)
      if (account?.provider === "google" && user.id) {
        await criarDadosIniciaisUsuario(user.id);
      }
      return true;
    },
  },

  // ============================================
  // 📡 EVENTS
  // ============================================
  events: {
    /**
     * CreateUser Event - Auto-onboarding para Credentials
     * Cria categorias padrão quando criar usuário via email/senha
     */
    async createUser({ user }) {
      if (user.id) {
        await criarDadosIniciaisUsuario(user.id);
      }
    },
  },

  // ============================================
  // 🐛 DEBUG
  // ============================================
  debug: process.env.NODE_ENV === "development",
};