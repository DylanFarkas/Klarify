export type AgentHeroVariant = 'capture' | 'structure' | 'measure' | 'order';

const CAPTURE_BARS = [0.42, 0.68, 0.88, 0.72, 1, 0.58, 0.82, 0.48, 0.76] as const;
const MEASURE_BLOCKS = [
  { label: '1', height: 14 },
  { label: '2', height: 24 },
  { label: '3', height: 34 },
  { label: '5', height: 52 },
] as const;
const ORDER_LANES = [1, 0.78, 0.56, 0.38] as const;

interface AgentHeroMotifProps {
  variant: AgentHeroVariant;
}

export function AgentHeroMotif({ variant }: AgentHeroMotifProps) {
  return (
    <div className={`agent-hero__motif agent-hero__motif--${variant}`} aria-hidden="true">
      <div className="agent-hero__motif-glow" />
      {variant === 'capture' && <CaptureMotif />}
      {variant === 'structure' && <StructureMotif />}
      {variant === 'measure' && <MeasureMotif />}
      {variant === 'order' && <OrderMotif />}
    </div>
  );
}

function CaptureMotif() {
  const barWidth = 5;
  const gap = 4;
  const height = 64;

  return (
    <svg
      className="agent-hero__motif-svg"
      viewBox={`0 0 ${CAPTURE_BARS.length * barWidth + (CAPTURE_BARS.length - 1) * gap} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hero-capture-gradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
        </linearGradient>
      </defs>
      {CAPTURE_BARS.map((scale, index) => {
        const barHeight = Math.round(height * scale);
        const x = index * (barWidth + gap);
        const y = height - barHeight;

        return (
          <rect
            key={index}
            className="agent-hero__capture-bar"
            style={{ animationDelay: `${index * 90}ms` }}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={2.5}
            fill="url(#hero-capture-gradient)"
          />
        );
      })}
      <path
        className="agent-hero__capture-scan"
        d={`M0 ${height * 0.5} L${CAPTURE_BARS.length * (barWidth + gap) - gap} ${height * 0.5}`}
        stroke="var(--primary)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="3 7"
        opacity="0.35"
      />
    </svg>
  );
}

function StructureMotif() {
  return (
    <svg
      className="agent-hero__motif-svg agent-hero__structure-svg"
      viewBox="0 0 96 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        className="agent-hero__structure-card agent-hero__structure-card--back"
        x="18"
        y="16"
        width="64"
        height="44"
        rx="10"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeOpacity="0.22"
      />
      <rect
        className="agent-hero__structure-card agent-hero__structure-card--mid"
        x="10"
        y="10"
        width="64"
        height="44"
        rx="10"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeOpacity="0.38"
      />
      <rect
        className="agent-hero__structure-card agent-hero__structure-card--front"
        x="2"
        y="4"
        width="64"
        height="44"
        rx="10"
        fill="color-mix(in srgb, var(--primary) 8%, transparent)"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeOpacity="0.65"
      />
      {[14, 24, 34].map((y, index) => (
        <line
          key={y}
          className="agent-hero__structure-line"
          style={{ animationDelay: `${index * 400}ms` }}
          x1="14"
          y1={y}
          x2={y === 34 ? 44 : 54}
          y2={y}
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity={y === 14 ? 0.7 : y === 24 ? 0.45 : 0.28}
        />
      ))}
      <circle cx="74" cy="14" r="3" fill="var(--primary)" fillOpacity="0.5" />
      <circle cx="82" cy="22" r="2" fill="var(--primary)" fillOpacity="0.28" />
    </svg>
  );
}

function MeasureMotif() {
  const blockWidth = 14;
  const gap = 6;
  const maxHeight = 52;
  const totalWidth = MEASURE_BLOCKS.length * blockWidth + (MEASURE_BLOCKS.length - 1) * gap;

  return (
    <svg
      className="agent-hero__motif-svg"
      viewBox={`0 0 ${totalWidth} ${maxHeight + 18}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {MEASURE_BLOCKS.map((block, index) => {
        const x = index * (blockWidth + gap);
        const y = 14 + (maxHeight - block.height);

        return (
          <g key={block.label}>
            <text
              x={x + blockWidth / 2}
              y="9"
              textAnchor="middle"
              className="agent-hero__measure-label"
            >
              {block.label}
            </text>
            <rect
              className="agent-hero__measure-block"
              style={{ animationDelay: `${index * 120}ms` }}
              x={x}
              y={y}
              width={blockWidth}
              height={block.height}
              rx="4"
              fill="var(--primary)"
              fillOpacity={0.22 + index * 0.14}
            />
            <rect
              x={x}
              y={y}
              width={blockWidth}
              height={block.height}
              rx="4"
              stroke="var(--primary)"
              strokeOpacity={0.35 + index * 0.12}
              strokeWidth="1"
            />
          </g>
        );
      })}
      <path
        d={`M0 ${maxHeight + 14} L${totalWidth} ${maxHeight + 14}`}
        stroke="var(--primary)"
        strokeOpacity="0.2"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OrderMotif() {
  const laneHeight = 7;
  const gap = 9;
  const width = 80;

  return (
    <svg
      className="agent-hero__motif-svg"
      viewBox={`0 0 ${width} ${ORDER_LANES.length * laneHeight + (ORDER_LANES.length - 1) * gap}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {ORDER_LANES.map((scale, index) => {
        const laneWidth = width * scale;
        const y = index * (laneHeight + gap);
        const opacity = 0.85 - index * 0.16;

        return (
          <g key={index} className="agent-hero__order-lane" style={{ animationDelay: `${index * 100}ms` }}>
            <circle cx="4" cy={y + laneHeight / 2} r="2.5" fill="var(--primary)" fillOpacity={opacity} />
            <rect
              x="12"
              y={y}
              width={laneWidth - 12}
              height={laneHeight}
              rx="3.5"
              fill="var(--primary)"
              fillOpacity={0.18 + (ORDER_LANES.length - index) * 0.08}
            />
            <rect
              x="12"
              y={y}
              width={laneWidth - 12}
              height={laneHeight}
              rx="3.5"
              stroke="var(--primary)"
              strokeOpacity={opacity * 0.55}
              strokeWidth="1"
            />
            {index === 0 && (
              <rect
                className="agent-hero__order-highlight"
                x="12"
                y={y}
                width={(laneWidth - 12) * 0.35}
                height={laneHeight}
                rx="3.5"
                fill="var(--primary)"
                fillOpacity="0.45"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
