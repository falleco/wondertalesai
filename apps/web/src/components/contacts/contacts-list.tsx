"use client";

import EmailPagination from "@web/components/email/EmailInbox/EmailPagination";
import { Modal } from "@web/components/ui/modal/modal";
import { trpc } from "@web/trpc/react";
import { useMemo, useState } from "react";

const formatDate = (value?: Date | string | null) => {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString();
};

type ContactsListProps = {
  page: number;
  pageSize: number;
};

export default function ContactsList({ page, pageSize }: ContactsListProps) {
  const contactsQuery = trpc.contacts.list.useQuery({
    page,
    pageSize,
  });
  const contacts = contactsQuery.data?.contacts ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedContact = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    return contacts.find((contact) => contact.id === selectedId) ?? null;
  }, [contacts, selectedId]);

  const closeModal = () => {
    setSelectedId(null);
  };

  return (
    <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-dark-primary border border-[#F2F4F7] dark:border-gray-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
            Contacts
          </h2>
          <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Pessoas encontradas nas suas conversas.
          </p>
        </div>
      </div>

      {contactsQuery.isLoading ? (
        <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
          Carregando contatos...
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
          Nenhum contato encontrado ainda.
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => setSelectedId(contact.id)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {contact.name ?? contact.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {contact.email}
                </p>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(contact.firstMetAt)}
              </div>
            </button>
          ))}
        </div>
      )}

      {contactsQuery.data?.pagination ? (
        <EmailPagination
          page={contactsQuery.data.pagination.page}
          pageSize={contactsQuery.data.pagination.pageSize}
          total={contactsQuery.data.pagination.total}
          basePath="/contacts"
        />
      ) : null}

      <Modal
        isOpen={Boolean(selectedId)}
        onClose={closeModal}
        title={selectedContact?.name ?? selectedContact?.email ?? "Contact"}
        description={selectedContact?.email ?? ""}
      >
        {selectedContact ? (
          <div className="mt-6 space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                Primeiro encontro:
              </span>{" "}
              {formatDate(selectedContact.firstMetAt)}
            </div>

            {selectedContact.description ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Descricao:
                </span>{" "}
                {selectedContact.description}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {(selectedContact.tags ?? []).length > 0 ? (
                selectedContact.tags.map((tag) => (
                  <span
                    key={`${selectedContact.id}-${tag}`}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-200"
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
        ) : (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Contato nao encontrado.
          </div>
        )}
      </Modal>
    </div>
  );
}
