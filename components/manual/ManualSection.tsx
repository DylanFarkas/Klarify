"use client";

import { ReactNode } from "react";

interface ManualSectionProps {
  id: string;
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}

export function ManualSection({
  id,
  number,
  title,
  description,
  children,
}: ManualSectionProps) {
  const padded = String(number).padStart(2, "0");

  return (
    <article id={id} className="scroll-mt-28">
      <header className="border-b border-[#191c1d]/10 pb-8">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-[#005bbf]">
          Paso {padded}
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#191c1d] md:text-4xl md:leading-[1.1]">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#5d616b] md:text-base md:leading-8">
          {description}
        </p>
      </header>

      <div className="pt-8 md:pt-10">{children}</div>
    </article>
  );
}
