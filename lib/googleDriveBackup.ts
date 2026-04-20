// src/lib/googleDriveBackup.ts

/**
 * Utilitário para fazer upload de backups no Google Drive do usuário.
 * Usa o access_token/refresh_token do NextAuth (tabela accounts).
 */

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const FOLDER_NAME        = "MyExpenses Backups";
const GOOGLE_API_BASE    = "https://www.googleapis.com";
const GOOGLE_OAUTH_TOKEN = "https://oauth2.googleapis.com/token";

// ============================================================================
// TIPOS
// ============================================================================

export interface DriveUploadResult {
  fileId:      string;
  filename:    string;
  webViewLink: string;
  size:        number;
}

export interface GoogleTokens {
  accessToken:  string;
  refreshToken: string | null;
  /** userId necessário para persistir o access_token renovado no banco */
  userId?:      string;
}

// ============================================================================
// TOKEN
// ============================================================================

/**
 * Renova o access_token usando o refresh_token e persiste o novo token
 * no banco para que chamadas futuras não precisem renovar novamente.
 *
 * ✅ CORRIGIDO: anteriormente o token renovado era descartado após o uso,
 * forçando uma nova renovação (com risco de rate-limit) a cada execução.
 */
async function refreshAccessToken(
  refreshToken: string,
  userId?: string
): Promise<string> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Falha ao renovar token Google: ${error.error_description || error.error}`
    );
  }

  const data         = await response.json();
  const newToken: string = data.access_token;
  const expiresIn: number = data.expires_in ?? 3600; // segundos

  // Persiste o novo access_token no banco se tivermos o userId
  if (userId) {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    await db
      .update(accounts)
      .set({
        access_token: newToken,
        expires_at:   expiresAt,
      })
      .where(
        and(
          eq(accounts.userId,   userId),
          eq(accounts.provider, "google")
        )
      );
    console.log(`[Drive] access_token renovado e persistido para userId=${userId}`);
  }

  return newToken;
}

/**
 * Retorna um access_token válido, renovando via refresh_token se expirado.
 */
async function getValidAccessToken(tokens: GoogleTokens): Promise<string> {
  // Testa o token atual com uma chamada leve à API do Google
  try {
    const testResponse = await fetch(
      `${GOOGLE_API_BASE}/drive/v3/about?fields=user`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    );

    if (testResponse.ok) return tokens.accessToken;

    if (testResponse.status === 401) {
      if (!tokens.refreshToken) {
        throw new Error(
          "Token inválido e sem refresh_token disponível. " +
          "O usuário precisa reautorizar o acesso ao Google Drive."
        );
      }
      return await refreshAccessToken(tokens.refreshToken, tokens.userId);
    }

    throw new Error(`Resposta inesperada da API Google: ${testResponse.status}`);
  } catch (error) {
    // Se o fetch em si falhou (rede), tenta renovar diretamente
    if (tokens.refreshToken) {
      return await refreshAccessToken(tokens.refreshToken, tokens.userId);
    }
    throw error;
  }
}

// ============================================================================
// PASTA
// ============================================================================

/**
 * Busca ou cria a pasta "MyExpenses Backups" no Drive do usuário.
 */
async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  const searchResponse = await fetch(
    `${GOOGLE_API_BASE}/drive/v3/files?` +
    new URLSearchParams({
      q:      `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id,name)",
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResponse.ok) {
    throw new Error("Erro ao buscar pasta de backups no Drive");
  }

  const searchData = await searchResponse.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  const createResponse = await fetch(`${GOOGLE_API_BASE}/drive/v3/files`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name:     FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createResponse.ok) {
    throw new Error("Erro ao criar pasta de backups no Drive");
  }

  const folder = await createResponse.json();
  return folder.id;
}

// ============================================================================
// LIMPEZA DE BACKUPS ANTIGOS
// ============================================================================

/**
 * Remove backups antigos, mantendo apenas os últimos N arquivos.
 */
async function limparBackupsAntigos(
  accessToken: string,
  folderId:    string,
  manter:      number = 4
): Promise<void> {
  const listResponse = await fetch(
    `${GOOGLE_API_BASE}/drive/v3/files?` +
    new URLSearchParams({
      q:       `'${folderId}' in parents and name contains 'myexpenses-backup' and trashed=false`,
      fields:  "files(id,name,createdTime)",
      orderBy: "createdTime desc",
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listResponse.ok) return;

  const listData  = await listResponse.json();
  const arquivos  = listData.files || [];
  const paraRemover = arquivos.slice(manter);

  for (const arquivo of paraRemover) {
    await fetch(`${GOOGLE_API_BASE}/drive/v3/files/${arquivo.id}`, {
      method:  "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log(`[Drive] Backup antigo removido: ${arquivo.name}`);
  }
}

// ============================================================================
// UPLOAD PRINCIPAL
// ============================================================================

/**
 * Faz upload do backup no Google Drive do usuário.
 *
 * @param tokens  - access_token, refresh_token e userId do usuário
 * @param filename - Nome do arquivo
 * @param content  - Conteúdo JSON em string
 */
export async function uploadBackupToDrive(
  tokens:   GoogleTokens,
  filename: string,
  content:  string
): Promise<DriveUploadResult> {
  // 1. Garante token válido (renova e persiste se necessário)
  const accessToken = await getValidAccessToken(tokens);

  // 2. Busca ou cria pasta de backups
  const folderId = await getOrCreateBackupFolder(accessToken);

  // 3. Prepara metadados do arquivo
  const buffer   = Buffer.from(content, "utf-8");
  const boundary = "-------myexpenses_backup_boundary";
  const metadata = JSON.stringify({
    name:     filename,
    mimeType: "application/json",
    parents:  [folderId],
  });

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  // 4. Upload multipart
  const uploadResponse = await fetch(
    `${GOOGLE_API_BASE}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size`,
    {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(
      `Erro ao fazer upload no Drive: ${error.error?.message || "Erro desconhecido"}`
    );
  }

  const uploadData = await uploadResponse.json();

  // 5. Remove backups antigos (mantém últimas 4 semanas)
  await limparBackupsAntigos(accessToken, folderId, 4);

  console.log(`[Drive] Upload concluído: ${filename} (ID: ${uploadData.id})`);

  return {
    fileId:      uploadData.id,
    filename:    uploadData.name,
    webViewLink: uploadData.webViewLink,
    size:        buffer.length,
  };
}