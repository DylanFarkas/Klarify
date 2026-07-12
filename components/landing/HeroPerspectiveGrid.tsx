/**
 * Grid 3D en perspectiva para el hero (modo claro).
 * Sala wireframe de 1 punto de fuga, estilo Dovetail adaptado a fondo claro.
 */
export function HeroPerspectiveGrid() {
  const W = 1440;
  const H = 900;
  const cx = W / 2;
  const cy = H * 0.45;

  // Marcos concéntricos: del fondo (pequeño) al frente (grande)
  const depths = [0.18, 0.32, 0.48, 0.68, 0.92, 1.35];

  const frames = depths.map((t) => {
    const halfW = (W * 0.22 + W * 0.55 * t) / 2;
    const halfH = (H * 0.16 + H * 0.62 * t) / 2;
    return {
      l: cx - halfW,
      r: cx + halfW,
      t: cy - halfH,
      b: cy + halfH,
    };
  });

  // Subdivisiones entre cada par de frames (techo / suelo / laterales)
  const subdivLines: string[] = [];
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    const steps = 1;
    for (let s = 1; s <= steps; s++) {
      const u = s / (steps + 1);
      // techo
      const yTop = a.t + (b.t - a.t) * u;
      const xTopL = a.l + (b.l - a.l) * u;
      const xTopR = a.r + (b.r - a.r) * u;
      subdivLines.push(`M${xTopL} ${yTop} L${xTopR} ${yTop}`);
      // suelo
      const yBot = a.b + (b.b - a.b) * u;
      const xBotL = a.l + (b.l - a.l) * u;
      const xBotR = a.r + (b.r - a.r) * u;
      subdivLines.push(`M${xBotL} ${yBot} L${xBotR} ${yBot}`);
      // izquierda
      const xL = a.l + (b.l - a.l) * u;
      const yLT = a.t + (b.t - a.t) * u;
      const yLB = a.b + (b.b - a.b) * u;
      subdivLines.push(`M${xL} ${yLT} L${xL} ${yLB}`);
      // derecha
      const xR = a.r + (b.r - a.r) * u;
      const yRT = a.t + (b.t - a.t) * u;
      const yRB = a.b + (b.b - a.b) * u;
      subdivLines.push(`M${xR} ${yRT} L${xR} ${yRB}`);
    }
  }

  // Ortogonales desde el marco más lejano hacia fuera del viewport
  const far = frames[0];
  const near = frames[frames.length - 1];
  const rays = [
    `M${far.l} ${far.t} L${near.l} ${near.t}`,
    `M${far.r} ${far.t} L${near.r} ${near.t}`,
    `M${far.r} ${far.b} L${near.r} ${near.b}`,
    `M${far.l} ${far.b} L${near.l} ${near.b}`,
  ];

  // Rays intermedios en cada pared (hacia el punto de fuga, truncados en el far frame)
  const wallRays: string[] = [];
  const wallSteps = 2;
  for (let i = 1; i <= wallSteps; i++) {
    const u = i / (wallSteps + 1);
    // techo: líneas desde far top edge hacia near top edge
    const fx = far.l + (far.r - far.l) * u;
    const nx = near.l + (near.r - near.l) * u;
    wallRays.push(`M${fx} ${far.t} L${nx} ${near.t}`);
    // suelo
    wallRays.push(`M${fx} ${far.b} L${nx} ${near.b}`);
    // izquierda
    const fy = far.t + (far.b - far.t) * u;
    const ny = near.t + (near.b - near.t) * u;
    wallRays.push(`M${far.l} ${fy} L${near.l} ${ny}`);
    // derecha
    wallRays.push(`M${far.r} ${fy} L${near.r} ${ny}`);
  }

  return (
    <div className="hero-perspective-grid" aria-hidden="true">
      <svg
        className="hero-perspective-grid__wire"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Marcos */}
        {frames.map((f, i) => (
          <rect
            key={i}
            className="hero-perspective-grid__frame"
            x={f.l}
            y={f.t}
            width={f.r - f.l}
            height={f.b - f.t}
          />
        ))}

        {/* Subdivisiones en los cuatro planos */}
        <path className="hero-perspective-grid__subdiv" d={subdivLines.join(" ")} />

        {/* Ortogonales de esquinas */}
        <path className="hero-perspective-grid__ray" d={rays.join(" ")} />

        {/* Ortogonales intermedias */}
        <path className="hero-perspective-grid__ray hero-perspective-grid__ray--soft" d={wallRays.join(" ")} />

        {/* Marcadores izquierda */}
        <g className="hero-perspective-grid__marker">
          <rect x="130" y="200" width="10" height="10" />
          <path d="M178 255h14M185 248v14" />
          <rect x="108" y="310" width="8" height="8" />
          <path d="M220 350h12M226 344v12" />
          <rect x="158" y="420" width="9" height="9" />
          <path d="M88 470h11M93.5 464.5v11" />
          <rect x="235" y="510" width="8" height="8" />
        </g>



        <g className="hero-perspective-grid__nodes">
          <circle cx="290" cy="175" r="1.6" />
          <circle cx="350" cy="235" r="1.6" />
          <circle cx="1145" cy="185" r="1.6" />
          <circle cx="1085" cy="295" r="1.6" />
          <circle cx="310" cy="635" r="1.6" />
          <circle cx="1105" cy="695" r="1.6" />
        </g>
      </svg>

      <div className="hero-perspective-grid__fade" />
    </div>
  );
}