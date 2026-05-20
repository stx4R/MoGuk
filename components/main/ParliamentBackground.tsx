'use client';

// 국회 테마 인터랙티브 캔버스 배경 파티클 시스템 S
import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

type Shape = 'gavel' | 'star' | 'scroll' | 'pillar' | 'scale';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
  shape: Shape;
  color: string;
  baseVy: number;
};

const SHAPES: Shape[] = ['gavel', 'star', 'scroll', 'pillar', 'scale'];
const PARTICLE_COUNT = 28;
const MOUSE_RADIUS = 120;
const MOUSE_STRENGTH = 1.8;

function drawGavel(ctx: CanvasRenderingContext2D, size: number) {
  const s = size * 0.5;
  // 손잡이
  ctx.fillRect(-s * 0.12, -s * 0.1, s * 0.22, s * 1.0);
  // 머리
  ctx.save();
  ctx.translate(-s * 0.5, -s * 0.35);
  ctx.rotate(-Math.PI / 5);
  ctx.beginPath();
  ctx.roundRect(-s * 0.15, -s * 0.28, s * 1.0, s * 0.52, s * 0.1);
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const outer = size * 0.5;
  const inner = outer * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawScroll(ctx: CanvasRenderingContext2D, size: number, color: string, opacity: number) {
  const w = size * 0.7;
  const h = size * 0.5;
  ctx.fillStyle = `${color}${opacity})`;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, size * 0.08);
  ctx.fill();
  // 줄 세 개
  ctx.fillStyle = `${color}${opacity * 0.35})`;
  const lineW = w * 0.6;
  const gap = h / 4;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-lineW / 2, -h / 2 + gap * (i + 0.8), lineW, size * 0.05);
  }
}

function drawPillar(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.22;
  const h = size * 0.9;
  // 기둥 몸체
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 2);
  ctx.fill();
  // 상단 캐피탈
  ctx.fillRect(-w, -h / 2, w * 2, size * 0.12);
  // 하단 베이스
  ctx.fillRect(-w * 0.9, h / 2 - size * 0.1, w * 1.8, size * 0.1);
}

function drawScale(ctx: CanvasRenderingContext2D, size: number) {
  const s = size * 0.5;
  // 중앙 기둥
  ctx.fillRect(-s * 0.06, -s * 0.9, s * 0.12, s * 1.8);
  // 가로대
  ctx.fillRect(-s * 0.8, -s * 0.85, s * 1.6, s * 0.1);
  // 왼쪽 접시
  ctx.beginPath();
  ctx.arc(-s * 0.75, -s * 0.5, s * 0.28, 0, Math.PI);
  ctx.fill();
  // 오른쪽 접시
  ctx.beginPath();
  ctx.arc(s * 0.75, -s * 0.3, s * 0.28, 0, Math.PI);
  ctx.fill();
  // 실 (왼쪽)
  ctx.fillRect(-s * 0.76, -s * 0.85, s * 0.04, s * 0.38);
  // 실 (오른쪽)
  ctx.fillRect(s * 0.72, -s * 0.85, s * 0.04, s * 0.58);
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, size: number, color: string, opacity: number) {
  switch (shape) {
    case 'gavel':  drawGavel(ctx, size);  break;
    case 'star':   drawStar(ctx, size);   break;
    case 'scroll': drawScroll(ctx, size, color, opacity); break;
    case 'pillar': drawPillar(ctx, size); break;
    case 'scale':  drawScale(ctx, size);  break;
  }
}

function randomParticle(width: number, height: number, isDark: boolean): Particle {
  const colors = isDark
    ? ['rgba(192,57,43,', 'rgba(241,196,15,']
    : ['rgba(192,57,43,', 'rgba(192,57,43,', 'rgba(241,196,15,'];
  const baseColor = colors[Math.floor(Math.random() * colors.length)];
  const opacity = isDark
    ? 0.06 + Math.random() * 0.12
    : 0.04 + Math.random() * 0.08;

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(0.15 + Math.random() * 0.35),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.015,
    size: 20 + Math.random() * 28,
    opacity,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: baseColor,
    baseVy: -(0.15 + Math.random() * 0.35),
  };
}

export default function ParliamentBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = theme === 'dark';

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      randomParticle(canvas.width, canvas.height, isDark)
    );

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        // 마우스 반발력 S
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 1) {
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * MOUSE_STRENGTH;
          p.vx += (dx / dist) * force * 0.04;
          p.vy += (dy / dist) * force * 0.04;
        }

        // 속도 감쇄 + 기본 상승
        p.vx *= 0.97;
        p.vy = p.vy * 0.97 + p.baseVy * 0.03;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // 경계 루프
        if (p.y < -60) { p.y = canvas.height + 60; p.x = Math.random() * canvas.width; }
        if (p.x < -60) p.x = canvas.width + 60;
        if (p.x > canvas.width + 60) p.x = -60;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        drawShape(ctx, p.shape, p.size, p.color, p.opacity);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      aria-hidden="true"
    />
  );
}
