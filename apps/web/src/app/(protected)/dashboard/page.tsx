export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Dream Tales AI
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Seu painel de criação de histórias
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Aqui vamos centralizar as ferramentas para criar livros infantis
          interativos com IA. Vamos começar definindo os módulos essenciais.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
            Histórias
          </p>
          <p className="mt-2 text-lg font-semibold">0 publicadas</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Ainda não há livros criados.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
            Personagens
          </p>
          <p className="mt-2 text-lg font-semibold">0 salvos</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Crie personagens reutilizáveis.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
            Estilos
          </p>
          <p className="mt-2 text-lg font-semibold">0 definidos</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Configure tons e ilustrações.
          </p>
        </div>
      </div>
    </div>
  );
}
