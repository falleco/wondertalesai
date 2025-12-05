"use client";

import { trpc } from "@web/trpc/react";

export default function SandboxPage() {
  const ping = trpc.ping.useQuery();
  const me = trpc.auth.me.useQuery();

  const fetchPing = async () => {
    const response = await fetch("/server/auth/me");
    const data = await response.json();
    console.log(data);
  };
  return (
    <div>
      Ping: {ping.data}{" "}
      <button onClick={fetchPing} type="button" className="bg-blue-500 text-white p-2 rounded-md">
        Fetch Ping
      </button>
      <pre>{JSON.stringify(me.data, null, 2)}</pre>
    </div>
  );
}
