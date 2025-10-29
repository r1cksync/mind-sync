import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that should bypass authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',           // Match /sign-in and its subroutes (e.g., /sign-in/[[...sign-in]])
  '/sign-up(.*)',           // Match /sign-up and its subroutes (e.g., /sign-up/[[...sign-up]])
  '/api/youtube-callback',
  '/api/spotify-callback',  // Public callback route
  '/api/spotify-login',     // Public login route
]);

export default clerkMiddleware(async (auth, req) => {
  // Log request details for debugging
  console.log('Middleware processing request:', req.url);

  try {
    // Get the authentication state
    const authState = await auth();
    const userId = authState.userId;
    const session = authState.session;
    console.log('Middleware auth userId:', userId);
    console.log('Middleware session:', session ? 'Valid' : 'Invalid');

    // Protect non-public routes only if a session is expected
    if (!isPublicRoute(req) && !userId && req.url !== '/sign-in') {
      console.log('Redirecting to sign-in due to unauthenticated access:', req.url);
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  } catch (error) {
    console.error('Clerk middleware error:', error);
    // Allow the request to proceed if an error occurs (e.g., invalid session)
    console.log('Proceeding despite error for:', req.url);
    return NextResponse.next();
  }

  // Proceed with the request
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webm)).*)',
    '/(api|trpc)(.*)',
  ],
};