"use client";

interface ManualStepProps {
  stepNumber: number;
  title: string;
  description: string;
  tips?: string[];
  isLast?: boolean;
}

export function ManualStep({
  stepNumber,
  title,
  description,
  tips,
  isLast = false,
}: ManualStepProps) {
  return (
    <div className="group relative flex gap-4 md:gap-5">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#005bbf]/20 bg-[#edf4ff] text-xs font-bold text-[#005bbf] transition-colors duration-300 group-hover:border-[#005bbf] group-hover:bg-[#005bbf] group-hover:text-white">
          {stepNumber}
        </div>
        {!isLast ? (
          <div className="mt-2 w-px flex-1 bg-linear-to-b from-[#005bbf]/25 via-[#dfe3ec] to-transparent" />
        ) : null}
      </div>

      <div className={isLast ? "pb-0 pt-1" : "pb-9 pt-1 md:pb-10"}>
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#191c1d]">
          {title}
        </h3>
        <p className="mt-2 text-[15px] leading-7 text-[#414754]">{description}</p>

        {tips && tips.length > 0 ? (
          <aside className="mt-4 border-l-2 border-[#005bbf] bg-[#edf4ff]/60 py-3 pl-4 pr-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#005bbf]">
              Consejo
            </p>
            <ul className="mt-2 space-y-2">
              {tips.map((tip) => (
                <li key={tip} className="text-sm leading-6 text-[#414754]">
                  {tip}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
