import { AgentThemeProvider } from '@/context/AgentThemeContext';

export default function AgentesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AgentThemeProvider>{children}</AgentThemeProvider>;
}
