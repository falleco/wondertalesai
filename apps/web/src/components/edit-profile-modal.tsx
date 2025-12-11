"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// import { updateUser } from '@/actions/user';
import { InputGroup } from "@web/components/ui/inputs";
import { Modal } from "@web/components/ui/modal";
import { authValidation } from "@web/lib/zod/auth.schema";
// import { useSession } from 'next-auth/react';
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type Inputs = z.infer<typeof authValidation.update>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Inputs;
  onSave: (data: Inputs) => Promise<void>;
}

export function EditProfileModal({
  isOpen,
  onClose,
  data,
  onSave,
}: EditProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  // const { data: session } = useSession();

  const form = useForm({
    resolver: zodResolver(authValidation.update),
    defaultValues: data,
  });

  async function onSubmit(data: Inputs) {
    setIsLoading(true);
    try {
      // const res = await updateUser(data);
      const res = {
        error: "Not implemented",
        message: null,
      };

      if (res?.error) {
        toast.error(res.error);
      } else {
        await onSave(data);
        toast.success("Profile updated successfully");
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        form.reset(data);
      }}
      title="Edit Account Info"
      description="You can edit your account information from here."
    >
      <div className="mt-6">
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            control={form.control}
            name="firstName"
            render={({ field, fieldState }) => (
              <InputGroup
                label="First name"
                placeholder="Your first name"
                disabled={isLoading}
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="lastName"
            render={({ field, fieldState }) => (
              <InputGroup
                label="Last name"
                placeholder="Your last name"
                disabled={isLoading}
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />

          <InputGroup
            type="email"
            label="Email address"
            defaultValue={/*session?.user?.email || */ "examplemail@gmail.com"}
            className="disabled:cursor-not-allowed"
            placeholder="Your email address"
            groupClassName="col-span-full"
            disabled
          />

          <div className="space-x-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="text-white dark:bg-white/5 text-sm font-medium transition-colors hover:bg-gray-800 py-3 px-6 rounded-full border-gray-200 bg-gray-700 disabled:opacity-75"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-700 text-sm font-medium py-3 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 px-6 rounded-full border-gray-200 border disabled:opacity-75"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
