"use client";

import { ReactNode } from "react";

interface ManualCalloutProps {
  title?: string;
  children: ReactNode;
  tone?: "info" | "warning";
}

export function ManualCallout({
  title,
  children,
  tone = "info",
}: ManualCalloutProps) {
  const styles =
    tone === "warning"
      ? "border-[#191c1d]/12 bg-[#f8f8f9]"
      : "border-[#005bbf]/15 bg-[#edf4ff]/50";

  return (
    <div className={`rounded-2xl border px-5 py-4 md:px-6 md:py-5 ${styles}`}>
      {title ? (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#005bbf]">
          {title}
        </p>
      ) : null}
      <div className="text-[15px] leading-7 text-[#414754]">{children}</div>
    </div>
  );
}
