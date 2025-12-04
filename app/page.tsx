import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-6">MyExpenses</h1>
        <p className="text-gray-600 mb-8">
          Gerencie seus gastos pessoais com facilidade e segurança.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/login"
            className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
          >
            Entrar
          </Link>

          <Link
            href="/register"
            className="w-full border border-gray-300 py-2 rounded-xl hover:bg-gray-200 transition"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </main>
  );
}