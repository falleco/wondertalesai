"use client";
import { Checkbox } from "@web/components/ui/checkbox";
import { Modal } from "@web/components/ui/modal/modal";
import { trpc } from "@web/trpc/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SimpleBar from "simplebar-react";
import EmailHeader from "./EmailHeader";
import EmailPagination from "./EmailPagination";

type Mail = {
  id: string;
  subject: string | null;
  snippet: string | null;
  sentAt: Date | string | null;
  isUnread: boolean;
  from: { name: string | null; email: string } | null;
};

type EmailContentProps = {
  emails: Mail[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

const formatTime = (value: Date | string | null) => {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

export default function EmailContent({
  emails,
  pagination,
}: EmailContentProps) {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(emails.length).fill(false),
  );
  const [starredItems, setStarredItems] = useState<boolean[]>(
    new Array(emails.length).fill(false),
  );
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const messageParam = searchParams.get("message");

  const emailDetailsQuery = trpc.datasources.emailDetails.useQuery(
    {
      messageId: selectedMessageId ?? "00000000-0000-0000-0000-000000000000",
    },
    { enabled: Boolean(selectedMessageId) },
  );

  useEffect(() => {
    setCheckedItems(new Array(emails.length).fill(false));
    setStarredItems(new Array(emails.length).fill(false));
  }, [emails.length]);

  useEffect(() => {
    if (messageParam && messageParam !== selectedMessageId) {
      setSelectedMessageId(messageParam);
    }
  }, [messageParam, selectedMessageId]);

  const toggleCheck = (index: number, checked: boolean) => {
    const updated = [...checkedItems];
    updated[index] = checked;
    setCheckedItems(updated);
  };

  const toggleStar = (index: number) => {
    const updated = [...starredItems];
    updated[index] = !updated[index];
    setStarredItems(updated);
  };
  const handleSelectAll = (checked: boolean) => {
    setCheckedItems(new Array(emails.length).fill(checked));
  };

  const allChecked = checkedItems.every(Boolean);
  const selectedEmail = emailDetailsQuery.data;

  const updateMessageParam = (messageId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (messageId) {
      params.set("message", messageId);
    } else {
      params.delete("message");
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  };

  const closeModal = () => {
    setSelectedMessageId(null);
    updateMessageParam(null);
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
    updateMessageParam(messageId);
  };

  const formatDateTime = (value?: Date | string | null) => {
    if (!value) {
      return "";
    }
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString();
  };

  const renderParticipants = (
    label: string,
    participants: { name: string | null; email: string }[],
  ) => {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {label}:
        </span>{" "}
        {participants.length > 0
          ? participants.map((entry, index) => (
              <span key={`${entry.email}-${index}`}>
                {entry.name ? `${entry.name} <${entry.email}>` : entry.email}
                {index < participants.length - 1 ? ", " : ""}
              </span>
            ))
          : "—"}
      </div>
    );
  };

  const getActionTitle = (action: Record<string, unknown>) => {
    const title = action.title;
    return typeof title === "string" && title.length > 0
      ? title
      : "Acao sem titulo";
  };

  const getUniqueKey = (base: string, counts: Map<string, number>) => {
    const current = counts.get(base) ?? 0;
    counts.set(base, current + 1);
    return current === 0 ? base : `${base}-${current}`;
  };

  return (
    <div className="rounded-2xl xl:col-span-12 w-full border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <EmailHeader isChecked={allChecked} onSelectAll={handleSelectAll} />
      <SimpleBar className="max-h-[510px] 2xl:max-h-[630px]">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {emails.map((mail, index) => (
            <div
              key={mail.id}
              className="relative hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/[0.03]"
            >
              <button
                type="button"
                aria-label={`Open email ${mail.subject ?? "details"}`}
                onClick={() => handleSelectMessage(mail.id)}
                className="absolute inset-0 z-20"
              />
              <div className="relative z-10 flex cursor-pointer items-center px-4 py-4">
                {/* Left Section */}
                <div className="flex items-center w-1/5">
                  {/* Custom Checkbox */}
                  <div className="relative z-30">
                    <Checkbox
                      checked={checkedItems[index]}
                      onChange={(checked) => toggleCheck(index, checked)}
                    />
                  </div>

                  {/* Star */}
                  <button
                    type="button"
                    className="relative z-30 ml-3 text-gray-400 cursor-pointer"
                    onClick={() => toggleStar(index)}
                    aria-pressed={starredItems[index]}
                    aria-label="Toggle star"
                  >
                    {starredItems[index] ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="#FDB022"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>Starred</title>
                        <path d="M9.99991 3.125L12.2337 7.65114L17.2286 8.37694L13.6142 11.9L14.4675 16.8747L9.99991 14.526L5.53235 16.8747L6.38558 11.9L2.77124 8.37694L7.76613 7.65114L9.99991 3.125Z" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>Not starred</title>
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M9.99993 2.375C10.2854 2.375 10.5461 2.53707 10.6725 2.79308L12.7318 6.96563L17.3365 7.63473C17.619 7.67578 17.8537 7.87367 17.9419 8.14517C18.0301 8.41668 17.9565 8.71473 17.7521 8.914L14.4201 12.1619L15.2067 16.748C15.255 17.0293 15.1393 17.3137 14.9083 17.4815C14.6774 17.6493 14.3712 17.6714 14.1185 17.5386L9.99993 15.3733L5.88137 17.5386C5.62869 17.6714 5.32249 17.6493 5.09153 17.4815C4.86057 17.3137 4.7449 17.0293 4.79316 16.748L5.57974 12.1619L2.24775 8.914C2.04332 8.71473 1.96975 8.41668 2.05797 8.14517C2.14619 7.87367 2.3809 7.67578 2.66341 7.63473L7.2681 6.96563L9.32738 2.79308C9.45373 2.53707 9.71445 2.375 9.99993 2.375ZM9.99993 4.81966L8.4387 7.98306C8.32946 8.20442 8.11828 8.35785 7.874 8.39334L4.38298 8.90062L6.90911 11.363C7.08587 11.5353 7.16653 11.7835 7.1248 12.0268L6.52847 15.5037L9.65093 13.8622C9.86942 13.7473 10.1304 13.7473 10.3489 13.8622L13.4714 15.5037L12.8751 12.0268C12.8333 11.7835 12.914 11.5353 13.0908 11.363L15.6169 8.90062L12.1259 8.39334C11.8816 8.35785 11.6704 8.20442 11.5612 7.98306L9.99993 4.81966Z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Subject */}
                  <span className="ml-3 text-sm text-gray-700 truncate dark:text-gray-400">
                    {mail.subject || "(no subject)"}
                  </span>
                </div>

                {/* Middle Section */}
                <div className="flex items-center w-3/5 gap-3">
                  <p className="text-sm text-gray-500 truncate">
                    {mail.snippet ?? ""}
                  </p>
                </div>

                {/* Right Section */}
                <div className="w-1/5 text-right">
                  <span className="block text-xs text-gray-400">
                    {formatTime(mail.sentAt)}
                  </span>
                  {mail.from ? (
                    <span className="block text-xs text-gray-400 truncate">
                      {mail.from.name ?? mail.from.email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SimpleBar>
      <EmailPagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
      />
      <Modal
        isOpen={Boolean(selectedMessageId)}
        onClose={closeModal}
        title={selectedEmail?.subject ?? "(no subject)"}
        description={selectedEmail ? (selectedEmail.snippet ?? "") : ""}
        className={{
          modal:
            "sm:w-[760px] max-h-[80vh] overflow-hidden flex flex-col gap-4",
        }}
      >
        {emailDetailsQuery.isLoading ? (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Carregando email...
          </div>
        ) : selectedEmail ? (
          <div className="mt-6 space-y-5 overflow-y-auto pr-2 max-h-[60vh]">
            <div className="flex flex-wrap gap-2">
              {selectedEmail.labels.length > 0 ? (
                selectedEmail.labels.map((label) => (
                  <span
                    key={label.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-200"
                  >
                    {label.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Sem labels
                </span>
              )}
            </div>

            <div className="space-y-2">
              {renderParticipants("From", selectedEmail.participants.from)}
              {renderParticipants("To", selectedEmail.participants.to)}
              {renderParticipants("Cc", selectedEmail.participants.cc)}
              {renderParticipants("Bcc", selectedEmail.participants.bcc)}
              {renderParticipants(
                "Reply-To",
                selectedEmail.participants.replyTo,
              )}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Sent:
                </span>{" "}
                {formatDateTime(selectedEmail.sentAt)}
              </div>
              {selectedEmail.thread ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Thread:
                  </span>{" "}
                  {selectedEmail.thread.subject ?? "(no subject)"} ·{" "}
                  {selectedEmail.thread.messageCount} mensagens ·{" "}
                  {selectedEmail.thread.unreadCount} nao lidas
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Mensagem
              </p>
              <p className="whitespace-pre-wrap">
                {selectedEmail.textBody ||
                  selectedEmail.htmlBody ||
                  selectedEmail.snippet ||
                  "Sem conteudo"}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Analise LLM
              </p>
              {selectedEmail.llm.email ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Resumo
                    </p>
                    <p className="whitespace-pre-wrap">
                      {selectedEmail.llm.email.summary ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const tagKeyCounts = new Map<string, number>();
                      return (selectedEmail.llm.email.tags ?? []).map((tag) => (
                        <span
                          key={getUniqueKey(`tag-${tag}`, tagKeyCounts)}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-200"
                        >
                          {tag}
                        </span>
                      ));
                    })()}
                    {(selectedEmail.llm.email.tags ?? []).length === 0 ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Sem tags
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Palavras-chave
                    </p>
                    <p className="whitespace-pre-wrap">
                      {(selectedEmail.llm.email.keywords ?? []).join(", ") ||
                        "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Acoes
                    </p>
                    {(selectedEmail.llm.email.actions ?? []).length > 0 ? (
                      <ul className="space-y-2">
                        {(() => {
                          const actionKeyCounts = new Map<string, number>();
                          return (
                            selectedEmail.llm.email.actions?.map((action) => {
                              const title =
                                typeof action.title === "string"
                                  ? action.title
                                  : "";
                              const dueDate =
                                typeof action.dueDate === "string"
                                  ? action.dueDate
                                  : "";
                              const category =
                                typeof action.category === "string"
                                  ? action.category
                                  : "";
                              const confidence =
                                typeof action.confidence === "number"
                                  ? action.confidence.toString()
                                  : "";
                              const baseKey = [
                                title,
                                dueDate,
                                category,
                                confidence,
                              ]
                                .filter(Boolean)
                                .join("|");
                              return (
                                <li
                                  key={getUniqueKey(
                                    baseKey || "action",
                                    actionKeyCounts,
                                  )}
                                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-white/5 dark:text-gray-300"
                                >
                                  {getActionTitle(action)}
                                </li>
                              );
                            }) ?? []
                          );
                        })()}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Nenhuma acao gerada
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Nenhuma analise encontrada para este email.
                </p>
              )}

              {selectedEmail.llm.thread ? (
                <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Analise da thread
                  </p>
                  <p className="whitespace-pre-wrap">
                    {selectedEmail.llm.thread.summary ?? "—"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Email nao encontrado.
          </div>
        )}
      </Modal>
    </div>
  );
}
