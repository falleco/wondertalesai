"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// import { resetPassword } from "@/actions/user";
import { PasswordInput } from "@web/components/ui/inputs";
import { authValidation } from "@web/lib/zod/auth.schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type Inputs = z.infer<typeof authValidation.resetPassword>;

type PropsType = {
  resetToken: string;
};

export default function ResetPasswordForm({ resetToken }: PropsType) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Inputs>({
    resolver: zodResolver(authValidation.resetPassword),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  async function onSubmit(data: Inputs) {
    setIsLoading(true);

    try {
      // const res = await resetPassword(resetToken, data);
      const res = {
        error: "Not implemented",
        message: null,
      };

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        router.push("/signin");
        form.reset();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <h3 className="text-gray-800 font-bold text-3xl mb-2 dark:text-white/90">
          Change Password
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Make sure to create a strong password to mark your projects.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-5">
          <Controller
            control={form.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <PasswordInput
                label="New Password"
                placeholder="Enter your new password"
                required
                error={fieldState.error?.message}
                disabled={isLoading}
                {...field}
              />
            )}
          />

          <Controller
            control={form.control}
            name="confirmNewPassword"
            render={({ field, fieldState }) => (
              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm your new password"
                required
                error={fieldState.error?.message}
                disabled={isLoading}
                {...field}
              />
            )}
          />

          <button
            className="bg-primary-500 hover:bg-primary-600 transition py-3 px-6 w-full font-medium text-white text-sm rounded-full"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Submitting..." : "Reset Password"}
          </button>
        </div>
      </form>
    </>
  );
}
