"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeCloseIcon, EyeIcon } from "@web/components/icons";
import { Input, InputGroup, Label } from "@web/components/ui/inputs";
import { Checkbox } from "@web/components/ui/inputs/checkbox";
import { authValidation } from "@web/lib/zod/auth.schema";
import Link from "next/link";
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
      password: "",
    },
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleShowPassword = () => {
    setIsShowPassword(!isShowPassword);
  };

  async function onSubmit(data: Inputs) {
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

    toast.success(
      <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>,
    );

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
              label="Email address"
              placeholder="Your email address"
              groupClassName="col-span-full"
              disabled={isLoading}
              {...field}
              error={fieldState.error?.message}
            />
          )}
        />

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              type={isShowPassword ? "text" : "password"}
              placeholder="Enter your password"
              id="password"
              disabled={isLoading}
              {...form.register("password")}
            />

            <button
              type="button"
              title={isShowPassword ? "Hide password" : "Show password"}
              aria-label={isShowPassword ? "Hide password" : "Show password"}
              onClick={handleShowPassword}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"
            >
              {isShowPassword ? <EyeIcon /> : <EyeCloseIcon />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <Checkbox
            label="Keep me logged in"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            name="remember_me"
          />

          <Link href="/reset-password" className="text-primary-500 text-sm">
            Forgot password?
          </Link>
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
