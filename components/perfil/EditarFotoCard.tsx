"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
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
import { useToast } from "@/hooks/use-toast";

interface Props {
  usuario: { id?: number; nome?: string; email?: string; foto?: string | null };
  atualizarUsuario: (dados: { foto?: string | null }) => void;
}

export default function EditarFotoCard({ usuario, atualizarUsuario }: Props) {
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cleanup de URLs ao desmontar ou mudar usuário
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    cancelarEdicao();
  }, [usuario]);

  // Validação de arquivo
  const validarArquivo = (file: File): string | null => {
    // Tamanho máximo: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return "A imagem deve ter no máximo 5MB";
    }

    // Tipos permitidos
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

    // Revoga URL anterior se existir
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setNovaFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const enviarFoto = async () => {
    if (!usuario.id || !novaFoto) return;

    const formData = new FormData();
    formData.append("foto", novaFoto);

    try {
      setEnviando(true);
      setErro(null);

      const res = await api.post(`/users/${usuario.id}/foto`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      atualizarUsuario({ foto: res.data.foto });
      
      toast({
        title: "Sucesso!",
        description: "Foto de perfil atualizada com sucesso.",
      });

      cancelarEdicao();
    } catch (err: any) {
      console.error("Erro ao enviar foto:", err);
      
      const mensagem = err.response?.data?.message || 
                      err.response?.data?.error ||
                      "Erro ao enviar foto. Tente novamente.";
      
      setErro(mensagem);
      
      toast({
        title: "Erro ao enviar foto",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const removerFoto = async () => {
    if (!usuario.id || !usuario.foto) return;

    try {
      setRemovendo(true);
      setErro(null);

      await api.delete(`/users/${usuario.id}/foto`);

      atualizarUsuario({ foto: null });
      
      toast({
        title: "Foto removida",
        description: "Sua foto de perfil foi removida.",
      });

      cancelarEdicao();
    } catch (err: any) {
      console.error("Erro ao remover foto:", err);
      
      const mensagem = err.response?.data?.message || 
                      "Erro ao remover foto. Tente novamente.";
      
      toast({
        title: "Erro ao remover foto",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setRemovendo(false);
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

  // Drag and drop handlers
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

  // URL da foto atual ou fallback
  const getFotoUrl = () => {
    if (preview) return preview;
    if (usuario.foto) {
      // Se a foto já é uma URL completa, usa diretamente
      if (usuario.foto.startsWith('http')) {
        return usuario.foto;
      }
      // Senão, concatena com baseURL da API
      return `${api.defaults.baseURL}${usuario.foto}`;
    }
    return null;
  };

  const fotoUrl = getFotoUrl();
  
  // Iniciais para fallback
  const getInitials = () => {
    if (usuario.nome) {
      return usuario.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (usuario.email) {
      return usuario.email[0].toUpperCase();
    }
    return 'U';
  };

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
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-4 border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {getInitials()}
              </span>
            </div>
          )}
          
          {/* Badge de câmera */}
          <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 border-4 border-white dark:border-gray-900 shadow-lg">
            <Camera size={16} className="text-white" />
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
          {novaFoto ? 'Nova foto selecionada' : usuario.foto ? 'Sua foto atual' : 'Nenhuma foto definida'}
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
          disabled={enviando || removendo}
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
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={enviando || removendo}
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
              variant="outline"
              onClick={cancelarEdicao}
              disabled={enviando}
              className="flex-1"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={enviarFoto}
              disabled={enviando || !!erro}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {enviando ? (
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
        ) : usuario.foto ? (
          <Button
            variant="destructive"
            onClick={removerFoto}
            disabled={removendo}
            className="w-full sm:w-auto"
          >
            {removendo ? (
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
          Sua foto será visível apenas para você no sistema. Evite usar imagens com informações sensíveis.
        </AlertDescription>
      </Alert>
    </div>
  );
}