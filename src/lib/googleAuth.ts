/**
 * Google Identity Services (GIS) OAuth 2.0 Integration
 */

export interface GoogleAuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  authMethod: 'google';
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

export interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Fetch Google Client ID from backend or environment variable
 */
export async function getGoogleClientId(): Promise<string> {
  try {
    const res = await fetch('/api/auth/google-config');
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) return data.clientId;
    }
  } catch (err) {
    console.warn('Could not fetch google-config from backend:', err);
  }

  // Fallback to Vite env if present
  return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
}

/**
 * Check if Google OAuth Client ID is configured
 */
export async function isGoogleConfigured(): Promise<boolean> {
  const cid = await getGoogleClientId();
  return Boolean(cid && cid.trim().length > 5);
}

/**
 * Ensures Google Identity Services (GIS) SDK script is loaded
 */
export function ensureGoogleScriptLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In SDK')));
      // Check if already loaded
      if (window.google?.accounts?.oauth2) {
        resolve();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In SDK. Please check your connection.'));
    document.head.appendChild(script);
  });
}

/**
 * Trigger real Google OAuth popup flow and exchange token with backend
 */
export async function triggerGoogleSignIn(): Promise<GoogleAuthUser> {
  // 1. Ensure Google script is loaded
  await ensureGoogleScriptLoaded();

  // 2. Obtain Google Client ID
  const clientId = await getGoogleClientId();
  if (!clientId || !clientId.trim() || clientId.trim().length < 5) {
    throw new Error('GOOGLE_CLIENT_ID_NOT_CONFIGURED');
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is not initialized.');
  }

  // 3. Request Access Token via Google OAuth popup
  const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'openid email profile',
        callback: (response: GoogleTokenResponse) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || 'Google Sign-In failed'));
          } else if (response.access_token) {
            resolve(response);
          } else {
            reject(new Error('No access token returned by Google'));
          }
        },
        error_callback: (error: any) => {
          if (error?.type === 'popup_closed') {
            reject(new Error('Google Sign-In was cancelled (popup closed).'));
          } else {
            reject(new Error(error?.message || 'Google Sign-In popup error'));
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      reject(new Error(err?.message || 'Failed to initialize Google Sign-In client'));
    }
  });

  if (!tokenResponse.access_token) {
    throw new Error('Google authentication did not return a valid token.');
  }

  // 4. Send token to backend for server-side verification
  const verifyRes = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: tokenResponse.access_token }),
  });

  if (!verifyRes.ok) {
    const errorData = await verifyRes.json().catch(() => ({}));
    throw new Error(errorData.error || `Server verification failed with status ${verifyRes.status}`);
  }

  const data = await verifyRes.json();
  if (!data.success || !data.user) {
    throw new Error(data.error || 'Google authentication verification failed.');
  }

  return {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    avatar: data.user.avatar,
    authMethod: 'google',
  };
}
