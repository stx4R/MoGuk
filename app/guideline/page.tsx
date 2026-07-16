'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const SKIP_SECONDS = 5;
const DOUBLE_CLICK_DELAY = 250;

export default function GuidelinePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [skipHint, setSkipHint] = useState<'back' | 'forward' | null>(null);

  useEffect(() => () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const skip = (direction: 'back' | 'forward') => {
    const v = videoRef.current;
    if (!v) return;
    const delta = direction === 'back' ? -SKIP_SECONDS : SKIP_SECONDS;
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), v.duration || 0);
    setCurrentTime(v.currentTime);
    setSkipHint(direction);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setSkipHint(null), 500);
  };

  const onVideoClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => togglePlay(), DOUBLE_CLICK_DELAY);
  };

  const onVideoDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = e.clientX - rect.left < rect.width / 2;
    skip(isLeft ? 'back' : 'forward');
  };

  const seekTo = (clientX: number) => {
    const bar = barRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    v.currentTime = ratio * duration;
    setCurrentTime(v.currentTime);
  };

  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  };

  const onBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) seekTo(e.clientX);
  };

  const onBarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-[960px] mx-auto px-6 py-14 md:py-20">
      <div className="relative rounded-xl overflow-hidden bg-black border border-[var(--hairline)] select-none">
        <div onClick={onVideoClick} onDoubleClick={onVideoDoubleClick}>
          <video
            ref={videoRef}
            src="/MoGuk Guideline.mp4"
            className="w-full block"
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        </div>

        {skipHint && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${
              skipHint === 'back' ? 'left-[12%]' : 'right-[12%]'
            }`}
          >
            <span className="px-3.5 py-2 rounded-full bg-black/70 text-white text-[14px] font-bold">
              {skipHint === 'back' ? `−${SKIP_SECONDS}초` : `+${SKIP_SECONDS}초`}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/80 to-transparent">
          <div
            ref={barRef}
            className="group relative h-6 flex items-center cursor-pointer touch-none"
            onPointerDown={onBarPointerDown}
            onPointerMove={onBarPointerMove}
            onPointerUp={onBarPointerUp}
          >
            <div className="relative w-full h-[4px] rounded-full bg-white/25 group-hover:h-[6px] transition-all">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-green"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-green opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progress}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? '일시정지' : '재생'}
            className="mt-1 w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  );
}
