import "next-auth";

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
    email: string; // Email sempre existe (obrigatório no schema)
    emailVerified?: Date | null;
    image?: string | null;
    password?: string | null; // Para login com credentials
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string | null; // Opcional no token (mais seguro)
    name?: string | null;
    picture?: string | null;
  }
}