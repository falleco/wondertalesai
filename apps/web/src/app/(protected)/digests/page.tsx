"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type DigestRun = {
  id: string;
  type: "daily" | "weekly";
  periodStart: string;
  periodEnd: string;
  status: string;
  subject: string | null;
  sentAt: string | null;
  stats: Record<string, unknown>;
};

type DigestPreferences = {
  dailyDigestEnabled: boolean;
  dailyDigestTimeLocal: string;
  weeklyDigestEnabled: boolean;
  weeklyDigestDayOfWeek: number;
  digestTimezone: string;
  digestMaxItems: number;
};

export default function DigestsPage() {
  const [digests, setDigests] = useState<DigestRun[]>([]);
  const [preferences, setPreferences] = useState<DigestPreferences>({
    dailyDigestEnabled: true,
    dailyDigestTimeLocal: "08:30",
    weeklyDigestEnabled: true,
    weeklyDigestDayOfWeek: 1,
    digestTimezone: "UTC",
    digestMaxItems: 30,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [manualType, setManualType] = useState<"daily" | "weekly">("daily");

  const fetchDigests = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/digests");
      if (!response.ok) {
        throw new Error("failed");
      }
      const data = (await response.json()) as { items: DigestRun[] };
      setDigests(data.items ?? []);
    } catch (_error) {
      toast.error("Nao foi possivel carregar os digests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/preferences/digest");
      if (!response.ok) {
        throw new Error("failed");
      }
      const data = (await response.json()) as DigestPreferences;
      setPreferences(data);
    } catch (_error) {
      toast.error("Nao foi possivel carregar preferencias.");
    }
  }, []);

  useEffect(() => {
    fetchDigests();
    fetchPreferences();
  }, [fetchDigests, fetchPreferences]);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/preferences/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Preferencias salvas.");
    } catch (_error) {
      toast.error("Nao foi possivel salvar preferencias.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualRun = async () => {
    setIsRunning(true);
    try {
      const response = await fetch("/api/digests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: manualType }),
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      toast.success("Digest em execucao.");
      await fetchDigests();
    } catch (_error) {
      toast.error("Nao foi possivel executar.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">
            Digests
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resumos diarios e semanais enviados por email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            value={manualType}
            onChange={(event) =>
              setManualType(event.target.value as "daily" | "weekly")
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="button"
            onClick={handleManualRun}
            disabled={isRunning}
            className="rounded-full px-4 py-2 text-sm font-medium bg-gray-800 text-white disabled:opacity-60"
          >
            {isRunning ? "Executando..." : "Rodar agora"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-primary p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Preferencias do digest
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={preferences.dailyDigestEnabled}
              onChange={(event) =>
                setPreferences((prev) => ({
                  ...prev,
                  dailyDigestEnabled: event.target.checked,
                }))
              }
            />
            Daily digest ativo
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            Horario diario
            <input
              type="time"
              value={preferences.dailyDigestTimeLocal}
              onChange={(event) =>
                setPreferences((prev) => ({
                  ...prev,
                  dailyDigestTimeLocal: event.target.value,
                }))
              }
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={preferences.weeklyDigestEnabled}
              onChange={(event) =>
                setPreferences((prev) => ({
                  ...prev,
                  weeklyDigestEnabled: event.target.checked,
                }))
              }
            />
            Weekly digest ativo
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            Dia da semana (1=Seg, 7=Dom)
            <input
              type="number"
              min={1}
              max={7}
              value={preferences.weeklyDigestDayOfWeek}
              onChange={(event) =>
                setPreferences((prev) => ({
                  ...prev,
                  weeklyDigestDayOfWeek: Number(event.target.value),
                }))
              }
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            Timezone
            <input
              value={preferences.digestTimezone}
              onChange={(event) =>
                setPreferences((prev) => ({
                  ...prev,
                  digestTimezone: event.target.value,
                }))
              }
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              placeholder="UTC"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            Maximo de itens
            <input
              type="number"
              min={10}
              max={50}
              value={preferences.digestMaxItems}
              onChange={(event) =>
                setPreferences((prev) => ({
                  ...prev,
                  digestMaxItems: Number(event.target.value),
                }))
              }
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="rounded-full px-5 py-2 text-sm font-medium bg-gray-800 text-white disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-primary">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Historico
          </h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Carregando digests...
          </div>
        ) : digests.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Nenhum digest gerado ainda.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {digests.map((digest) => (
              <Link
                key={digest.id}
                href={`/digests/${digest.id}`}
                className="flex flex-col gap-1 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {digest.subject || `${digest.type} digest`}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {digest.type.toUpperCase()} •{" "}
                  {new Date(digest.periodEnd).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
