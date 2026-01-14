// app/(auth)/terms/page.tsx
"use client";

import Link from "next/link";
import { FiArrowLeft, FiFileText } from "react-icons/fi";
import { BsCashCoin } from "react-icons/bs";

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium">
            <FiFileText size={16} />
            Documento Legal
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Termos de Uso
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Última atualização: {lastUpdate}
          </p>
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
                Bem-vindo ao <strong>MyExpenses</strong>. Ao acessar e usar nosso aplicativo de gestão financeira pessoal, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                Se você não concordar com alguma parte destes termos, não deverá usar nosso serviço.
              </p>
            </section>

            {/* Definições */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                2. Definições
              </h2>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>"Serviço"</strong>: Refere-se ao aplicativo MyExpenses e todas as suas funcionalidades.</li>
                <li><strong>"Usuário"</strong>: Qualquer pessoa que acessa e utiliza o Serviço.</li>
                <li><strong>"Conta"</strong>: Registro criado pelo Usuário para acessar o Serviço.</li>
                <li><strong>"Dados"</strong>: Informações financeiras e pessoais fornecidas pelo Usuário.</li>
              </ul>
            </section>

            {/* Cadastro e Conta */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. Cadastro e Conta
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Para utilizar o MyExpenses, você deve:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mt-4">
                <li>Ter pelo menos 18 anos de idade</li>
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Manter a confidencialidade de sua senha</li>
                <li>Ser responsável por todas as atividades em sua conta</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
              </ul>
            </section>

            {/* Uso Aceitável */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Uso Aceitável
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Você concorda em <strong>NÃO</strong>:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Usar o Serviço para qualquer propósito ilegal ou não autorizado</li>
                <li>Tentar obter acesso não autorizado ao sistema</li>
                <li>Interferir ou interromper o funcionamento do Serviço</li>
                <li>Fazer engenharia reversa ou tentar extrair código-fonte</li>
                <li>Vender, revender ou explorar comercialmente o Serviço</li>
                <li>Enviar vírus, malware ou qualquer código malicioso</li>
              </ul>
            </section>

            {/* Propriedade Intelectual */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Propriedade Intelectual
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                O Serviço e todo o conteúdo, incluindo mas não limitado a textos, gráficos, logos, ícones, imagens, clipes de áudio, downloads digitais e compilações de dados, são de propriedade exclusiva do MyExpenses e são protegidos por leis de direitos autorais.
              </p>
            </section>

            {/* Seus Dados */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Seus Dados
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Você mantém todos os direitos sobre os dados que insere no MyExpenses. Garantimos que:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mt-4">
                <li>Seus dados são armazenados de forma segura e criptografada</li>
                <li>Você pode exportar seus dados a qualquer momento</li>
                <li>Você pode excluir sua conta e todos os dados permanentemente</li>
                <li>Não vendemos ou compartilhamos seus dados com terceiros</li>
              </ul>
            </section>

            {/* Limitação de Responsabilidade */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Limitação de Responsabilidade
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                O MyExpenses é fornecido "como está". Não garantimos que o Serviço será ininterrupto, seguro ou livre de erros. Não somos responsáveis por:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mt-4">
                <li>Perda de dados ou informações</li>
                <li>Decisões financeiras tomadas com base nos dados do aplicativo</li>
                <li>Interrupções temporárias do serviço</li>
                <li>Danos indiretos, incidentais ou consequentes</li>
              </ul>
            </section>

            {/* Suspensão e Cancelamento */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Suspensão e Cancelamento
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Reservamo-nos o direito de suspender ou cancelar sua conta se você violar estes Termos. Você pode cancelar sua conta a qualquer momento através das configurações do aplicativo.
              </p>
            </section>

            {/* Modificações */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                9. Modificações nos Termos
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Podemos modificar estes Termos a qualquer momento. Notificaremos você sobre mudanças significativas através do aplicativo ou email. O uso continuado do Serviço após as modificações constitui sua aceitação dos novos Termos.
              </p>
            </section>

            {/* Lei Aplicável */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. Lei Aplicável
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida nos tribunais brasileiros.
              </p>
            </section>

            {/* Contato */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                11. Contato
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Para questões sobre estes Termos, entre em contato conosco:
              </p>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong> suporte@myexpenses.com<br />
                  <strong>Endereço:</strong> Farroupilha, Rio Grande do Sul, Brasil
                </p>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <Link
            href="/privacy"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Política de Privacidade
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