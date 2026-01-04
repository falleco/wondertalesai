"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SenderItem = {
  id: string;
  senderEmail: string | null;
  senderName: string | null;
  senderDomain: string | null;
  messageCount30d: number;
  messageCount7d: number;
  readRate30d: number;
  hasListUnsubscribe: boolean;
  unsubscribeLinks: string[];
  marketingScore: number;
  lowValueScore: number;
  disguisedMarketingScore: number;
  status: string;
  exampleSubjects: string[];
  suggestedAction: "send_mailto" | "open_link" | "block";
};

type PlanItem = {
  senderProfileId: string;
  senderEmail: string | null;
  senderName: string | null;
  messageCount30d: number;
  lowValueScore: number;
  suggestedAction: "send_mailto" | "open_link" | "block";
  mailtoDraft?: { to: string; subject: string; body: string };
  links?: string[];
};

type Preferences = {
  weeklyCleanupDigestEnabled: boolean;
};

export default function NoisePage() {
  const [items, setItems] = useState<SenderItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({
    weeklyCleanupDigestEnabled: true,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  const fetchSenders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/noise/senders");
      if (!response.ok) {
        throw new Error("failed");
      }
      const data = (await response.json()) as {
        items: SenderItem[];
        preferences: Preferences;
      };
      setItems(data.items ?? []);
      setPreferences(data.preferences ?? { weeklyCleanupDigestEnabled: true });
    } catch (_error) {
      toast.error("Nao foi possivel carregar os remetentes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSenders();
  }, [fetchSenders]);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const response = await fetch("/api/noise/evaluate", { method: "POST" });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Avaliacao concluida.");
      await fetchSenders();
    } catch (_error) {
      toast.error("Nao foi possivel executar a avaliacao.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePlan = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    setIsPlanning(true);
    try {
      const response = await fetch("/api/noise/unsubscribe/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderProfileIds: selectedIds }),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      const data = (await response.json()) as { items: PlanItem[] };
      setPlanItems(data.items ?? []);
    } catch (_error) {
      toast.error("Nao foi possivel gerar o plano.");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleBlock = async (senderProfileId: string) => {
    try {
      const response = await fetch("/api/noise/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderProfileId,
          action: "moveToNoise",
        }),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Remetente bloqueado.");
      await fetchSenders();
    } catch (_error) {
      toast.error("Nao foi possivel bloquear.");
    }
  };

  const handleIgnore = async (senderProfileId: string) => {
    try {
      const response = await fetch("/api/noise/unsubscribe/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderProfileId,
          actionType: "ignored",
        }),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Remetente ignorado.");
      await fetchSenders();
    } catch (_error) {
      toast.error("Nao foi possivel atualizar.");
    }
  };

  const handleUnsubscribeEvent = async (
    senderProfileId: string,
    actionType: "opened_link" | "sent_mailto" | "marked_done",
  ) => {
    try {
      await fetch("/api/noise/unsubscribe/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderProfileId, actionType }),
      });
    } catch (_error) {
      toast.error("Nao foi possivel registrar a acao.");
    }
  };

  const handlePreferenceToggle = async (value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      weeklyCleanupDigestEnabled: value,
    }));
    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyCleanupDigestEnabled: value }),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Preferencia atualizada.");
    } catch (_error) {
      toast.error("Nao foi possivel atualizar preferencia.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectedCount = selectedIds.length;
  const allSelected = useMemo(
    () => items.length > 0 && selectedIds.length === items.length,
    [items.length, selectedIds.length],
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">
            Noise reduction
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identifique remetentes com baixo valor e gere planos de descadastro.
          </p>
        </div>
        <button
          type="button"
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className="rounded-full px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
        >
          {isEvaluating ? "Avaliando..." : "Executar avaliacao"}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            Digest semanal de limpeza
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enviar sugestoes por email toda semana.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={preferences.weeklyCleanupDigestEnabled}
            onChange={(event) => handlePreferenceToggle(event.target.checked)}
          />
          Ativo
        </label>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-primary">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedCount} selecionado(s)
            </span>
          </div>
          <button
            type="button"
            onClick={handlePlan}
            disabled={selectedCount === 0 || isPlanning}
            className="rounded-full px-4 py-2 text-sm font-medium bg-gray-800 text-white disabled:opacity-50"
          >
            {isPlanning ? "Gerando..." : "Gerar plano"}
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Carregando remetentes...
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Nenhum remetente avaliado ainda.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {item.senderName || item.senderEmail || "Remetente"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.senderEmail ?? item.senderDomain ?? "Sem email"}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                      <p>
                        30d: {item.messageCount30d} msgs | 7d:{" "}
                        {item.messageCount7d} msgs
                      </p>
                      <p>
                        Read rate 30d: {(item.readRate30d * 100).toFixed(0)}%
                      </p>
                      <p>
                        Low value score: {(item.lowValueScore * 100).toFixed(0)}
                        %
                      </p>
                    </div>
                    {item.exampleSubjects.length > 0 ? (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Ex: {item.exampleSubjects.slice(0, 2).join(" • ")}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleIgnore(item.id)}
                    className="rounded-full px-4 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Ignorar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBlock(item.id)}
                    className="rounded-full px-4 py-2 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200"
                  >
                    Bloquear
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {planItems.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Plano de descadastro
          </h2>
          {planItems.map((plan) => (
            <div
              key={plan.senderProfileId}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {plan.senderName || plan.senderEmail || "Remetente"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sugestao: {plan.suggestedAction}
              </p>
              {plan.mailtoDraft ? (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <p>Para: {plan.mailtoDraft.to}</p>
                  <p>Assunto: {plan.mailtoDraft.subject}</p>
                  {plan.mailtoDraft.body ? (
                    <p>Body: {plan.mailtoDraft.body}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      handleUnsubscribeEvent(
                        plan.senderProfileId,
                        "sent_mailto",
                      )
                    }
                    className="mt-2 rounded-full px-3 py-1 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Marcar mailto enviado
                  </button>
                </div>
              ) : null}
              {plan.links && plan.links.length > 0 ? (
                <div className="mt-2 flex flex-col gap-1">
                  {plan.links.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 underline"
                      onClick={() =>
                        handleUnsubscribeEvent(
                          plan.senderProfileId,
                          "opened_link",
                        )
                      }
                    >
                      {link}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
