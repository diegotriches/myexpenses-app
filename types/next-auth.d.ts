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
  }
}