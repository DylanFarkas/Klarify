"use client";

import { useEffect } from "react";
import { WorkspaceGridBackground } from "@/components/agents/shared/layout/WorkspaceGridBackground";
import type { DemoView } from "./demo-data";
import { DEMO_ACTIVE_PROJECT } from "./demo-data";
import { DemoBacklogView } from "./DemoBacklogView";
import { DemoBoardView } from "./DemoBoardView";
import { DemoKlarkPanel } from "./DemoKlarkPanel";
import { DemoProjectsView } from "./DemoProjectsView";
import { DemoSidebar } from "./DemoSidebar";
import { DemoStackView } from "./DemoStackView";

interface DemoWorkspaceFrameProps {
  activeView: DemoView;
  klarkOpen: boolean;
  onNavigate: (view: DemoView) => void;
  onOpenKlark: () => void;
  onCloseKlark: () => void;
  onUserInteract: () => void;
}

const MOBILE_TABS: { view: DemoView; label: string }[] = [
  { view: "projects", label: "Proyectos" },
  { view: "backlog", label: "Backlog" },
  { view: "stack", label: "Stack" },
  { view: "board", label: "Tablero" },
];

export function DemoWorkspaceFrame({
  activeView,
  klarkOpen,
  onNavigate,
  onOpenKlark,
  onCloseKlark,
  onUserInteract,
}: DemoWorkspaceFrameProps) {
  const showKlark = activeView === "backlog" || activeView === "stack";

  useEffect(() => {
    if (!klarkOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onUserInteract();
        onCloseKlark();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [klarkOpen, onCloseKlark, onUserInteract]);

  return (
    <div
      className="agent-workspace relative h-[min(78vh,720px)] w-full overflow-hidden rounded-2xl border border-white/12 bg-background text-foreground shadow-[0_40px_120px_rgba(0,0,0,0.75)] lg:h-[min(82vh,780px)] lg:rounded-3xl"
      data-theme="klarify"
      data-klarify-accent="sky"
      onPointerDown={onUserInteract}
      onFocusCapture={onUserInteract}
    >
      <div className="flex h-full min-h-0">
        <DemoSidebar
          activeView={activeView}
          onNavigate={(view) => {
            onUserInteract();
            onNavigate(view);
          }}
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <WorkspaceGridBackground />

          <div className="relative z-10 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-extrabold tracking-tight text-foreground">
                  <span className="text-primary">K</span>larify
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
                  {activeView === "projects" ? "Tu workspace" : DEMO_ACTIVE_PROJECT.name}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-1 overflow-x-auto rounded-lg border border-border bg-background p-1">
              {MOBILE_TABS.map((tab) => {
                const isActive = activeView === tab.view;
                return (
                  <button
                    key={tab.view}
                    type="button"
                    onClick={() => {
                      onUserInteract();
                      onNavigate(tab.view);
                    }}
                    className={[
                      "shrink-0 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                      isActive
                        ? "bg-elevated text-foreground"
                        : "text-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {activeView === "projects" ? (
              <DemoProjectsView
                onOpenProject={() => {
                  onUserInteract();
                  onNavigate("backlog");
                }}
              />
            ) : null}
            {activeView === "backlog" ? <DemoBacklogView /> : null}
            {activeView === "stack" ? (
              <DemoStackView
                onAskKlark={() => {
                  onUserInteract();
                  onOpenKlark();
                }}
              />
            ) : null}
            {activeView === "board" ? <DemoBoardView /> : null}
          </main>

          {showKlark ? (
            <DemoKlarkPanel
              open={klarkOpen}
              onOpen={() => {
                onUserInteract();
                onOpenKlark();
              }}
              onClose={() => {
                onUserInteract();
                onCloseKlark();
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
