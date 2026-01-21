"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BsCashCoin } from "react-icons/bs";
import { FiHome, FiMail, FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

export default function ContatoPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    assunto: "",
    mensagem: "",
  });
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar mensagem");
      }
      
      setStatus("success");
      setFormData({ nome: "", email: "", assunto: "", mensagem: "" });
      
      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      console.error("Erro:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative max-w-2xl w-full mx-auto space-y-8 animate-fade-in">
        {/* Logo/Brand */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-all"
          >
            <BsCashCoin className="text-yellow-300" size={28} />
            <span className="font-bold text-xl text-white">MyExpenses</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center">
              <FiMail className="text-white" size={40} />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Entre em Contato
          </h1>
          <p className="text-xl text-blue-100 max-w-md mx-auto">
            Tem alguma dúvida, sugestão ou precisa de ajuda? Estamos aqui para você!
          </p>
        </div>

        {/* Success Message */}
        {status === "success" && (
          <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/50 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <FiCheckCircle className="text-green-300 flex-shrink-0" size={24} />
            <div className="text-white">
              <p className="font-semibold">Mensagem enviada com sucesso!</p>
              <p className="text-sm text-green-100">Responderemos em breve.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === "error" && (
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <FiAlertCircle className="text-red-300 flex-shrink-0" size={24} />
            <div className="text-white">
              <p className="font-semibold">Erro ao enviar mensagem</p>
              <p className="text-sm text-red-100">Tente novamente ou entre em contato por email.</p>
            </div>
          </div>
        )}

        {/* Contact Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-white font-medium mb-2">
                Nome
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/15 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-white font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="seu.email@exemplo.com"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/15 transition-all"
              />
            </div>

            {/* Assunto */}
            <div>
              <label htmlFor="assunto" className="block text-white font-medium mb-2">
                Assunto
              </label>
              <select
                id="assunto"
                name="assunto"
                value={formData.assunto}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/15 transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-blue-900 text-white">Selecione um assunto</option>
                <option value="duvida" className="bg-blue-900 text-white">Dúvida</option>
                <option value="sugestao" className="bg-blue-900 text-white">Sugestão</option>
                <option value="problema" className="bg-blue-900 text-white">Reportar Problema</option>
                <option value="outro" className="bg-blue-900 text-white">Outro</option>
              </select>
            </div>

            {/* Mensagem */}
            <div>
              <label htmlFor="mensagem" className="block text-white font-medium mb-2">
                Mensagem
              </label>
              <textarea
                id="mensagem"
                name="mensagem"
                value={formData.mensagem}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Escreva sua mensagem aqui..."
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/15 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full px-8 py-4 rounded-xl font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {status === "loading" ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <FiSend size={20} />
                  Enviar Mensagem
                </>
              )}
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-white font-semibold mb-4 text-lg">
            Outras formas de contato:
          </h3>
          <div className="space-y-3 text-blue-100">
            <div className="flex items-start gap-3 group">
              <FiMail className="text-yellow-300 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" size={20} />
              <div>
                <p className="font-medium text-white">Email:</p>
                <a 
                  href="mailto:contato@myexpenses.com" 
                  className="hover:text-white hover:underline transition-colors"
                >
                  myexpenses@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() => router.back()}
            className="group px-8 py-4 rounded-xl font-semibold border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 flex items-center gap-2 hover:scale-105"
          >
            <FiHome 
              className="group-hover:-translate-x-1 transition-transform" 
              size={20} 
            />
            Voltar ao App
          </button>
        </div>
      </div>
    </main>
  );
}