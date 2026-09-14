import { apiRequest } from "@/lib/api";
import { clearTokens, saveTokens } from "@/lib/auth-storage";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "doctor" | "admin";
  profilePicture?: string | null;
  isVerified: boolean;
  isActive: boolean;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const result = await apiRequest<AuthTokens>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  await saveTokens(result.accessToken, result.refreshToken);
  return result.user;
}

export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  const result = await apiRequest<AuthTokens>("/api/v1/auth/google", {
    method: "POST",
    body: { idToken },
  });
  await saveTokens(result.accessToken, result.refreshToken);
  return result.user;
}

export type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

/** Registration doesn't log the user in — they land on the login screen next, same as the web app. */
export async function registerUser(input: RegisterUserInput): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/v1/auth/register/user", {
    method: "POST",
    body: input,
  });
}

/** Same response whether or not the email is registered, so there's nothing to branch on here. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/api/v1/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiRequest(`/api/v1/auth/reset-password/${encodeURIComponent(token)}`, {
    method: "POST",
    body: { newPassword },
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/api/v1/auth/logout", { method: "POST", authenticated: true });
  } finally {
    await clearTokens();
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/api/v1/auth/me", { authenticated: true });
}
