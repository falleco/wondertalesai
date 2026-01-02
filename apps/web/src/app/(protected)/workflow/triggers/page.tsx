import WorkflowTriggerList from "@web/components/workflow-trigger-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workflow Triggers",
};

export default function WorkflowTriggersPage() {
  return <WorkflowTriggerList />;
}
