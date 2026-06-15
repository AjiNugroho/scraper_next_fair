import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
 
export async function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
 
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/login", request.url));
	}
 
	return NextResponse.next();
}
 
export const config = {
    matcher: [
      '/((?!api/auth|api/v1/client|api/docs|api/webhooks|api/health|login|signup|forgot-password|_next/static|_next/image|favicon.ico|icon|apple-icon|sitemap.xml|robots.txt|sw.js|manifest.json|offline.html|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
    ],
}