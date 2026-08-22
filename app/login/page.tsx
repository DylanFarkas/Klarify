"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar/Navbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V2C5.373 2 2 5.373 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z"
      />
    </svg>
  );
}

function DarkAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px),
          linear-gradient(rgba(255, 255, 255, 0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.022) 1px, transparent 1px)
        `,
        backgroundSize: "64px 64px, 64px 64px, 16px 16px, 16px 16px",
        backgroundPosition: "-1px -1px",
        maskImage:
          "radial-gradient(ellipse 70% 65% at 50% 42%, #000 18%, transparent 72%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 65% at 50% 42%, #000 18%, transparent 72%)",
      }}
    />
  );
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithGithub, authError, clearAuthError } = useAuth();
  const router = useRouter();
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/agentes/proyectos");
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    try {
      clearAuthError();
      setIsGoogleLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      clearAuthError();
      setIsGithubLoading(true);
      await signInWithGithub();
    } catch (error) {
      console.error("Error al iniciar sesión con GitHub:", error);
    } finally {
      setIsGithubLoading(false);
    }
  };

  const busy = isGoogleLoading || isGithubLoading;

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#000000] text-white">
        <DarkAtmosphere />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <span aria-hidden="true" className="inline-flex h-5 w-5 rounded-[5px] bg-white" />
          <p className="text-sm text-white/50">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#000000]">
      <Navbar />

      <main className="relative overflow-hidden bg-[#000000] text-white">
        <DarkAtmosphere />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] max-w-360 flex-col items-center justify-center px-5 py-16 md:px-16 md:py-24">
          <div className="w-full max-w-110">
            <div className="mb-10 text-center">
              <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 shrink-0 rounded-[5px] bg-white"
                />
                <span className="text-lg font-extrabold tracking-tight text-white">Klarify</span>
                <span className="text-white/25">·</span>
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
                  Acceso
                </span>
              </div>

              <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.04em] text-white md:text-[2.75rem] md:leading-[1.06]">
                Continúa en Klarify
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-white/55">
                Inicia sesión para acceder a tus proyectos y backlogs.
              </p>
            </div>

            <section
              aria-labelledby="login-providers-title"
              className="rounded-2xl border border-white/10 bg-[#131313]/90 p-6 backdrop-blur-md md:p-8"
            >
              <div className="mb-5 flex items-center justify-center gap-3">
                <p
                  id="login-providers-title"
                  className="shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-white/45"
                >
                  Elige cómo entrar
                </p>
              </div>

              <div className="space-y-3">
                {authError && (
                  <p
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
                    role="alert"
                  >
                    {authError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={busy}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-transparent px-4 py-3.5 text-left text-sm font-bold text-white transition-all hover:border-white/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors group-hover:bg-white/10">
                    {isGoogleLoading ? <Spinner className="text-white/70" /> : <GoogleIcon />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      {isGoogleLoading ? "Conectando con Google…" : "Continuar con Google"}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-white/45">
                      Usa tu cuenta de Google Workspace o personal
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleGithubLogin}
                  disabled={busy}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-left text-sm font-bold text-[#0A0A0A] shadow-xl transition-all hover:-translate-y-0.5 hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5">
                    {isGithubLoading ? <Spinner className="text-[#0A0A0A]" /> : <GithubIcon />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      {isGithubLoading ? "Conectando con GitHub…" : "Continuar con GitHub"}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-black/45">
                      Ideal si ya trabajas con repositorios
                    </span>
                  </span>
                </button>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-center text-xs leading-5 text-white/45">
                  Al continuar, aceptas nuestros{" "}
                  <Link
                    href="/terminos"
                    className="font-medium text-white underline-offset-4 transition-colors hover:underline"
                  >
                    Términos de servicio
                  </Link>{" "}
                  y{" "}
                  <Link
                    href="/privacidad"
                    className="font-medium text-white underline-offset-4 transition-colors hover:underline"
                  >
                    Política de privacidad
                  </Link>
                  .
                </p>
              </div>
            </section>

            <p className="mt-8 text-center text-sm text-white/45">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                <span aria-hidden="true">←</span>
                Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
