"use client";

import {
  ChatGPTIcon,
  CheckMarkIcon2,
  FastmailIcon,
  GoogleIcon,
  PlusIcon,
  TrashIcon,
} from "@web/components/icons";
import { trpc } from "@web/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./ui/modal/modal";

type ConnectedItem = {
  id: string;
  kind: "fastmail" | "gmail" | "llm";
  provider: string;
  name: string;
  description: string;
  status: string;
  lastSyncedAt?: Date | null;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultSyncStartDate = () => {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);
  return formatDateInputValue(start);
};

const formatLastSync = (value?: Date | null) => {
  if (!value) {
    return null;
  }
  return value.toLocaleString();
};

const getStatusLabel = (status: string) => {
  if (status === "connected") {
    return "Connected";
  }
  if (status === "pending") {
    return "Syncing";
  }
  if (status === "revoked") {
    return "Revoked";
  }
  if (status === "error") {
    return "Error";
  }
  return status;
};

export default function IntegrationList() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLlmModalOpen, setIsLlmModalOpen] = useState(false);
  const [llmProvider, setLlmProvider] = useState<"openai" | "ollama">("openai");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmIsDefault, setLlmIsDefault] = useState(false);
  const [reprocessId, setReprocessId] = useState<string | null>(null);
  const [emailSyncStartDate, setEmailSyncStartDate] = useState(
    getDefaultSyncStartDate,
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  const datasourcesQuery = trpc.datasources.list.useQuery();
  const { refetch } = datasourcesQuery;
  const removeDatasource = trpc.datasources.remove.useMutation();
  const forceReprocess = trpc.datasources.forceReprocess.useMutation();
  const gmailAuth = trpc.datasources.gmailAuthUrl.useMutation();
  const fastmailConnect = trpc.datasources.fastmailConnect.useMutation();
  const llmList = trpc.llm.list.useQuery();
  const llmCreate = trpc.llm.create.useMutation();
  const llmRemove = trpc.llm.remove.useMutation();

  useEffect(() => {
    const status = searchParams.get("status");
    const integration = searchParams.get("integration");
    if (status === "connected" && integration === "gmail") {
      toast.success("Gmail conectado com sucesso");
      refetch();
      router.replace("/integrations");
    }
  }, [refetch, router, searchParams]);

  const connectedItems = useMemo<ConnectedItem[]>(() => {
    const items: ConnectedItem[] = [];

    const connections = datasourcesQuery.data ?? [];
    for (const connection of connections) {
      if (connection.provider === "gmail") {
        items.push({
          id: connection.id,
          kind: "gmail",
          provider: connection.provider,
          name: "Gmail",
          description: connection.email
            ? `Conta conectada: ${connection.email}`
            : "Conta conectada",
          status: connection.status,
          lastSyncedAt: connection.lastSyncedAt ?? null,
          Icon: GoogleIcon,
        });
      } else if (connection.provider === "fastmail") {
        items.push({
          id: connection.id,
          kind: "fastmail",
          provider: connection.provider,
          name: "Fastmail",
          description: connection.email
            ? `Conta conectada: ${connection.email}`
            : "Conta conectada",
          status: connection.status,
          lastSyncedAt: connection.lastSyncedAt ?? null,
          Icon: FastmailIcon,
        });
      }
    }

    const llmConnections = llmList.data ?? [];
    for (const connection of llmConnections) {
      items.push({
        id: connection.id,
        kind: "llm",
        provider: connection.provider,
        name: connection.provider === "openai" ? "OpenAI" : "Ollama",
        description: `Modelo: ${connection.model}`,
        status: connection.status,
        Icon: ChatGPTIcon,
      });
    }

    return items;
  }, [datasourcesQuery.data, llmList.data]);

  const isGmailConnected = connectedItems.some(
    (item) => item.provider === "gmail" && item.status === "connected",
  );
  const isFastmailConnected = connectedItems.some(
    (item) => item.provider === "fastmail" && item.status === "connected",
  );

  const resetLlmForm = () => {
    setLlmProvider("openai");
    setLlmModel("");
    setLlmApiKey("");
    setLlmBaseUrl("");
    setLlmIsDefault(false);
  };

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      await removeDatasource.mutateAsync({ connectionId });
      toast.success("Integracao removida com sucesso");
      await refetch();
    } catch (_error) {
      toast.error("Nao foi possivel remover a integracao.");
    }
  };

  const handleReprocessConnection = async (connectionId: string) => {
    try {
      setReprocessId(connectionId);
      await forceReprocess.mutateAsync({ connectionId });
      toast.success("Reprocessamento iniciado");
      await refetch();
    } catch (_error) {
      toast.error("Nao foi possivel iniciar o reprocessamento.");
    } finally {
      setReprocessId(null);
    }
  };

  const handleRemoveLlm = async (integrationId: string) => {
    try {
      await llmRemove.mutateAsync({ integrationId });
      toast.success("LLM removida com sucesso");
      await llmList.refetch();
    } catch (_error) {
      toast.error("Nao foi possivel remover a LLM.");
    }
  };

  const handleGmailConnect = async () => {
    try {
      const redirectTo = `${window.location.origin}/integrations`;
      const startDate = emailSyncStartDate.trim() || undefined;
      const response = await gmailAuth.mutateAsync({ redirectTo, startDate });
      setIsAddModalOpen(false);
      window.location.href = response.url;
    } catch (_error) {
      toast.error("Nao foi possivel iniciar a conexao com o Gmail.");
    }
  };

  const handleFastmailConnect = async () => {
    try {
      const startDate = emailSyncStartDate.trim() || undefined;
      await fastmailConnect.mutateAsync({ startDate });
      toast.success("Fastmail conectado com sucesso");
      setIsAddModalOpen(false);
      await refetch();
    } catch (_error) {
      toast.error("Nao foi possivel conectar o Fastmail.");
    }
  };

  const handleCreateLlm = async () => {
    try {
      const baseUrl =
        llmProvider === "ollama" && !llmBaseUrl
          ? "http://localhost:11434"
          : llmBaseUrl || undefined;
      const apiKey = llmProvider === "openai" ? llmApiKey : undefined;

      await llmCreate.mutateAsync({
        provider: llmProvider,
        model: llmModel,
        apiKey: apiKey || undefined,
        baseUrl,
        isDefault: llmIsDefault || undefined,
      });

      toast.success("LLM adicionada com sucesso");
      await llmList.refetch();
      setIsLlmModalOpen(false);
      resetLlmForm();
    } catch (_error) {
      toast.error("Nao foi possivel adicionar a LLM.");
    }
  };

  return (
    <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-dark-primary border border-[#F2F4F7] dark:border-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
            Integrations and connected apps
          </h2>
          <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Veja o que ja esta integrado e conecte novos provedores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEmailSyncStartDate(getDefaultSyncStartDate());
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 dark:text-gray-200 dark:bg-gray-800 text-gray-600 hover:opacity-80"
        >
          <PlusIcon />
          Add integration
        </button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800 dark:border-gray-800 border border-gray-200 px-7 py-2 rounded-xl">
        {datasourcesQuery.isLoading ? (
          <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
            Carregando integracoes...
          </div>
        ) : connectedItems.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
            Nenhuma integracao conectada ainda.
          </div>
        ) : (
          connectedItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-5 md:flex-row md:items-center justify-between py-5"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 dark:text-white/90 dark:bg-white/5 dark:border-white/5 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center mr-3">
                  <item.Icon />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 mb-1">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                  {item.lastSyncedAt ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Ultima sincronizacao: {formatLastSync(item.lastSyncedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                {item.kind === "gmail" || item.kind === "fastmail" ? (
                  <div className="flex items-center gap-x-2">
                    <button
                      type="button"
                      onClick={() => handleReprocessConnection(item.id)}
                      className="px-5 dark:text-gray-400 dark:hover:bg-white/5 py-3 gap-2 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition flex items-center"
                      disabled={
                        forceReprocess.isPending || reprocessId === item.id
                      }
                    >
                      Reprocessar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveConnection(item.id)}
                      className="px-5 dark:text-gray-400 dark:hover:bg-white/5 py-3 gap-2 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition flex items-center"
                      disabled={removeDatasource.isPending}
                    >
                      <TrashIcon />
                      Remove
                    </button>
                    <span className="px-5 py-3 gap-2 text-sm dark:bg-white/5 text-white font-medium bg-gray-700 transition rounded-full flex items-center">
                      <CheckMarkIcon2 />
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-x-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveLlm(item.id)}
                      className="px-5 dark:text-gray-400 dark:hover:bg-white/5 py-3 gap-2 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition flex items-center"
                      disabled={llmRemove.isPending}
                    >
                      <TrashIcon />
                      Remove
                    </button>
                    <span className="px-5 py-3 gap-2 text-sm dark:bg-white/5 text-white font-medium bg-gray-700 transition rounded-full flex items-center">
                      <CheckMarkIcon2 />
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Adicionar integracao"
        description="Escolha os provedores que voce deseja conectar agora."
        className={{
          modal: "dark:bg-[#171F2E]",
        }}
      >
        <div className="mt-8 space-y-4">
          <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            Data inicial para sincronizacao de emails
            <input
              type="date"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={emailSyncStartDate}
              onChange={(event) => setEmailSyncStartDate(event.target.value)}
              required
            />
          </label>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 dark:text-white/90 dark:bg-white/5 dark:border-white/5 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center">
                <GoogleIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Gmail
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sincronize seus emails com notificacoes em tempo real.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGmailConnect}
              disabled={gmailAuth.isPending || isGmailConnected}
              className="px-4 py-2 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:opacity-80 disabled:opacity-50"
            >
              {isGmailConnected ? "Conectado" : "Conectar"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 dark:text-white/90 dark:bg-white/5 dark:border-white/5 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center">
                <FastmailIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Fastmail
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sincronize seus emails com JMAP.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFastmailConnect}
              disabled={fastmailConnect.isPending || isFastmailConnected}
              className="px-4 py-2 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:opacity-80 disabled:opacity-50"
            >
              {isFastmailConnected ? "Conectado" : "Conectar"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 dark:text-white/90 dark:bg-white/5 dark:border-white/5 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center">
                <ChatGPTIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  LLM providers
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Conecte OpenAI ou Ollama e escolha o modelo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsLlmModalOpen(true);
              }}
              className="px-4 py-2 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:opacity-80 disabled:opacity-50"
            >
              Conectar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isLlmModalOpen}
        onClose={() => {
          setIsLlmModalOpen(false);
          resetLlmForm();
        }}
        title="Adicionar provedor LLM"
        description="Configure o provedor e o modelo que sera usado para analisar emails."
        className={{
          modal: "dark:bg-[#171F2E]",
        }}
      >
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateLlm();
          }}
        >
          <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            Provedor
            <select
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={llmProvider}
              onChange={(event) =>
                setLlmProvider(event.target.value as "openai" | "ollama")
              }
            >
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            Modelo
            <input
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={llmModel}
              onChange={(event) => setLlmModel(event.target.value)}
              placeholder={
                llmProvider === "openai" ? "gpt-4o-mini" : "llama3.1"
              }
              required
            />
          </label>

          {llmProvider === "openai" ? (
            <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
              API key
              <input
                type="password"
                className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                value={llmApiKey}
                onChange={(event) => setLlmApiKey(event.target.value)}
                placeholder="sk-..."
                required
              />
            </label>
          ) : (
            <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
              Base URL
              <input
                className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                value={llmBaseUrl}
                onChange={(event) => setLlmBaseUrl(event.target.value)}
                placeholder="http://localhost:11434"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={llmIsDefault}
              onChange={(event) => setLlmIsDefault(event.target.checked)}
            />
            Usar como provedor principal
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLlmModalOpen(false);
                resetLlmForm();
              }}
              className="rounded-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-gray-800 px-5 py-2 text-sm font-medium text-white dark:bg-white/10"
              disabled={llmCreate.isPending}
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
