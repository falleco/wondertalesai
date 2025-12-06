"use client";

import { authClient } from "@web/auth/client";
import { trpc } from "@web/trpc/react";
import { useRouter } from "next/navigation";

export default function SandboxPage() {
  const ping = trpc.ping.useQuery();
  const me = trpc.auth.me.useQuery();
  const router = useRouter();

  const fetchPing = async () => {
    const response = await fetch("/server/auth/me");
    const data = await response.json();
    console.log(data);
  };

  const signOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <div>
      Ping: {ping.data}{" "}
      <button
        onClick={fetchPing}
        type="button"
        className="bg-blue-500 text-white p-2 rounded-md"
      >
        Fetch Ping
      </button>
      <button
        onClick={signOut}
        type="button"
        className="bg-blue-500 text-white p-2 rounded-md"
      >
        Sign Out
      </button>
      <pre>{JSON.stringify(me.data, null, 2)}</pre>
    </div>
  );
}
