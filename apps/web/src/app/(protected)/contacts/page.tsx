import ContactsList from "@web/components/contacts/contacts-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacts",
};

type ContactsPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

const parsePage = (value?: string) => {
  if (!value) {
    return 1;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const page = parsePage((await searchParams)?.page);
  const pageSize = 20;
  return <ContactsList page={page} pageSize={pageSize} />;
}
