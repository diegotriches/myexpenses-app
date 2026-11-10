import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { emailPendente } from "@/lib/trocaEmail";

/**
 * Perfil no formato que a tela usa: sem a senha, com `hasPassword` (false = conta só Google)
 * e o e-mail que aguarda confirmação, se houver. GET /api/users/me e o PUT do perfil devolvem isto.
 */
export async function perfilDoUsuario(userId: string) {
  const [usuario] = await db
    .select({
      id:            users.id,
      name:          users.name,
      email:         users.email,
      image:         users.image,
      emailVerified: users.emailVerified,
      createdAt:     users.createdAt,
      password:      users.password,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!usuario) return null;

  const { password, ...resto } = usuario;
  return {
    ...resto,
    hasPassword: !!password,
    emailPendente: await emailPendente(userId),
  };
}
