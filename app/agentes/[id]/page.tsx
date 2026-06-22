"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar/Navbar";
import { use } from "react";

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Unwrap params using React.use for Next.js 15+ dynamic routes
  const { id } = use(params);

  useEffect(() => {
    // Guardar el último agente visitado para la persistencia de la sesión
    if (id) {
      localStorage.setItem("lastAgent", id);
    }
  }, [id]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-500 flex-col px-5 py-10 md:px-16">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1d]">
            Agente #{id}
          </h1>
          <p className="mt-2 text-[#5d616b]">
            Bienvenido, {user.displayName}. Este es tu espacio de trabajo para este agente específico.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">Panel de Control del Agente</h2>
          <p className="text-gray-600">
            Aquí se implementará la lógica principal y la persistencia de datos usando Firebase Database.
          </p>
        </section>
      </main>
    </>
  );
}
