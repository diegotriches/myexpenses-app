// src/lib/googleDriveBackup.ts

/**
 * Utilitário para fazer upload de backups no Google Drive do usuário
 * Usa o access_token/refresh_token do NextAuth (tabela accounts)
 */

const FOLDER_NAME = "MyExpenses Backups";
const GOOGLE_API_BASE = "https://www.googleapis.com";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ============================================================================
// TIPOS
// ============================================================================

export interface DriveUploadResult {
  fileId: string;
  filename: string;
  webViewLink: string;
  size: number;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
}

// ============================================================================
// TOKEN
// ============================================================================

/**
 * Renova o access_token usando o refresh_token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Falha ao renovar token Google: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Retorna um access_token válido, renovando se necessário
 */
async function getValidAccessToken(tokens: GoogleTokens): Promise<string> {
  // Tenta usar o token atual — se falhar com 401, renova
  try {
    const testResponse = await fetch(
      `${GOOGLE_API_BASE}/drive/v3/about?fields=user`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    );

    if (testResponse.ok) return tokens.accessToken;

    if (testResponse.status === 401 && tokens.refreshToken) {
      return await refreshAccessToken(tokens.refreshToken);
    }

    throw new Error(`Token inválido e sem refresh_token disponível`);
  } catch (error) {
    if (tokens.refreshToken) {
      return await refreshAccessToken(tokens.refreshToken);
    }
    throw error;
  }
}

// ============================================================================
// PASTA
// ============================================================================

/**
 * Busca ou cria a pasta "MyExpenses Backups" no Drive do usuário
 */
async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  // Busca pasta existente
  const searchResponse = await fetch(
    `${GOOGLE_API_BASE}/drive/v3/files?` +
    new URLSearchParams({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
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

  // Cria a pasta se não existir
  const createResponse = await fetch(`${GOOGLE_API_BASE}/drive/v3/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
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
 * Remove backups antigos, mantendo apenas os últimos N arquivos
 */
async function limparBackupsAntigos(
  accessToken: string,
  folderId: string,
  manter: number = 4 // mantém as últimas 4 semanas
): Promise<void> {
  const listResponse = await fetch(
    `${GOOGLE_API_BASE}/drive/v3/files?` +
    new URLSearchParams({
      q: `'${folderId}' in parents and name contains 'myexpenses-backup' and trashed=false`,
      fields: "files(id,name,createdTime)",
      orderBy: "createdTime desc",
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listResponse.ok) return;

  const listData = await listResponse.json();
  const arquivos = listData.files || [];

  // Remove os arquivos além do limite
  const paraRemover = arquivos.slice(manter);

  for (const arquivo of paraRemover) {
    await fetch(`${GOOGLE_API_BASE}/drive/v3/files/${arquivo.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log(`[Drive] Backup antigo removido: ${arquivo.name}`);
  }
}

// ============================================================================
// UPLOAD PRINCIPAL
// ============================================================================

/**
 * Faz upload do backup no Google Drive do usuário
 *
 * @param tokens - access_token e refresh_token do usuário (do NextAuth)
 * @param filename - Nome do arquivo
 * @param content - Conteúdo do arquivo em string JSON
 * @returns Resultado do upload com fileId e link
 */
export async function uploadBackupToDrive(
  tokens: GoogleTokens,
  filename: string,
  content: string
): Promise<DriveUploadResult> {
  // 1. Garante token válido
  const accessToken = await getValidAccessToken(tokens);

  // 2. Busca ou cria pasta de backups
  const folderId = await getOrCreateBackupFolder(accessToken);

  // 3. Prepara o arquivo
  const buffer = Buffer.from(content, "utf-8");

  // 4. Upload multipart (metadata + conteúdo)
  const boundary = "-------myexpenses_backup_boundary";
  const metadata = JSON.stringify({
    name: filename,
    mimeType: "application/json",
    parents: [folderId],
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

  const uploadResponse = await fetch(
    `${GOOGLE_API_BASE}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(`Erro ao fazer upload no Drive: ${error.error?.message || "Erro desconhecido"}`);
  }

  const uploadData = await uploadResponse.json();

  // 5. Remove backups antigos (mantém últimas 4 semanas)
  await limparBackupsAntigos(accessToken, folderId, 4);

  console.log(`[Drive] Upload concluído: ${filename} (ID: ${uploadData.id})`);

  return {
    fileId: uploadData.id,
    filename: uploadData.name,
    webViewLink: uploadData.webViewLink,
    size: buffer.length,
  };
}