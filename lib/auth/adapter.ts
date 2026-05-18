// lib/auth/adapter.ts

import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";

export function DrizzleAdapter(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, "id">) {
      const id = crypto.randomUUID();

      await db.insert(users).values({
        id,
        name:          data.name,
        email:         data.email,
        emailVerified: data.emailVerified,
        image:         data.image,
      });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return { ...user, id: user.id, emailVerified: user.emailVerified ?? null };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return user || null;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return user || null;
    },

    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }): Promise<AdapterUser | null> {
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider,          provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        )
        .limit(1);

      if (!account) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, account.userId))
        .limit(1);

      return user || null;
    },

    async updateUser(data: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
      if (!data.id) throw new Error("User ID is required");

      await db
        .update(users)
        .set({
          name:          data.name,
          email:         data.email,
          emailVerified: data.emailVerified,
          image:         data.image,
        })
        .where(eq(users.id, data.id));

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.id))
        .limit(1);

      return user;
    },

    async deleteUser(userId: string): Promise<void> {
      await db.delete(users).where(eq(users.id, userId));
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      // ✅ CORRIGIDO: accounts não tem coluna "id" — chave é (provider + providerAccountId).
      // Busca pelo par composto e faz upsert manual sem referenciar accounts.id.
      const [existing] = await db
        .select({ refresh_token: accounts.refresh_token })
        .from(accounts)
        .where(
          and(
            eq(accounts.provider,          account.provider),
            eq(accounts.providerAccountId, account.providerAccountId)
          )
        )
        .limit(1);

      if (existing) {
        // Atualiza tokens — preserva refresh_token existente se o novo vier nulo
        // (o Google não repete o refresh_token em logins subsequentes sem consent)
        await db
          .update(accounts)
          .set({
            access_token:  account.access_token  ?? null,
            refresh_token: account.refresh_token ?? existing.refresh_token,
            expires_at:    account.expires_at    ?? null,
            token_type:    account.token_type    ?? null,
            scope:         account.scope         ?? null,
            id_token:      account.id_token      ?? null,
            session_state: account.session_state ?? null,
          })
          .where(
            and(
              eq(accounts.provider,          account.provider),
              eq(accounts.providerAccountId, account.providerAccountId)
            )
          );
      } else {
        await db.insert(accounts).values({
          userId:            account.userId,
          type:              account.type,
          provider:          account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token:     account.refresh_token  ?? null,
          access_token:      account.access_token   ?? null,
          expires_at:        account.expires_at     ?? null,
          token_type:        account.token_type     ?? null,
          scope:             account.scope          ?? null,
          id_token:          account.id_token       ?? null,
          session_state:     account.session_state  ?? null,
        });
      }
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }): Promise<void> {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider,          provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        );
    },

    async createSession({ sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      await db.insert(sessions).values({
        id: crypto.randomUUID(),
        sessionToken,
        userId,
        expires,
      });

      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1);

      return session;
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1);

      if (!session) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!user) return null;

      return { session, user };
    },

    async updateSession(data: Partial<AdapterSession> & { sessionToken: string }): Promise<AdapterSession | null | undefined> {
      await db
        .update(sessions)
        .set({ expires: data.expires })
        .where(eq(sessions.sessionToken, data.sessionToken));

      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, data.sessionToken))
        .limit(1);

      return session || null;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken({ identifier, expires, token }: { identifier: string; expires: Date; token: string }): Promise<VerificationToken | null | undefined> {
      await db.insert(verificationTokens).values({ identifier, token, expires });

      const [verificationToken] = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.token, token))
        .limit(1);

      return verificationToken;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }): Promise<VerificationToken | null> {
      const [verificationToken] = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token,      token)
          )
        )
        .limit(1);

      if (!verificationToken) return null;

      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token,      token)
          )
        );

      return verificationToken;
    },
  };
}