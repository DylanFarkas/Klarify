"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { auth, createGithubProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  type User,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
  linkWithCredential,
  signOut as firebaseSignOut,
  type AuthError,
  type UserCredential,
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  githubUsername: string | null;
  isGithubConnected: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  linkGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  githubUsername: null,
  isGithubConnected: false,
  signInWithGoogle: async () => {},
  signInWithGithub: async () => {},
  linkGithub: async () => {},
  signOut: async () => {},
  authError: null,
  clearAuthError: () => {},
});

async function persistGithubToken(user: User, accessToken: string): Promise<string | null> {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/github/connect", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "No se pudo guardar la conexión con GitHub");
  }

  const data = (await response.json()) as { username: string };
  return data.username;
}

function getGithubUsernameFromUser(user: User | null): string | null {
  if (!user) return null;
  const githubProvider = user.providerData.find((p) => p.providerId === "github.com");
  return githubProvider?.displayName ?? null;
}

function mapAuthError(error: unknown): string {
  const authError = error as AuthError;
  switch (authError.code) {
    case "auth/popup-closed-by-user":
      return "Se cerró la ventana de inicio de sesión.";
    case "auth/account-exists-with-different-credential":
      return "Ya existe una cuenta con este email. Inicia sesión con tu proveedor original para vincular GitHub.";
    case "auth/credential-already-in-use":
      return "Esta cuenta de GitHub ya está vinculada a otro usuario.";
    case "auth/email-already-in-use":
      return "Este email ya está en uso con otro proveedor.";
    default:
      return "No se pudo completar la autenticación. Inténtalo de nuevo.";
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const isGithubConnected = useMemo(
    () => user?.providerData.some((p) => p.providerId === "github.com") ?? false,
    [user]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser?.providerData.some((p) => p.providerId === "github.com")) {
        try {
          const idToken = await currentUser.getIdToken();
          const response = await fetch("/api/github/connect", {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (response.ok) {
            const data = (await response.json()) as { username?: string };
            if (data.username) {
              setGithubUsername(data.username);
            }
          } else {
            setGithubUsername(getGithubUsernameFromUser(currentUser));
          }
        } catch {
          setGithubUsername(getGithubUsernameFromUser(currentUser));
        }
      } else {
        setGithubUsername(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const handleGithubResult = useCallback(async (result: UserCredential) => {
    const credential = GithubAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error("No se obtuvo el token de acceso de GitHub");
    }

    const username = await persistGithubToken(result.user, accessToken);
    setGithubUsername(username);
  }, []);

  const handleAccountExistsError = useCallback(async (error: AuthError) => {
    const pendingCredential = GithubAuthProvider.credentialFromError(error);
    const email = error.customData?.email as string | undefined;

    if (!pendingCredential || !email) {
      throw error;
    }

    const googleResult = await signInWithPopup(auth, new GoogleAuthProvider());
    const linkResult = await linkWithCredential(googleResult.user, pendingCredential);
    await handleGithubResult(linkResult);
  }, [handleGithubResult]);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      setAuthError(mapAuthError(error));
    }
  };

  const signInWithGithub = async () => {
    try {
      setAuthError(null);
      const provider = createGithubProvider();
      const result = await signInWithPopup(auth, provider);
      await handleGithubResult(result);
    } catch (error) {
      const authErr = error as AuthError;
      if (authErr.code === "auth/account-exists-with-different-credential") {
        try {
          setAuthError(null);
          await handleAccountExistsError(authErr);
          return;
        } catch (linkError) {
          console.error("Error linking GitHub account", linkError);
          setAuthError(mapAuthError(linkError));
          return;
        }
      }

      console.error("Error signing in with GitHub", error);
      setAuthError(mapAuthError(error));
    }
  };

  const linkGithub = async () => {
    if (!user) {
      setAuthError("Debes iniciar sesión antes de conectar GitHub.");
      return;
    }

    try {
      setAuthError(null);
      const provider = createGithubProvider();
      const result = await linkWithPopup(user, provider);
      await handleGithubResult(result);
    } catch (error) {
      console.error("Error linking GitHub", error);
      setAuthError(mapAuthError(error));
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setGithubUsername(null);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        githubUsername,
        isGithubConnected,
        signInWithGoogle,
        signInWithGithub,
        linkGithub,
        signOut,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
