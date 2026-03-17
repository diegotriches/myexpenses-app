import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** true se o usuário autenticou com Google E os tokens do Drive estão disponíveis */
    hasGoogleDriveAccess?: boolean;
  }

  interface User {
    id: string;
    name?: string | null;
    email: string;
    emailVerified?: Date | null;
    image?: string | null;
    password?: string | null;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    rememberMe?: boolean;
    maxAge?: number;
    /** Access token do Google (expira em ~1h) */
    googleAccessToken?:  string | null;
    /** Refresh token do Google (longa duração) */
    googleRefreshToken?: string | null;
    /** Timestamp Unix de expiração do access token */
    googleTokenExpiry?:  number | null;
  }
}