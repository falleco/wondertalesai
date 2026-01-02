"use client";

import { PlusIcon } from "@web/components/icons";
import { Input, Label } from "@web/components/ui/inputs";
import { Modal } from "@web/components/ui/modal/modal";
import { trpc } from "@web/trpc/react";
import { useId, useState } from "react";
import { toast } from "sonner";

const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};

export default function WorkflowRuleList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [outputTags, setOutputTags] = useState("");
  const textareaId = useId();

  const workflowQuery = trpc.workflow.list.useQuery();
  const createRule = trpc.workflow.create.useMutation();

  const rules = workflowQuery.data ?? [];

  const resetForm = () => {
    setName("");
    setGuidelines("");
    setOutputTags("");
  };

  const handleCreate = async () => {
    try {
      if (!name.trim() || !guidelines.trim()) {
        toast.error("Preencha nome e guidelines.");
        return;
      }
      const normalizedTags = outputTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      await createRule.mutateAsync({
        name,
        guidelines,
        outputTags: normalizedTags,
      });

      toast.success("Regra criada com sucesso");
      await workflowQuery.refetch();
      setIsModalOpen(false);
      resetForm();
    } catch (_error) {
      toast.error("Nao foi possivel criar a regra.");
    }
  };

  return (
    <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-dark-primary border border-[#F2F4F7] dark:border-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
            Workflow rules
          </h2>
          <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Crie regras e tags automaticas para organizar os seus emails.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700 dark:text-gray-200 dark:bg-gray-800 text-gray-600 hover:opacity-80"
        >
          <PlusIcon />
          Nova regra
        </button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800 dark:border-gray-800 border border-gray-200 px-7 py-2 rounded-xl">
        {workflowQuery.isLoading ? (
          <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
            Carregando regras...
          </div>
        ) : rules.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
            Nenhuma regra criada ainda.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 mb-1">
                  {rule.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
                  {rule.guidelines}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Criada em {formatDate(rule.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {rule.outputTags.length ? (
                  rule.outputTags.map((tag) => (
                    <span
                      key={`${rule.id}-${tag}`}
                      className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Sem tags
                  </span>
                )}
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
        title="Nova regra"
        description="Defina uma regra que sera usada para organizar os emails."
      >
        <div className="mt-6 space-y-5">
          <div>
            <Label htmlFor="workflow-name">Nome da regra</Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Contas e boletos"
              disabled={createRule.isPending}
            />
          </div>

          <div>
            <Label htmlFor={textareaId}>Guidelines</Label>
            <textarea
              id={textareaId}
              value={guidelines}
              onChange={(event) => setGuidelines(event.target.value)}
              placeholder="Descreva como identificar os emails que devem receber as tags."
              rows={5}
              disabled={createRule.isPending}
              className="w-full rounded-2xl border border-gray-300 px-5 py-3 text-left text-sm text-gray-800 shadow-theme-xs placeholder:text-sm placeholder:text-gray-400 focus:border-primary-300 focus:outline-0 focus:ring-3 focus:ring-primary-300/20 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-primary-500"
            />
          </div>

          <div>
            <Label htmlFor="workflow-tags">
              Output tags (separadas por virgula)
            </Label>
            <Input
              id="workflow-tags"
              value={outputTags}
              onChange={(event) => setOutputTags(event.target.value)}
              placeholder="Ex: financeiro, contas"
              disabled={createRule.isPending}
            />
          </div>

          <div className="space-x-3 mt-6">
            <button
              type="button"
              disabled={createRule.isPending}
              onClick={handleCreate}
              className="text-white dark:bg-white/5 text-sm font-medium transition-colors hover:bg-gray-800 py-3 px-6 rounded-full border-gray-200 bg-gray-700 disabled:opacity-75"
            >
              {createRule.isPending ? "Salvando..." : "Salvar regra"}
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
