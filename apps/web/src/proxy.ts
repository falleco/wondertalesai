import { auth } from "@web/auth/server";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // THIS IS NOT SECURE!
  // This is the recommended approach to optimistically redirect users
  // We recommend handling auth checks in each page/route
  if (!session) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}
export const config = {
  matcher: ["/sandbox"], // Specify the routes the middleware applies to
};
