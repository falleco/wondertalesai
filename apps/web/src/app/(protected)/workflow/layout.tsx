import WorkflowNav from "@web/components/workflow-nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workflow",
};

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <WorkflowNav />
      {children}
    </div>
  );
}
