import IntegrationList from "@web/components/integration-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations",
};

export default function Integrations() {
  return <IntegrationList />;
}
