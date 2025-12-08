"use client";

import { authClient } from "@web/auth/client";
import { GithubIcon, GoogleIcon } from "@web/components/icons";

export function SignInWithGoogle() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/redirect",
    });
  };

  return (
    <button
      type="button"
      className="bg-gray-100 text-left w-full justify-center  dark:hover:bg-white/10 dark:hover:text-white/90 dark:bg-white/5 transition dark:text-gray-400 font-normal text-sm hover:bg-gray-200 rounded-full text-gray-700 hover:text-gray-800 flex items-center gap-3 px-4 sm:px-8 py-2.5 min-h-12"
      onClick={signIn}
    >
      <GoogleIcon className="shrink-0" />
      <span>Sign in with Google</span>
    </button>
  );
}

export function SignInWithGithub() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/redirect",
    });
  };

  return (
    <button
      type="button"
      className="bg-gray-100 w-full justify-center  dark:hover:bg-white/10 dark:hover:text-white/90 dark:bg-white/5 transition dark:text-gray-400 font-normal text-sm hover:bg-gray-200 rounded-full text-gray-700 hover:text-gray-800 flex items-center gap-3 px-4 sm:px-8 py-2.5 text-left min-h-12"
      onClick={signIn}
    >
      <GithubIcon className="size-6 shrink-0" />
      <span>Sign in with Github</span>
    </button>
  );
}
