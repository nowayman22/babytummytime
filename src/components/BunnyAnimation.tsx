import { useEffect, useState } from 'react';

const FLOWERS = ['🌸', '🌼', '🌷', '🌻', '🌺'];
const GRASS   = ['🌱', '🍀', '🌿'];
const BUNNIES = ['🐰', '🐇'];

interface Props {
  isRunning: boolean;
}

export default function BunnyAnimation({ isRunning }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), isRunning ? 350 : 700);
    return () => clearInterval(id);
  }, [isRunning]);

  const field = Array.from({ length: 9 }).map((_, i) => {
    const pool = (i + tick) % 3 === 0 ? FLOWERS : GRASS;
    return pool[(i * 7 + tick) % pool.length];
  });

  const bunnyCount = isRunning ? 3 : 2;
  const bunnies = Array.from({ length: bunnyCount }).map((_, i) => {
    const base = BUNNIES[i % BUNNIES.length];
    const hop = isRunning && (tick + i) % 2 === 0;
    const left = ((i * 29 + tick * (isRunning ? 9 : 3)) % 80) + 5;
    return { base, hop, left };
  });

  return (
    <div
      className="relative w-full max-w-md mx-auto select-none"
      style={{ height: '120px' }}
    >
      {/* sky gradient */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: isRunning
            ? 'linear-gradient(180deg, #0d1f14 0%, #112a1a 60%, #163823 100%)'
            : 'linear-gradient(180deg, #0a0a0a 0%, #0f1a12 70%, #152418 100%)',
          border: `1px solid ${isRunning ? '#00ff8844' : '#1a2e20'}`,
          boxShadow: isRunning ? '0 0 20px #00ff8822 inset' : 'none',
          transition: 'all 0.4s',
        }}
      />

      {/* little clouds / sparkles */}
      <div className="absolute top-2 left-4 text-sm opacity-60">
        {isRunning ? '☀️' : '🌙'}
      </div>
      <div className="absolute top-3 right-6 text-xs opacity-50">
        {isRunning ? '✨' : '·'}
      </div>

      {/* bunnies */}
      {bunnies.map((b, i) => (
        <div
          key={i}
          className="absolute text-2xl transition-all"
          style={{
            left: `${b.left}%`,
            bottom: b.hop ? '54px' : '38px',
            transition: 'bottom 0.25s ease-out, left 0.4s linear',
            filter: isRunning ? 'drop-shadow(0 0 4px #00ff8844)' : 'none',
          }}
        >
          {b.base}
        </div>
      ))}

      {/* flower field */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end px-2 pb-1">
        {field.map((f, i) => (
          <span
            key={i}
            className="text-lg"
            style={{
              transform: isRunning && (tick + i) % 2 === 0 ? 'translateY(-2px)' : 'none',
              transition: 'transform 0.3s',
              opacity: 0.95,
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
