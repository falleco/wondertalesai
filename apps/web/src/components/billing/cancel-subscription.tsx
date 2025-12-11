"use client";

import { useState } from "react";
import CancelSubscriptionModal from "./cancel-subscription-modal";

type PropsType = {
  subscriptionId: string;
};

export function CancelSubscription({ subscriptionId }: PropsType) {
  const [cancelPlanModalOpen, setCancelPlanModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setCancelPlanModalOpen(true)}
        className="text-error-600 dark:bg-error-500/15 bg-error-50 text-sm inline-flex gap-2 items-center justify-center hover:text-white font-medium transition-colors hover:bg-error-600 py-3 px-6 rounded-full"
      >
        Cancel Subscription
      </button>

      <CancelSubscriptionModal
        isOpen={cancelPlanModalOpen}
        subscriptionId={subscriptionId}
        onClose={() => setCancelPlanModalOpen(false)}
      />
    </>
  );
}
