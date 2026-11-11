// Redução de imagem no navegador (usa createImageBitmap e canvas; não roda no servidor).

/**
 * Recorta a foto no centro, em quadrado, e reduz para `lado` px (padrão 256),
 * em WebP (ou JPEG, se o navegador não gerar WebP). Uma foto de celular de
 * alguns MB vira uns 15 a 30 KB: o menu lateral a mostra com 36 px em toda
 * página, e o Perfil com 128 px (256 cobre telas de alta densidade).
 * Imagem menor que `lado` não é ampliada.
 */
export async function reduzirFotoPerfil(arquivo: File, lado = 256): Promise<File> {
  // "from-image" respeita a rotação EXIF das fotos de celular
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  try {
    const recorte = Math.min(bitmap.width, bitmap.height);
    const destino = Math.min(lado, recorte);
    const canvas = document.createElement("canvas");
    canvas.width = destino;
    canvas.height = destino;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem neste navegador");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      bitmap,
      (bitmap.width - recorte) / 2, (bitmap.height - recorte) / 2, recorte, recorte,
      0, 0, destino, destino,
    );

    const gerar = (tipo: string, qualidade: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, qualidade));
    // Navegador sem codificador WebP devolve PNG: nesse caso, usa JPEG
    let blob = await gerar("image/webp", 0.85);
    if (!blob || blob.type !== "image/webp") blob = await gerar("image/jpeg", 0.85);
    if (!blob) throw new Error("Não foi possível processar a imagem");

    const extensao = blob.type === "image/webp" ? "webp" : "jpg";
    const nome = arquivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${nome}.${extensao}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}
