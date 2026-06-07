'use client'

import { useState, useEffect, useRef } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  className?: string
  style?: React.CSSProperties
}

export function TypewriterText({ text, speed = 18, className, style }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    setDisplayed('')
    indexRef.current = 0
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span className={className} style={style}>
      {displayed}
      {displayed.length < text.length && (
        <span style={{
          display: 'inline-block', width: '2px', height: '0.85em',
          background: 'currentColor', opacity: 0.6, marginLeft: '2px',
          verticalAlign: 'text-bottom', animation: 'twCursorBlink 0.7s step-end infinite',
        }} />
      )}
      <style>{`
        @keyframes twCursorBlink {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 0; }
        }
      `}</style>
    </span>
  )
}
