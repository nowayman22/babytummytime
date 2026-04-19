import { useEffect, useState } from 'react';

const IDLE_FRAMES = [
  `
   .------.
  ( -.--.- )  z
   '------'
  /|  ___  |\\
 / | |   | | \\
/__|_|___|_|__\\
  [___________]
`,
  `
   .------.
  ( -.--.- )
   '------'  Z
  /|  ___  |\\
 / | |   | | \\
/__|_|___|_|__\\
  [___________]
`,
  `
   .------.
  ( -.-.- )   z
   '------'
  /|  ___  |\\
 / | |   | | \\
/__|_|___|_|__\\
  [___________]
`,
  `
   .------.
  ( -.--.- ) Zzz
   '------'
  /|  ___  |\\
 / | |   | | \\
/__|_|___|_|__\\
  [___________]
`,
];

const ACTIVE_FRAMES = [
  `
    .------.
   ( ^o^ ) !
    '------'
   /|  ___  |\\
  / | |   | | \\
 /__|_|___|_|__\\
   [___________]
`,
  `
   .------.
  ( ^-^ )  !
   '------'
  /|  ___  |\\
 / | |   | | \\
/__|_|___|_|__\\
  [___________]
`,
  `
     .------.
    ( ^O^ ) !!
     '------'
    /|  ___  |\\
   / | |   | | \\
  /__|_|___|_|__\\
    [___________]
`,
  `
   .------.
  ( ^w^ )  ~
   '------'
  /|  ___  |\\
 / | |   | | \\
/__|_|___|_|__\\
  [___________]
`,
  `
    .------.
   ( *o* )  ♪
    '------'
   /|  ___  |\\
  / | |   | | \\
 /__|_|___|_|__\\
   [___________]
`,
  `
   .------.
  ( ^-^ ) !!
   '------'
  /|  ___  |\\
 / | |   | | \\
/__|_|___|_|__\\
  [___________]
`,
];

interface Props {
  isRunning: boolean;
}

export default function AsciiAnimation({ isRunning }: Props) {
  const [frame, setFrame] = useState(0);
  const frames = isRunning ? ACTIVE_FRAMES : IDLE_FRAMES;
  const interval = isRunning ? 500 : 900;

  useEffect(() => {
    setFrame(0);
  }, [isRunning]);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, interval);
    return () => clearInterval(id);
  }, [frames.length, interval]);

  return (
    <pre
      className="text-center leading-tight select-none"
      style={{
        color: isRunning ? '#00ff88' : '#556655',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        transition: 'color 0.4s',
        textShadow: isRunning ? '0 0 8px #00ff8855' : 'none',
      }}
    >
      {frames[frame]}
    </pre>
  );
}
