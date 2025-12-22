"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// import { updateUser } from '@/actions/user';
import { InputGroup } from "@web/components/ui/inputs";
import { Modal } from "@web/components/ui/modal";
import { authValidation } from "@web/lib/zod/auth.schema";
// import { useSession } from 'next-auth/react';
import Image from "next/image";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type Inputs = z.infer<typeof authValidation.update>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Inputs;
  email: string;
  onSave: (data: Inputs) => Promise<void>;
}

export function EditProfileModal({
  isOpen,
  onClose,
  data,
  email,
  onSave,
}: EditProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    data.image ?? null,
  );
  // const { data: session } = useSession();

  const form = useForm<Inputs>({
    resolver: zodResolver(authValidation.update),
    defaultValues: data,
  });

  useEffect(() => {
    setAvatarPreview(data.image ?? null);
  }, [data.image]);

  async function onSubmit(data: Inputs) {
    setIsLoading(true);
    try {
      await onSave(data);
      toast.success("Profile updated successfully");
      onClose();
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
        setAvatarPreview(data.image ?? null);
      }}
      title="Edit Account Info"
      description="You can edit your account information from here."
    >
      <div className="mt-6">
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            control={form.control}
            name="fullName"
            render={({ field, fieldState }) => (
              <InputGroup
                label="Full name"
                placeholder="Your full name"
                disabled={isLoading}
                {...field}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="image"
            render={({ field, fieldState }) => (
              <InputGroup
                type="file"
                accept="image/*"
                label="Avatar"
                disabled={isLoading}
                error={fieldState.error?.message}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) {
                    field.onChange(data.image ?? null);
                    setAvatarPreview(data.image ?? null);
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result =
                      typeof reader.result === "string" ? reader.result : null;
                    field.onChange(result);
                    setAvatarPreview(result);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            )}
          />

          <InputGroup
            type="email"
            label="Email address"
            defaultValue={email}
            className="disabled:cursor-not-allowed"
            placeholder="Your email address"
            groupClassName="col-span-full"
            disabled
          />

          {avatarPreview ? (
            <div className="flex items-center gap-3">
              <Image
                src={avatarPreview}
                alt="Avatar preview"
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Preview
              </span>
            </div>
          ) : null}

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
