// src/lib/auth/config.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "./adapter";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { criarDadosIniciaisUsuario } from "@/services/onboardingService";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "❌ NEXTAUTH_SECRET não está configurado nas variáveis de ambiente.\n" +
    "Adicione ao arquivo .env.local:\nNEXTAUTH_SECRET=sua_chave_secreta_aqui"
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL não está configurado nas variáveis de ambiente.\n" +
    "Adicione ao arquivo .env.local:\nDATABASE_URL=sua_connection_string_do_neon"
  );
}

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  console.warn(
    "⚠️ NEXTAUTH_URL não está configurado para produção.\n" +
    "Configure: NEXTAUTH_URL=https://seu-dominio.vercel.app"
  );
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("⚠️ Google OAuth não está configurado.");
}

// ✅ Prazos de sessão:
// - Sem lembrar: 1h — cookie expira em 1h
// - Com lembrar: 7 dias — cookie persistente
const REMEMBER_ME_MAX_AGE = 7 * 24 * 60 * 60; // 7 dias em segundos
const SESSION_MAX_AGE     =      60 * 60;       // 1 hora em segundos

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(),

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope:       "openid email profile",
          access_type: "offline",
          prompt:      "consent",
        },
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:      { label: "Email",   type: "email"    },
        password:   { label: "Senha",   type: "password" },
        rememberMe: { label: "Lembrar", type: "text"     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios");
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        if (!user || !user.password) {
          throw new Error("Usuário não encontrado");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Senha incorreta");
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id:         user.id,
          email:      user.email,
          name:       user.name,
          image:      user.image,
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   REMEMBER_ME_MAX_AGE,
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // ── Primeiro login ────────────────────────────────────────────────────
      if (account && user) {
        token.id = user.id;

        // Login com Google sempre usa rememberMe = true (sessão longa)
        const rememberMe = (user as any).rememberMe;
        token.rememberMe = typeof rememberMe === "boolean" ? rememberMe : true;

        // Define exp baseado em rememberMe
        const now = Math.floor(Date.now() / 1000);
        token.exp    = now + (token.rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE);
        token.maxAge = token.rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE;

        return token;
      }

      // ── Requests subsequentes ─────────────────────────────────────────────
      const now = Math.floor(Date.now() / 1000);

      // Token expirado — retorna null para forçar novo login
      if (token.exp && (token.exp as number) < now) {
        return null as any;
      }

      // Com rememberMe: renova expiração deslizante de 7 dias
      if (token.rememberMe) {
        token.exp    = now + REMEMBER_ME_MAX_AGE;
        token.maxAge = REMEMBER_ME_MAX_AGE;
      }
      // Sem rememberMe: mantém exp fixo (não renova — expira em 1h do login)

      return token;
    },

    async session({ session, token }) {
      if (!token) return session;
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        await criarDadosIniciaisUsuario(user.id);
      }
      return true;
    },
  },

  events: {
    async createUser({ user }) {
      if (user.id) {
        await criarDadosIniciaisUsuario(user.id);
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
};