"use client";

import {
  ChatGPTIcon,
  CheckMarkIcon2,
  GoogleIcon,
  PlusIcon,
  TrashIcon,
} from "@web/components/icons";
import { trpc } from "@web/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiKeyModal } from "./api-key-modal";
import { Modal } from "./ui/modal/modal";

type ConnectedItem = {
  id: string;
  provider: string;
  name: string;
  description: string;
  status: string;
  lastSyncedAt?: Date | null;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
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
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isOpenAiConnected, setIsOpenAiConnected] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const integrationsQuery = trpc.integrations.list.useQuery();
  const { refetch } = integrationsQuery;
  const removeIntegration = trpc.integrations.remove.useMutation();
  const gmailAuth = trpc.integrations.gmailAuthUrl.useMutation();

  useEffect(() => {
    const apiKey = localStorage.getItem("openai-api-key");
    if (apiKey) {
      setIsOpenAiConnected(true);
    }
  }, []);

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

    const connections = integrationsQuery.data ?? [];
    for (const connection of connections) {
      if (connection.provider === "gmail") {
        items.push({
          id: connection.id,
          provider: connection.provider,
          name: "Gmail",
          description: connection.email
            ? `Conta conectada: ${connection.email}`
            : "Conta conectada",
          status: connection.status,
          lastSyncedAt: connection.lastSyncedAt ?? null,
          Icon: GoogleIcon,
        });
      }
    }

    if (isOpenAiConnected) {
      items.push({
        id: "openai",
        provider: "openai",
        name: "OpenAI",
        description: "Chave API salva no navegador",
        status: "connected",
        Icon: ChatGPTIcon,
      });
    }

    return items;
  }, [integrationsQuery.data, isOpenAiConnected]);

  const isGmailConnected = connectedItems.some(
    (item) => item.provider === "gmail" && item.status === "connected",
  );

  const handleOpenAiDisconnect = () => {
    localStorage.removeItem("openai-api-key");
    setIsOpenAiConnected(false);
    toast.success("OpenAI desconectado com sucesso");
  };

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      await removeIntegration.mutateAsync({ connectionId });
      toast.success("Integracao removida com sucesso");
      await refetch();
    } catch (_error) {
      toast.error("Nao foi possivel remover a integracao.");
    }
  };

  const handleGmailConnect = async () => {
    try {
      const redirectTo = `${window.location.origin}/integrations`;
      const response = await gmailAuth.mutateAsync({ redirectTo });
      setIsAddModalOpen(false);
      window.location.href = response.url;
    } catch (_error) {
      toast.error("Nao foi possivel iniciar a conexao com o Gmail.");
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
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 dark:text-gray-200 dark:bg-gray-800 text-gray-600 hover:opacity-80"
        >
          <PlusIcon />
          Add integration
        </button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800 dark:border-gray-800 border border-gray-200 px-7 py-2 rounded-xl">
        {integrationsQuery.isLoading ? (
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
                {item.provider === "openai" ? (
                  <div className="flex items-center gap-x-2">
                    <button
                      type="button"
                      onClick={handleOpenAiDisconnect}
                      className="px-5 dark:text-gray-400 dark:hover:bg-white/5 py-3 gap-2 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition flex items-center"
                    >
                      <TrashIcon />
                      Remove
                    </button>
                    <span className="px-5 py-3 gap-2 text-sm dark:bg-white/5 text-white font-medium bg-gray-700 transition rounded-full flex items-center">
                      <CheckMarkIcon2 />
                      Connected
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-x-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveConnection(item.id)}
                      className="px-5 dark:text-gray-400 dark:hover:bg-white/5 py-3 gap-2 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition flex items-center"
                      disabled={removeIntegration.isPending}
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
                <ChatGPTIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  OpenAI
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Adicione sua chave para usar os modelos GPT.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsApiKeyModalOpen(true);
              }}
              disabled={isOpenAiConnected}
              className="px-4 py-2 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:opacity-80 disabled:opacity-50"
            >
              {isOpenAiConnected ? "Conectado" : "Conectar"}
            </button>
          </div>
        </div>
      </Modal>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSubmit={() => {
          setIsOpenAiConnected(true);
        }}
      />
    </div>
  );
}
