"use client";

import { PlusIcon } from "@web/components/icons";
import { Input, Label } from "@web/components/ui/inputs";
import { Modal } from "@web/components/ui/modal/modal";
import { cn } from "@web/lib/utils";
import { trpc } from "@web/trpc/react";
import { useId, useState } from "react";
import { toast } from "sonner";

type TriggerActionConfig = {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type TriggerAction = {
  type: "webhook";
  config: TriggerActionConfig;
};

type TriggerItem = {
  id: string;
  name: string;
  conditions: string;
  status: "active" | "paused";
  action: TriggerAction;
  createdAt: Date | string;
};

const methodOptions = ["POST", "PUT", "PATCH", "GET", "DELETE"] as const;

const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};

const getActionSummary = (action: TriggerAction) => {
  const method = action.config.method ?? "POST";
  const url = action.config.url ?? "";
  return `${method} ${url}`.trim();
};

const formatHeaders = (headers?: Record<string, string>) => {
  if (!headers || Object.keys(headers).length === 0) {
    return "";
  }
  return JSON.stringify(headers, null, 2);
};

export default function WorkflowTriggerList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [conditions, setConditions] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<(typeof methodOptions)[number]>("POST");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const conditionsId = useId();
  const headersId = useId();
  const bodyId = useId();

  const triggersQuery = trpc.workflow.triggersList.useQuery();
  const createTrigger = trpc.workflow.triggerCreate.useMutation();
  const updateTrigger = trpc.workflow.triggerUpdate.useMutation();
  const pauseTrigger = trpc.workflow.triggerPause.useMutation();
  const resumeTrigger = trpc.workflow.triggerResume.useMutation();

  const triggers = (triggersQuery.data ?? []) as TriggerItem[];

  const resetForm = () => {
    setName("");
    setConditions("");
    setUrl("");
    setMethod("POST");
    setHeaders("");
    setBody("");
    setEditingTriggerId(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (trigger: TriggerItem) => {
    setEditingTriggerId(trigger.id);
    setName(trigger.name);
    setConditions(trigger.conditions);
    setUrl(trigger.action.config.url ?? "");
    setMethod(
      (trigger.action.config.method as (typeof methodOptions)[number]) ??
        "POST",
    );
    setHeaders(formatHeaders(trigger.action.config.headers));
    setBody(trigger.action.config.body ?? "");
    setIsModalOpen(true);
  };

  const parseHeaders = () => {
    if (!headers.trim()) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(headers) as Record<string, unknown>;
      if (!parsed || Array.isArray(parsed)) {
        toast.error("Headers devem ser um objeto JSON.");
        return null;
      }
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        normalized[key] = String(value);
      }
      return normalized;
    } catch (_error) {
      toast.error("Headers JSON invalido.");
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !conditions.trim() || !url.trim()) {
      toast.error("Preencha nome, condicoes e URL.");
      return;
    }

    const parsedHeaders = parseHeaders();
    if (parsedHeaders === null) {
      return;
    }

    const payload = {
      name,
      conditions,
      action: {
        type: "webhook" as const,
        config: {
          url,
          method,
          headers: parsedHeaders,
          body: body || undefined,
        },
      },
    };

    try {
      if (editingTriggerId) {
        await updateTrigger.mutateAsync({
          triggerId: editingTriggerId,
          ...payload,
        });
        toast.success("Trigger atualizado");
      } else {
        await createTrigger.mutateAsync(payload);
        toast.success("Trigger criado");
      }

      await triggersQuery.refetch();
      setIsModalOpen(false);
      resetForm();
    } catch (_error) {
      toast.error("Nao foi possivel salvar o trigger.");
    }
  };

  const handleStatusToggle = async (trigger: TriggerItem) => {
    try {
      if (trigger.status === "active") {
        await pauseTrigger.mutateAsync({ triggerId: trigger.id });
        toast.success("Trigger pausado");
      } else {
        await resumeTrigger.mutateAsync({ triggerId: trigger.id });
        toast.success("Trigger ativado");
      }
      await triggersQuery.refetch();
    } catch (_error) {
      toast.error("Nao foi possivel atualizar o status.");
    }
  };

  return (
    <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-dark-primary border border-[#F2F4F7] dark:border-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
            Workflow triggers
          </h2>
          <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Dispare webhooks quando as condicoes forem atendidas.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 dark:text-gray-200 dark:bg-gray-800 text-gray-600 hover:opacity-80"
        >
          <PlusIcon />
          Novo trigger
        </button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800 dark:border-gray-800 border border-gray-200 px-7 py-2 rounded-xl">
        {triggersQuery.isLoading ? (
          <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
            Carregando triggers...
          </div>
        ) : triggers.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
            Nenhum trigger criado ainda.
          </div>
        ) : (
          triggers.map((trigger) => (
            <div
              key={trigger.id}
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {trigger.name}
                  </h3>
                  <span
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full",
                      trigger.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {trigger.status === "active" ? "Ativo" : "Pausado"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line mt-2">
                  {trigger.conditions}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {getActionSummary(trigger.action)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Criado em {formatDate(trigger.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(trigger)}
                  className="px-5 py-3 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusToggle(trigger)}
                  className="px-5 py-3 text-sm text-white font-medium rounded-full bg-gray-700 transition"
                >
                  {trigger.status === "active" ? "Pausar" : "Ativar"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingTriggerId ? "Editar trigger" : "Novo trigger"}
        description="Configure condicoes e o webhook que sera chamado."
        className={{ modal: "sm:w-[720px]" }}
      >
        <div className="mt-6 space-y-5">
          <div>
            <Label htmlFor="trigger-name">Nome do trigger</Label>
            <Input
              id="trigger-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Boletos vencendo"
              disabled={createTrigger.isPending || updateTrigger.isPending}
            />
          </div>

          <div>
            <Label htmlFor={conditionsId}>Condicoes</Label>
            <textarea
              id={conditionsId}
              value={conditions}
              onChange={(event) => setConditions(event.target.value)}
              placeholder="Descreva quando o webhook deve ser disparado."
              rows={5}
              disabled={createTrigger.isPending || updateTrigger.isPending}
              className="w-full rounded-2xl border border-gray-300 px-5 py-3 text-left text-sm text-gray-800 shadow-theme-xs placeholder:text-sm placeholder:text-gray-400 focus:border-primary-300 focus:outline-0 focus:ring-3 focus:ring-primary-300/20 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-primary-500"
            />
          </div>

          <div>
            <Label htmlFor="trigger-url">Webhook URL</Label>
            <Input
              id="trigger-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://seu-endpoint.com/webhook"
              disabled={createTrigger.isPending || updateTrigger.isPending}
            />
          </div>

          <div>
            <Label htmlFor="trigger-method">Metodo</Label>
            <select
              id="trigger-method"
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as (typeof methodOptions)[number])
              }
              disabled={createTrigger.isPending || updateTrigger.isPending}
              className="h-12 w-full rounded-full border border-gray-300 px-5 py-2.5 text-left text-sm text-gray-800 shadow-theme-xs focus:border-primary-300 focus:outline-0 focus:ring-3 focus:ring-primary-300/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-primary-500"
            >
              {methodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor={headersId}>Headers (JSON)</Label>
            <textarea
              id={headersId}
              value={headers}
              onChange={(event) => setHeaders(event.target.value)}
              placeholder='{"Authorization": "Bearer ..."}'
              rows={4}
              disabled={createTrigger.isPending || updateTrigger.isPending}
              className="w-full rounded-2xl border border-gray-300 px-5 py-3 text-left text-sm text-gray-800 shadow-theme-xs placeholder:text-sm placeholder:text-gray-400 focus:border-primary-300 focus:outline-0 focus:ring-3 focus:ring-primary-300/20 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-primary-500"
            />
          </div>

          <div>
            <Label htmlFor={bodyId}>Body</Label>
            <textarea
              id={bodyId}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Payload enviado no webhook"
              rows={4}
              disabled={createTrigger.isPending || updateTrigger.isPending}
              className="w-full rounded-2xl border border-gray-300 px-5 py-3 text-left text-sm text-gray-800 shadow-theme-xs placeholder:text-sm placeholder:text-gray-400 focus:border-primary-300 focus:outline-0 focus:ring-3 focus:ring-primary-300/20 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-primary-500"
            />
          </div>

          <div className="space-x-3 mt-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createTrigger.isPending || updateTrigger.isPending}
              className="text-white dark:bg-white/5 text-sm font-medium transition-colors hover:bg-gray-800 py-3 px-6 rounded-full border-gray-200 bg-gray-700 disabled:opacity-75"
            >
              {createTrigger.isPending || updateTrigger.isPending
                ? "Salvando..."
                : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="text-gray-700 text-sm font-medium py-3 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 px-6 rounded-full border-gray-200 border disabled:opacity-75"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
