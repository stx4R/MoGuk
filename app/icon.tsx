import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#c0392b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>⚖</span>
    </div>,
    { ...size }
  );
}
