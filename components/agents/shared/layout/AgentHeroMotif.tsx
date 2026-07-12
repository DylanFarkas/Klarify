export type AgentHeroVariant = 'capture' | 'structure' | 'measure' | 'order' | 'overview';

const CAPTURE_BARS = [0.42, 0.68, 0.88, 0.72, 1, 0.58, 0.82, 0.48, 0.76] as const;
const MEASURE_BLOCKS = [
  { label: '1', height: 14 },
  { label: '2', height: 24 },
  { label: '3', height: 34 },
  { label: '5', height: 52 },
] as const;
const ORDER_LANES = [1, 0.78, 0.56, 0.38] as const;
const OVERVIEW_SPARK = [
  { x: 10, y: 34 },
  { x: 18, y: 28 },
  { x: 26, y: 30 },
  { x: 34, y: 18 },
  { x: 42, y: 22 },
] as const;

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
      {variant === 'overview' && <OverviewMotif />}
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

function OverviewMotif() {
  const sparkPath = OVERVIEW_SPARK.map((point, index) =>
    `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`
  ).join(' ');

  return (
    <svg
      className="agent-hero__motif-svg"
      viewBox="0 0 96 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Panel principal con sparkline */}
      <g className="agent-hero__overview-panel" style={{ animationDelay: '0ms' }}>
        <rect
          x="2"
          y="4"
          width="52"
          height="40"
          rx="8"
          fill="color-mix(in srgb, var(--primary) 8%, transparent)"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeOpacity="0.55"
        />
        <path
          className="agent-hero__overview-spark"
          d={sparkPath}
          stroke="var(--primary)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />
        <circle
          cx={OVERVIEW_SPARK[OVERVIEW_SPARK.length - 1].x}
          cy={OVERVIEW_SPARK[OVERVIEW_SPARK.length - 1].y}
          r="2.25"
          fill="var(--primary)"
          fillOpacity="0.9"
        />
        <line
          x1="10"
          y1="14"
          x2="28"
          y2="14"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.35"
        />
      </g>

      {/* KPI superior derecho */}
      <g className="agent-hero__overview-panel" style={{ animationDelay: '120ms' }}>
        <rect
          x="60"
          y="4"
          width="34"
          height="18"
          rx="6"
          fill="var(--primary)"
          fillOpacity="0.16"
          stroke="var(--primary)"
          strokeWidth="1.25"
          strokeOpacity="0.45"
        />
        <circle cx="70" cy="13" r="3" fill="var(--primary)" fillOpacity="0.7" />
        <line
          x1="78"
          y1="11"
          x2="88"
          y2="11"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />
        <line
          x1="78"
          y1="16"
          x2="84"
          y2="16"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />
      </g>

      {/* Mini barras inferior derecho */}
      <g className="agent-hero__overview-panel" style={{ animationDelay: '240ms' }}>
        <rect
          x="60"
          y="26"
          width="34"
          height="18"
          rx="6"
          fill="color-mix(in srgb, var(--primary) 6%, transparent)"
          stroke="var(--primary)"
          strokeWidth="1.25"
          strokeOpacity="0.4"
        />
        {[0.45, 0.7, 1, 0.55].map((scale, index) => {
          const barHeight = 8 * scale;
          const x = 66 + index * 6;
          return (
            <rect
              key={index}
              className="agent-hero__overview-bar"
              style={{ animationDelay: `${index * 140}ms` }}
              x={x}
              y={38 - barHeight}
              width="3.5"
              height={barHeight}
              rx="1.5"
              fill="var(--primary)"
              fillOpacity={0.35 + index * 0.12}
            />
          );
        })}
      </g>

      {/* Fila de métricas inferiores */}
      {[0, 1, 2].map((index) => (
        <g
          key={index}
          className="agent-hero__overview-metric"
          style={{ animationDelay: `${180 + index * 100}ms` }}
        >
          <rect
            x={2 + index * 32}
            y="50"
            width="28"
            height="18"
            rx="5"
            fill="var(--primary)"
            fillOpacity={0.1 + index * 0.06}
            stroke="var(--primary)"
            strokeWidth="1.1"
            strokeOpacity={0.3 + index * 0.1}
          />
          <line
            x1={8 + index * 32}
            y1="57"
            x2={18 + index * 32}
            y2="57"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity={0.55 - index * 0.08}
          />
          <line
            x1={8 + index * 32}
            y1="62"
            x2={22 + index * 32}
            y2="62"
            stroke="var(--primary)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeOpacity="0.25"
          />
        </g>
      ))}
    </svg>
  );
}
