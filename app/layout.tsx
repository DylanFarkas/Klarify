import type { Metadata } from "next";
import { Google_Sans_Flex } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { AgentThemeScript } from "@/components/agents/shared/theme/AgentThemeScript";
import "./globals.css";

const googleSansFlex = Google_Sans_Flex({
  variable: "--font-google-sans-flex",
  subsets: ["latin"],
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: "Klarify",
  description: "Transforma ideas en backlogs ejecutables con agentes de IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${googleSansFlex.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <AgentThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
