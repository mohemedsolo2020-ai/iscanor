import { useEffect, useState } from "react";

interface Circle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  opacity: number;
}

export default function DecorativeCircles() {
  const [circles, setCircles] = useState<Circle[]>([]);

  useEffect(() => {
    const generateCircles = () => {
      const newCircles: Circle[] = [];
      const circleCount = 12;
      const positions: { x: number; y: number }[] = [];

      for (let i = 0; i < circleCount; i++) {
        let x: number = Math.random() * 100;
        let y: number = Math.random() * 100;
        let attempts = 0;
        
        while (
          attempts < 50 &&
          positions.some(pos => 
            Math.abs(pos.x - x) < 20 && Math.abs(pos.y - y) < 20
          )
        ) {
          x = Math.random() * 100;
          y = Math.random() * 100;
          attempts++;
        }
        
        positions.push({ x, y });
        
        newCircles.push({
          id: i,
          size: Math.random() * 250 + 150,
          x,
          y,
          duration: Math.random() * 10 + 8,
          delay: Math.random() * 4,
          opacity: Math.random() * 0.2 + 0.15,
        });
      }

      setCircles(newCircles);
    };

    generateCircles();
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {circles.map((circle) => (
        <div
          key={circle.id}
          className="absolute rounded-full bg-gradient-to-br from-primary/35 to-accent/25 blur-3xl animate-float-random"
          style={{
            width: `${circle.size}px`,
            height: `${circle.size}px`,
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            opacity: circle.opacity,
            animation: `floatRandom ${circle.duration}s ease-in-out ${circle.delay}s infinite alternate, fadeInOut ${circle.duration * 1.5}s ease-in-out ${circle.delay}s infinite`,
            transform: `translate(-50%, -50%)`,
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </div>
  );
}
