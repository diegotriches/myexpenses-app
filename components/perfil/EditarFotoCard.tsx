// src/components/perfil/EditarFotoCard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  X, 
  Loader2, 
  Camera, 
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useUploadFoto, useRemoverFoto } from "@/hooks/useProfile";
import type { Usuario } from "@/types/profile";

interface Props {
  usuario: Usuario;
}

export default function EditarFotoCard({ usuario }: Props) {
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // React Query Mutations
  const uploadFoto = useUploadFoto();
  const removerFoto = useRemoverFoto();

  // Cleanup de URLs ao desmontar ou mudar usuário
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Validação de arquivo
  const validarArquivo = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return "A imagem deve ter no máximo 5MB";
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Formato inválido. Use JPG, PNG ou WebP";
    }

    return null;
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processarArquivo(file);
  };

  const processarArquivo = (file: File) => {
    setErro(null);

    const erroValidacao = validarArquivo(file);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setNovaFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const enviarFoto = async () => {
    if (!usuario.id) {
      setErro("ID do usuário não encontrado. Recarregue a página.");
      return;
    }

    if (!novaFoto) {
      setErro("Nenhuma foto selecionada");
      return;
    }

    try {
      setErro(null);
      
      await uploadFoto.mutateAsync({
        userId: usuario.id,
        file: novaFoto,
      });

      cancelarEdicao();
    } catch (err: any) {
      console.error("Erro ao enviar foto:", err);
      setErro(err.message || "Erro ao enviar foto. Tente novamente.");
    }
  };

  const handleRemoverFoto = async () => {
    if (!usuario.id || !usuario.image) return;

    try {
      setErro(null);
      
      await removerFoto.mutateAsync(usuario.id);
      
      cancelarEdicao();
    } catch (err: any) {
      console.error("Erro ao remover foto:", err);
    }
  };

  const cancelarEdicao = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setNovaFoto(null);
    setErro(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  useEffect(() => {
    cancelarEdicao();
  }, [usuario]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  const getFotoUrl = () => {
    if (preview) return preview;
    if (usuario.image) return usuario.image;
    return null;
  };

  const fotoUrl = getFotoUrl();
  
  const getInitials = () => {
    if (usuario.name) {
      return usuario.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (usuario.email) {
      return usuario.email[0].toUpperCase();
    }
    return 'U';
  };

  const isLoading = uploadFoto.isPending || removerFoto.isPending;

  return (
    <div className="space-y-6">
      {/* Avatar Preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt="Foto de perfil"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 shadow-lg"
              onError={(e) => {
                console.error("Erro ao carregar imagem:", fotoUrl);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-4 border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {getInitials()}
              </span>
            </div>
          )}
          
          <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 border-4 border-white dark:border-gray-900 shadow-lg">
            <Camera size={16} className="text-white" />
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
          {novaFoto ? 'Nova foto selecionada' : usuario.image ? 'Sua foto atual' : 'Nenhuma foto definida'}
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 transition-all
          ${dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
          }
          ${erro ? 'border-red-300' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFotoChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Upload size={24} className="text-gray-600 dark:text-gray-400" />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arraste uma imagem ou
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <Upload size={14} className="mr-2" />
              Selecionar Arquivo
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            JPG, PNG ou WebP (máx. 5MB)
          </p>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {/* Info sobre nova foto */}
      {novaFoto && !erro && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>{novaFoto.name}</strong> ({(novaFoto.size / 1024).toFixed(1)} KB)
          </AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        {novaFoto ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={cancelarEdicao}
              disabled={isLoading}
              className="flex-1"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={enviarFoto}
              disabled={isLoading || !!erro}
              className="flex-1 bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              {uploadFoto.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Salvar Foto
                </>
              )}
            </Button>
          </>
        ) : usuario.image ? (
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemoverFoto}
            disabled={isLoading}
            className="w-full sm:w-auto cursor-pointer"
          >
            {removerFoto.isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 size={16} className="mr-2" />
                Remover Foto
              </>
            )}
          </Button>
        ) : null}
      </div>

      {/* Dica de Segurança */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Sua foto será armazenada de forma segura e visível apenas para você no sistema.
        </AlertDescription>
      </Alert>
    </div>
  );
}