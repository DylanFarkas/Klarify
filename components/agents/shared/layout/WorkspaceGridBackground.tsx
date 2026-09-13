import { WorkspaceShootingStars } from "./WorkspaceShootingStars";

/**
 * Capa decorativa de fondo para el workspace de agentes.
 * Grid atenuado (sin estrellas/parallax) para reducir ruido en vistas de trabajo.
 */
export function WorkspaceGridBackground() {
  return (
    <div
      className="workspace-grid pointer-events-none absolute inset-0 overflow-hidden opacity-40"
      aria-hidden="true"
    >
      <div className="workspace-grid__lines workspace-grid__lines--deep" />
      <div className="workspace-grid__dots" />
      <WorkspaceShootingStars />
    </div>
  );
}
