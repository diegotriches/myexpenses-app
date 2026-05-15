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

const REMEMBER_ME_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias
const SESSION_MAX_AGE     =      60 * 60;        // 1 hora

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(),

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope:       "openid email profile https://www.googleapis.com/auth/drive.file",
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

        // ✅ NOVO: bloqueia login de contas com e-mail não verificado
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
      if (account && user) {
        token.id = user.id;

        if (account.provider === "google") {
          token.googleAccessToken  = account.access_token  ?? null;
          token.googleRefreshToken = account.refresh_token ?? null;
          token.googleTokenExpiry  = account.expires_at    ?? null;
        }

        const rememberMe = (user as any).rememberMe;
        token.rememberMe = rememberMe === false ? false : true;
        token.maxAge     = token.rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE;
      }

      if (!account && token.rememberMe === false) {
        const now  = Math.floor(Date.now() / 1000);
        token.exp  = now + SESSION_MAX_AGE;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      (session as any).hasGoogleDriveAccess =
        !!(token.googleAccessToken || token.googleRefreshToken);

      return session;
    },

    async signIn({ user, account }) {
      // Usuários Google são verificados automaticamente pelo provider
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