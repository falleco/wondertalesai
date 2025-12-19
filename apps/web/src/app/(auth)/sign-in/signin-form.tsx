"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@web/auth/client";
import { InputGroup } from "@web/components/ui/inputs";
import { Checkbox } from "@web/components/ui/inputs/checkbox";
import { authValidation } from "@web/lib/zod/auth.schema";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type Inputs = z.infer<typeof authValidation.login>;

export default function SignInForm() {
  const form = useForm<Inputs>({
    resolver: zodResolver(authValidation.login),
    defaultValues: {
      email: "",
    },
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(formData: Inputs) {
    setIsLoading(true);

    const { data, error } = await authClient.signIn.magicLink({
      email: formData.email,
      // name: "my-name",
      // callbackURL: "/dashboard",
      // newUserCallbackURL: "/welcome",
      // errorCallbackURL: "/error",
    });

    console.log("data", data);

    if (error) {
      toast.error(`Something went wrong: ${error.message}`);
    } else {
      toast.success("Please check your email to continue.");
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-5">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <InputGroup
              type="email"
              label=""
              placeholder="Your email address"
              groupClassName="col-span-full"
              disabled={isLoading}
              {...field}
              error={fieldState.error?.message}
            />
          )}
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <Checkbox
            label="Keep me logged in"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            name="remember_me"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary-500 hover:bg-primary-600 transition py-3 px-6 w-full font-medium text-white text-sm rounded-full"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </form>
  );
}
