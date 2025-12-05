"use client";

import { authClient } from "@web/auth/client";

export default function SandboxPage() {
  const signIn = async () => {
    console.log("signing in");
    const data = await authClient.signIn.social({
      provider: "github",
    });
    console.log(data);
  };

  return (
    <div>
      Login Page{" "}
      <button onClick={signIn} type="button" className="bg-blue-500 text-white p-2 rounded-md">
        Sign In
      </button>
    </div>
  );
}
