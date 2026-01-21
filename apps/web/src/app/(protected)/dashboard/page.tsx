import { trpc } from "@web/trpc/server";
import Image from "next/image";
import Link from "next/link";

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(value);

export default async function DashboardPage() {
  const stories = await trpc.story.list.query();
  return (
    <div className="space-y-8">
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

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
          <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
            Biblioteca
          </p>
          <p className="mt-3 text-2xl font-semibold">
            {stories.length} livros criados
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Cada historia fica salva para releituras ou novas aventuras.
          </p>
          <Link
            href="/storybook"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            Contar nova historia
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Seus livros
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Link
              href="/storybook"
              className="group flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400"
            >
              <span className="text-lg font-semibold">+ Nova historia</span>
              <span className="mt-2 text-xs">Clique para comecar um conto</span>
            </Link>
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/storybook/${story.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-white/5"
              >
                <div className="h-36 w-full overflow-hidden bg-gray-100">
                  {story.coverImageUrl ? (
                    <Image
                      src={story.coverImageUrl}
                      alt=""
                      width={640}
                      height={360}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-amber-100 via-pink-100 to-sky-100" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {story.title ?? "Titulo a escolher"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tema: {story.theme}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>{story.pageCount} paginas</span>
                    <span>{formatDate(new Date(story.createdAt))}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
