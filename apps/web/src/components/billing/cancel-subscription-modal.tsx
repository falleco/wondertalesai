import { Modal } from "@web/components/ui/modal";
import { useState } from "react";
// import { cancelSubscription } from "@web/actions/payments";
import { toast } from "sonner";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  subscriptionId: _subscriptionId,
}: EditProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleOnYes() {
    try {
      setIsLoading(true);
      // const res = await cancelSubscription(subscriptionId);
      const res = {
        error: "Not implemented",
        message: null,
      };

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Subscription has been canceled");
        window.location.reload();
      }
    } catch (e) {
      if (e instanceof Error) {
        toast.error(e.message);
      }
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center w-full flex flex-col items-center">
        <div className="mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="112"
            height="112"
            viewBox="0 0 112 112"
            fill="none"
            role="img"
            aria-label="Cancel subscription warning"
          >
            <title>Cancel subscription warning</title>
            <path
              d="M56.8074 9.9437C53.1447 5.95878 46.8573 5.95879 43.1946 9.9437L27.9969 26.4783C27.4698 27.0518 26.5634 27.0469 26.0426 26.4677L11.5142 10.3134C7.46656 5.81269 0.000976562 8.67593 0.000976562 14.729V75.7316C0.000976562 82.2961 5.32256 87.6177 11.8871 87.6177H88.1149C94.6794 87.6177 100.001 82.2961 100.001 75.7316V15.1703C100.001 9.15227 92.6084 6.27093 88.5359 10.7017L73.9923 26.5246C73.4691 27.0939 72.5709 27.0939 72.0476 26.5246L56.8074 9.9437Z"
              fill="#FEE4E2"
            />
            <circle cx="83.999" cy="77.045" r="28" fill="#F97066" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M73.9389 72.4496C72.4292 70.94 72.4292 68.4923 73.9389 66.9827C75.4486 65.473 77.8962 65.473 79.4059 66.9827L84.0013 71.578L88.5936 66.9857C90.1033 65.476 92.5509 65.4761 94.0606 66.9857C95.5702 68.4954 95.5702 70.943 94.0606 72.4527L89.4683 77.045L94.0606 81.6374C95.5703 83.147 95.5703 85.5947 94.0606 87.1044C92.5509 88.614 90.1033 88.614 88.5936 87.1044L84.0013 82.512L79.4059 87.1074C77.8962 88.6171 75.4486 88.6171 73.9389 87.1074C72.4292 85.5977 72.4292 83.1501 73.9389 81.6404L78.5343 77.045L73.9389 72.4496Z"
              fill="#FFE6E6"
            />
          </svg>
        </div>
        <h3
          className="text-2xl font-semibold dark:text-white/90 text-gray-800"
          id="modal-title"
        >
          Are you sure you want to Cancel your subscription plan?
        </h3>
        <div className="space-x-3 flex items-center mt-6">
          <button
            onClick={handleOnYes}
            type="button"
            disabled={isLoading}
            className="text-error-600 dark:bg-error-500/10 inline-flex gap-2 hover:text-white items-center text-sm font-medium transition-colors hover:bg-error-600 py-3 px-6 rounded-full bg-error-100 disabled:pointer-events-none disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              role="img"
              aria-label="Delete icon"
            >
              <title>Delete icon</title>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.54093 3.79167C6.54093 2.54903 7.54829 1.54167 8.79093 1.54167H11.2076C12.4502 1.54167 13.4576 2.54903 13.4576 3.79167V4.04167H15.6247H16.6655C17.0797 4.04167 17.4155 4.37746 17.4155 4.79167C17.4155 5.20589 17.0797 5.54167 16.6655 5.54167H16.3747V8.24655V13.2465V16.2083C16.3747 17.451 15.3673 18.4583 14.1247 18.4583H5.87467C4.63203 18.4583 3.62467 17.451 3.62467 16.2083V13.2465V8.24655V5.54167H3.33301C2.91879 5.54167 2.58301 5.20589 2.58301 4.79167C2.58301 4.37746 2.91879 4.04167 3.33301 4.04167H4.37467H6.54093V3.79167ZM14.8747 13.2465V8.24655V5.54167H13.4576H12.7076H7.29093H6.54093H5.12467V8.24655V13.2465V16.2083C5.12467 16.6226 5.46046 16.9583 5.87467 16.9583H14.1247C14.5389 16.9583 14.8747 16.6226 14.8747 16.2083V13.2465ZM8.04093 4.04167H11.9576V3.79167C11.9576 3.37746 11.6218 3.04167 11.2076 3.04167H8.79093C8.37672 3.04167 8.04093 3.37746 8.04093 3.79167V4.04167ZM8.33301 8.00001C8.74722 8.00001 9.08301 8.33579 9.08301 8.75001V13.75C9.08301 14.1642 8.74722 14.5 8.33301 14.5C7.91879 14.5 7.58301 14.1642 7.58301 13.75V8.75001C7.58301 8.33579 7.91879 8.00001 8.33301 8.00001ZM12.4163 8.75001C12.4163 8.33579 12.0806 8.00001 11.6663 8.00001C11.2521 8.00001 10.9163 8.33579 10.9163 8.75001V13.75C10.9163 14.1642 11.2521 14.5 11.6663 14.5C12.0806 14.5 12.4163 14.1642 12.4163 13.75V8.75001Z"
                fill="currentColor"
              />
            </svg>
            Yes, Cancel
          </button>

          <button
            onClick={onClose}
            type="button"
            disabled={isLoading}
            className="text-white dark:bg-white/5 text-sm font-medium transition-colors hover:bg-gray-800 py-3 px-6 rounded-full bg-gray-700 disabled:pointer-events-none disabled:opacity-50"
          >
            Not Really
          </button>
        </div>
      </div>
    </Modal>
  );
}
