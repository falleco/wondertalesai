"use client";

import { trpc } from "@web/trpc/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DigestDetail = {
  digest: {
    id: string;
    subject: string | null;
    contentText: string | null;
    periodStart: Date | string;
    periodEnd: Date | string;
    status: string;
    type: string;
  };
  items: Array<{
    id: string;
    kind: string;
    title: string;
    summary: string;
    category: string | null;
    isCritical: boolean;
    actionRequired: boolean;
    dueDate: Date | string | null;
  }>;
};

export default function DigestDetailPage() {
  const params = useParams();
  const digestId = params?.id as string;
  const [detail, setDetail] = useState<DigestDetail | null>(null);

  const digestQuery = trpc.digests.detail.useQuery(
    { id: digestId ?? "" },
    { enabled: Boolean(digestId) },
  );

  useEffect(() => {
    if (digestQuery.data) {
      setDetail(digestQuery.data);
    }
  }, [digestQuery.data]);

  useEffect(() => {
    if (digestQuery.error) {
      toast.error("Nao foi possivel carregar o digest.");
    }
  }, [digestQuery.error]);

  if (digestQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
        Carregando digest...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
        Digest nao encontrado.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">
          {detail.digest.subject || "Digest"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(detail.digest.periodStart).toLocaleString()} -{" "}
          {new Date(detail.digest.periodEnd).toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-primary p-6">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
          {detail.digest.contentText || "Sem conteudo."}
        </pre>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-primary">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Itens do digest
          </h2>
        </div>
        {detail.items.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Nenhum item.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {detail.items.map((item) => (
              <div key={item.id} className="px-6 py-4">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.kind} • {item.category ?? "other"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
