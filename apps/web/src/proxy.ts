import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@web/auth/server";
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  console.log(session);
  // THIS IS NOT SECURE!
  // This is the recommended approach to optimistically redirect users
  // We recommend handling auth checks in each page/route
  if (!session) {
    console.log("redirecting to sign-in");
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  console.log("redirecting to dashboard");
  return NextResponse.next();
}
export const config = {
  matcher: ["/sandbox"], // Specify the routes the middleware applies to
};
