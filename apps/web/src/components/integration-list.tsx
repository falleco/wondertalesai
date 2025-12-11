"use client";

import {
  ChatGPTIcon,
  CheckMarkIcon2,
  FigmaIcon,
  MidjourneyIcon,
  TrashIcon,
} from "@web/components/icons";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiKeyModal } from "./api-key-modal";

export default function IntegrationList() {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isChatGptConnected, setIsChatGptConnected] = useState(false);

  useEffect(() => {
    const apiKey = localStorage.getItem("openai-api-key");
    if (apiKey) {
      setIsChatGptConnected(true);
    }
  }, []);

  return (
    <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-dark-primary border border-[#F2F4F7] dark:border-gray-800">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
          Integrations and connected apps
        </h2>
        <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
          Supercharge your workflow and connect the tool you use every day.
        </p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800 dark:border-gray-800 border border-gray-200 px-7 py-2 rounded-xl">
        <div>
          <div className="flex flex-col gap-5 md:flex-row md:items-center justify-between py-5">
            <div className="flex items-center">
              <div className="w-10 h-10 dark:text-white/90 dark:bg-white/5 dark:border-white/5 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center mr-3">
                <ChatGPTIcon />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 mb-1">
                  ChatGPT
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Imaginative powers of the human species.
                </p>
              </div>
            </div>
            <div>
              {isChatGptConnected ? (
                <div className="flex items-center gap-x-2">
                  {" "}
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("openai-api-key");
                      setIsChatGptConnected(false);
                      toast.success("ChatGPT disconnected successfully");
                    }}
                    className="px-5 dark:text-gray-400 dark:hover:bg-white/5 py-3 gap-2 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition flex items-center"
                  >
                    <TrashIcon />
                    Remove
                  </button>
                  <button
                    type="button"
                    className="px-5 py-3 gap-2 text-sm dark:bg-white/5 text-white font-medium bg-gray-700 transition rounded-full hover:bg-gray-800 flex items-center"
                  >
                    <CheckMarkIcon2 />
                    Connected
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-x-4">
                  <button
                    type="button"
                    className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:opacity-70"
                  >
                    Learn more
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="px-5 py-3 gap-2 text-sm text-gray-600 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700 font-medium border border-gray-200 rounded-full hover:opacity-70 transition flex items-center"
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>
          </div>

          <ApiKeyModal
            isOpen={isApiKeyModalOpen}
            onClose={() => setIsApiKeyModalOpen(false)}
            onSubmit={() => {
              setIsChatGptConnected(true);
            }}
          />
        </div>

        {/* <!-- Midjourney --> */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center justify-between py-5">
          <div className="flex items-center">
            <div className="w-10 h-10 dark:text-white/90 dark:bg-white/5 dark:border-white/5 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center mr-3">
              <MidjourneyIcon />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 mb-1">
                Midjourney
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Imaginative powers of the human species.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:opacity-70"
            >
              Learn more
            </button>
            <button
              type="button"
              onClick={() => toast.info("Feature not available yet")}
              className="px-5 py-3 gap-2 text-sm text-gray-600 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700 font-medium border border-gray-200 rounded-full hover:opacity-70 transition flex items-center"
            >
              Connect
            </button>
          </div>
        </div>

        {/* <!-- Figma --> */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center justify-between py-5">
          <div className="flex items-center">
            <div className="w-10 h-10 dark:text-white/90 dark:bg-white/5 dark:border-white/5 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center mr-3">
              <FigmaIcon />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 mb-1">
                Figma
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Imaginative powers of the human species.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:opacity-70"
            >
              Learn more
            </button>
            <button
              type="button"
              onClick={() => toast.info("Feature not available yet")}
              className="px-5 py-3 gap-2 text-sm text-gray-600 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700 font-medium border border-gray-200 rounded-full hover:opacity-70 transition flex items-center"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
