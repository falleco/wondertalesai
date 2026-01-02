import WorkflowRuleList from "@web/components/workflow-rule-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workflow",
};

export default function WorkflowPage() {
  return <WorkflowRuleList />;
}
