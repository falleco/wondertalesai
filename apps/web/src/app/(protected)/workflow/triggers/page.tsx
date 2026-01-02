import WorkflowNav from "@web/components/workflow-nav";
import WorkflowTriggerList from "@web/components/workflow-trigger-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workflow Triggers",
};

export default function WorkflowTriggersPage() {
  return (
    <div className="space-y-6">
      <WorkflowNav />
      <WorkflowTriggerList />
    </div>
  );
}
