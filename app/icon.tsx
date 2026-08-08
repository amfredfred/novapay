import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: '#5048e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <path d="M9 8H13L23 24H19L9 8Z" fill="white" />
          <rect x="9" y="8" width="4" height="16" rx="1.3" fill="white" />
          <rect x="19" y="8" width="4" height="16" rx="1.3" fill="white" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
