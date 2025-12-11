"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordInput } from "@web/components/ui/inputs";
import { Modal } from "@web/components/ui/modal";
// import { updatePassword } from '@/actions/user';
import { authValidation } from "@web/lib/zod/auth.schema";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type Inputs = z.infer<typeof authValidation.updatePasswordForm>;

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const form = useForm<Inputs>({
    resolver: zodResolver(authValidation.updatePasswordForm),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(_data: Inputs) {
    try {
      setIsLoading(true);
      // const res = await updatePassword(data);
      const res = {
        error: "Not implemented",
        message: null,
      };

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Password updated successfully");
        onClose();
        form.reset();
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      description="Make sure to create a strong password to mark your projects."
    >
      <div className="mt-6">
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-5">
            <Controller
              control={form.control}
              name="oldPassword"
              render={({ field, fieldState }) => (
                <PasswordInput
                  label="Old password"
                  placeholder="Enter your old password"
                  disabled={isLoading}
                  {...field}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <PasswordInput
                  label="New password"
                  placeholder="Enter your new password"
                  disabled={isLoading}
                  {...field}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="confirmNewPassword"
              render={({ field, fieldState }) => (
                <PasswordInput
                  label="Re-type new password"
                  placeholder="Re-type your new password"
                  disabled={isLoading}
                  {...field}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
          <div className="space-x-3 mt-6">
            <button
              disabled={isLoading}
              type="submit"
              className="text-white dark:bg-white/5 text-sm font-medium transition-colors hover:bg-gray-800 py-3 px-6 rounded-full border-gray-200 bg-gray-700 disabled:opacity-75"
            >
              Change Password
            </button>
            <button
              disabled={isLoading}
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
