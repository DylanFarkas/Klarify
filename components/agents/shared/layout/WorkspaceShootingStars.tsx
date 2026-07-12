'use client';

import { useEffect, useState, type CSSProperties } from 'react';

const STAR_COUNT = 5;

type ShootingStar = {
  id: number;
  generation: number;
  top: string;
  left: string;
  length: string;
  thickness: string;
  head: string;
  duration: string;
  delay: string;
  angle: string;
  travel: string;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createStar(id: number, generation = 0): ShootingStar {
  const thickness = randomBetween(1, 1.85);
  const isRespawn = generation > 0;

  return {
    id,
    generation,
    top: `${randomBetween(6, 68).toFixed(2)}%`,
    left: `${randomBetween(-8, 72).toFixed(2)}%`,
    length: `${randomBetween(48, 110).toFixed(1)}px`,
    thickness: `${thickness.toFixed(2)}px`,
    head: `${randomBetween(2, 3.5).toFixed(2)}px`,
    duration: `${randomBetween(1.1, 2.2).toFixed(2)}s`,
    delay: `${(isRespawn ? randomBetween(1.2, 5.5) : randomBetween(0.2, 4.8)).toFixed(2)}s`,
    angle: `${randomBetween(-48, -26).toFixed(1)}deg`,
    travel: `${randomBetween(34, 64).toFixed(1)}vw`,
  };
}

function createStars() {
  return Array.from({ length: STAR_COUNT }, (_, id) => createStar(id));
}

/** Estrellas fugaces aleatorias del fondo del workspace. */
export function WorkspaceShootingStars() {
  const [stars, setStars] = useState<ShootingStar[]>([]);

  useEffect(() => {
    setStars(createStars());
  }, []);

  const respawnStar = (id: number) => {
    setStars((prev) =>
      prev.map((star) => (star.id === id ? createStar(id, star.generation + 1) : star))
    );
  };

  return (
    <div className="workspace-grid__stars">
      {stars.map((star) => {
        const style = {
          '--star-top': star.top,
          '--star-left': star.left,
          '--star-length': star.length,
          '--star-thickness': star.thickness,
          '--star-head': star.head,
          '--star-duration': star.duration,
          '--star-delay': star.delay,
          '--star-angle': star.angle,
          '--star-travel': star.travel,
        } as CSSProperties;

        return (
          <span
            key={`${star.id}-${star.generation}`}
            className="workspace-grid__star"
            style={style}
            onAnimationEnd={() => respawnStar(star.id)}
          />
        );
      })}
    </div>
  );
}
