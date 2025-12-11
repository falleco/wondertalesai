import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // await trpc.account.signUpOrSignIn.mutate();

  const next = req.nextUrl.searchParams.get("next");
  if (next) {
    return Response.redirect(new URL(next, req.url));
  }

  return Response.redirect(new URL("/", req.url));
}
