"use client"

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWorkspace } from "@/lib/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Navbar() {
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);
    const { user, signOut, loading } = useAuth();
    const router = useRouter();

    const handleLogin = () => {
        router.push("/login");
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    const goToMyAgent = async () => {
        if (!user) {
            router.push("/login");
            return;
        }
        try {
            const { preferences } = await fetchWorkspace(user);
            router.push(`/agentes/${preferences.lastAgent || "1"}`);
        } catch {
            router.push("/agentes/1");
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 10) {
                setVisible(true);
            } else if (currentScrollY > lastScrollY.current) {
                setVisible(false);
            } else {
                setVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    
    return (
        <nav className={`sticky top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
            visible ? "translate-y-0" : "-translate-y-full"
        }`}>
            <div className="mx-auto flex h-16 w-full max-w-500 items-center justify-between px-5 md:px-16">
                <a className="text-xl font-extrabold tracking-tight text-[#191c1d]" href="#">
                    Klarify
                </a>
                <div className="ml-50 mr-auto hidden items-center gap-8 lg:flex">
                    <a className="border-b-2 border-[#005bbf] pb-1 text-sm font-bold text-[#005bbf]" href="#">
                        Producto
                    </a>
                    <a className="text-sm font-medium text-[#5d616b] transition-colors hover:text-[#005bbf]" href="#">
                        Casos de uso
                    </a>
                    <a className="text-sm font-medium text-[#5d616b] transition-colors hover:text-[#005bbf]" href="#">
                        Precios
                    </a>
                    <Link className="text-sm font-medium text-[#5d616b] transition-colors hover:text-[#005bbf]" href="/manual">
                        Manual
                    </Link>
                    <a className="text-sm font-medium text-[#5d616b] transition-colors hover:text-[#005bbf]" href="#">
                        Recursos
                    </a>
                </div>
                
                <div className="flex items-center gap-4">
                    {!loading && (
                        user ? (
                            <>
                                <button 
                                    onClick={goToMyAgent}
                                    className="text-sm font-bold text-[#005bbf] hover:underline"
                                >
                                    Ir a mi Agente
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-full border border-[#191c1d] px-5 py-2 text-sm font-bold text-[#191c1d] transition-colors hover:bg-gray-100 cursor-pointer"
                                >
                                    Cerrar sesión
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleLogin}
                                className="rounded-full bg-[#191c1d] px-5 py-2 text-sm font-bold text-white transition-transform hover:scale-[0.98]"
                            >
                                Iniciar sesión
                            </button>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
}