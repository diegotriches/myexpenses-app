// app/(auth)/privacy/page.tsx
"use client";

import Link from "next/link";
import { FiArrowLeft, FiShield, FiLock, FiEye, FiDownload, FiTrash2, FiDatabase } from "react-icons/fi";
import { BsCashCoin } from "react-icons/bs";

export default function PrivacyPage() {
  const lastUpdate = "08 de Janeiro de 2026";

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
          >
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar</span>
          </Link>

          <div className="flex items-center gap-2">
            <BsCashCoin className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="font-bold text-lg text-gray-900 dark:text-white">MyExpenses</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium">
            <FiShield size={16} />
            Sua Privacidade é Nossa Prioridade
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Política de Privacidade
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Última atualização: {lastUpdate}
          </p>
        </div>

        {/* Resumo Rápido */}
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-4">
            📋 Resumo Rápido
          </h3>
          <ul className="space-y-2 text-blue-900 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <FiLock className="flex-shrink-0 mt-1" size={16} />
              <span>Seus dados são <strong>criptografados</strong> e armazenados de forma segura</span>
            </li>
            <li className="flex items-start gap-2">
              <FiEye className="flex-shrink-0 mt-1" size={16} />
              <span><strong>Não vendemos</strong> suas informações para terceiros</span>
            </li>
            <li className="flex items-start gap-2">
              <FiDownload className="flex-shrink-0 mt-1" size={16} />
              <span>Você pode <strong>exportar</strong> todos os seus dados a qualquer momento</span>
            </li>
            <li className="flex items-start gap-2">
              <FiTrash2 className="flex-shrink-0 mt-1" size={16} />
              <span>Você pode <strong>excluir</strong> sua conta e dados permanentemente</span>
            </li>
          </ul>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-8">
            
            {/* Introdução */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                1. Introdução
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Esta Política de Privacidade descreve como o <strong>MyExpenses</strong> coleta, usa, armazena e protege suas informações pessoais. Estamos comprometidos com a transparência e a proteção dos seus dados conforme a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
              </p>
            </section>

            {/* Dados Coletados */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiDatabase className="text-blue-600 dark:text-blue-400" />
                2. Dados que Coletamos
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                2.1 Dados de Cadastro
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Nome completo</li>
                <li>Endereço de email</li>
                <li>Senha (criptografada)</li>
                <li>Foto de perfil (opcional)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                2.2 Dados Financeiros
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Transações financeiras (receitas e despesas)</li>
                <li>Contas bancárias (apenas nomes, não dados de acesso)</li>
                <li>Cartões de crédito (apenas nomes, não números reais)</li>
                <li>Categorias e descrições de transações</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                2.3 Dados de Uso
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Logs de acesso e atividade</li>
                <li>Informações do dispositivo (navegador, sistema operacional)</li>
                <li>Endereço IP (para segurança)</li>
              </ul>
            </section>

            {/* Como Usamos */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. Como Usamos Seus Dados
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Fornecer e manter o serviço de gestão financeira</li>
                <li>Personalizar sua experiência no aplicativo</li>
                <li>Gerar relatórios e análises financeiras</li>
                <li>Enviar notificações importantes (vencimentos, alertas)</li>
                <li>Melhorar a segurança e prevenir fraudes</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            {/* Compartilhamento */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Compartilhamento de Dados
              </h2>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <p className="text-green-900 dark:text-green-300 font-semibold">
                  ✅ Nós NÃO vendemos seus dados para terceiros.
                </p>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Podemos compartilhar seus dados apenas nas seguintes situações:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Provedores de Serviço:</strong> Empresas que nos ajudam a operar o serviço (hospedagem, email)</li>
                <li><strong>Obrigação Legal:</strong> Quando exigido por lei ou ordem judicial</li>
                <li><strong>Com Seu Consentimento:</strong> Quando você autorizar explicitamente</li>
              </ul>
            </section>

            {/* Segurança */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiLock className="text-blue-600 dark:text-blue-400" />
                5. Segurança dos Dados
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Implementamos medidas técnicas e organizacionais para proteger seus dados:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Criptografia:</strong> Todos os dados são criptografados em trânsito (HTTPS) e em repouso</li>
                <li><strong>Senha Segura:</strong> Senhas armazenadas com hash bcrypt</li>
                <li><strong>Autenticação:</strong> Sistema de autenticação com NextAuth.js</li>
                <li><strong>Backup:</strong> Backups regulares e seguros</li>
                <li><strong>Monitoramento:</strong> Monitoramento 24/7 para detectar atividades suspeitas</li>
              </ul>
            </section>

            {/* Seus Direitos */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Seus Direitos (LGPD)
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                De acordo com a LGPD, você tem os seguintes direitos:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <FiEye size={18} className="text-blue-600 dark:text-blue-400" />
                    Acesso
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Acessar e revisar seus dados a qualquer momento
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <FiDownload size={18} className="text-blue-600 dark:text-blue-400" />
                    Portabilidade
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Exportar todos os seus dados em formato JSON
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <FiTrash2 size={18} className="text-blue-600 dark:text-blue-400" />
                    Exclusão
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Excluir sua conta e todos os dados permanentemente
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <FiShield size={18} className="text-blue-600 dark:text-blue-400" />
                    Revogação
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Revogar consentimentos dados anteriormente
                  </p>
                </div>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Cookies e Tecnologias
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Utilizamos cookies e tecnologias semelhantes para:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento do serviço (sessão, autenticação)</li>
                <li><strong>Cookies de Preferências:</strong> Armazenar suas preferências (tema, idioma)</li>
                <li><strong>Cookies de Segurança:</strong> Proteger contra fraudes e acessos não autorizados</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                Você pode gerenciar cookies nas configurações do seu navegador.
              </p>
            </section>

            {/* Retenção */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Retenção de Dados
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, seus dados são removidos permanentemente em até <strong>30 dias</strong>, exceto quando exigido por lei.
              </p>
            </section>

            {/* Menores */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                9. Privacidade de Menores
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Nosso serviço não é destinado a menores de <strong>18 anos</strong>. Não coletamos intencionalmente dados de menores. Se você é pai/mãe ou responsável e acredita que seu filho forneceu dados pessoais, entre em contato conosco.
              </p>
            </section>

            {/* Alterações */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. Alterações na Política
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas através do aplicativo ou email. A data da última atualização será sempre exibida no topo desta página.
              </p>
            </section>

            {/* Contato */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                11. Contato - Encarregado de Dados (DPO)
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-2">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>E-mail:</strong> myexpenses.noreply@gmail.com
                </p>

                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Endereço:</strong> Farroupilha, Rio Grande do Sul, Brasil
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Responderemos sua solicitação em até <strong>15 dias úteis</strong>.
                </p>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <Link
            href="/terms"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Termos de Uso
          </Link>
          <Link
            href="/register"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </main>
  );
}