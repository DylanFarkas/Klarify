import { WorkspaceShootingStars } from './WorkspaceShootingStars';

/**
 * Capa decorativa de fondo para el workspace de agentes.
 * Grid en profundidad con viñeta, textura y estrellas fugaces.
 */
export function WorkspaceGridBackground() {
  return (
    <div className="workspace-grid pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="workspace-grid__lines workspace-grid__lines--deep" />
      <div className="workspace-grid__lines workspace-grid__lines--near" />
      <div className="workspace-grid__dots" />
      <WorkspaceShootingStars />
      <div className="" />
      {/* <div className="workspace-grid__noise" /> */}
    </div>
  );
}
