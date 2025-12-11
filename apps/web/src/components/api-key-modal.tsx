"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "./ui/inputs";
import { Modal } from "./ui/modal/modal";

type PropsType = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (apiKey: string) => void;
};

export function ApiKeyModal({ isOpen, onClose, onSubmit }: PropsType) {
  const [apiKey, setApiKey] = useState("");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enter your OpenAI API Key"
      description="To access the capabilities of AI Tools Template, a valid OpenAI API Key is required."
      className={{
        modal: "dark:bg-[#171F2E]",
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem("openai-api-key", apiKey);
          onClose();
          onSubmit?.(apiKey);
          toast.success("API Key stored successfully");
        }}
        className="flex gap-3 mb-6 mt-8"
      >
        <Input
          type="password"
          placeholder="API-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          minLength={10}
          required
        />

        <button
          type="submit"
          className="rounded-full py-3 px-7 bg-[#344054] text-white dark:bg-white/5 hover:opacity-80"
        >
          Save
        </button>
      </form>

      <a
        href="https://platform.openai.com/api-keys"
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-sm font-medium text-[#344054] dark:text-[#98A2B3]"
      >
        Get your API key from OpenAI
      </a>
    </Modal>
  );
}
