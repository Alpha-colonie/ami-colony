'use client'

import type { Event, WeatherLog } from '@/lib/types'

const WEATHER_ICONS: Record<string, string> = {
  canicule:    '🔥', tempete: '⛈️', pluie_forte: '🌧️',
  neige:       '❄️', vent_fort: '💨', brouillard: '🌫️',
  froid:       '🥶', pluie_legere: '🌦️', abondance: '🌈',
  beau_temps:  '☀️', nuageux: '☁️', default: '🌤️',
}

const IMPACT_LABEL: Record<string, { label: string; cls: string }> = {
  canicule:    { label: 'HOSTILE',  cls: 'hostile' },
  tempete:     { label: 'HOSTILE',  cls: 'hostile' },
  pluie_forte: { label: 'HOSTILE',  cls: 'hostile' },
  neige:       { label: 'HOSTILE',  cls: 'hostile' },
  vent_fort:   { label: 'NEUTRE',   cls: 'neutre' },
  brouillard:  { label: 'NEUTRE',   cls: 'neutre' },
  froid:       { label: 'HOSTILE',  cls: 'hostile' },
  pluie_legere:{ label: 'NEUTRE',   cls: 'neutre' },
  abondance:   { label: 'BON',      cls: 'bon' },
  beau_temps:  { label: 'BON',      cls: 'bon' },
  nuageux:     { label: 'NEUTRE',   cls: 'neutre' },
}

const IMPACT_STYLES: Record<string, React.CSSProperties> = {
  bon:    { background: 'rgba(48,209,88,0.15)',  color: 'var(--ok)' },
  neutre: { background: 'rgba(200,208,224,0.08)', color: 'var(--text-dim)' },
  hostile:{ background: 'rgba(255,59,59,0.15)',  color: 'var(--danger)' },
}

interface Props {
  event:   Event | null
  weather: WeatherLog | null
}

export default function WeatherBlock({ event, weather }: Props) {
  const type        = event?.type || 'nuageux'
  const icon        = WEATHER_ICONS[type] || WEATHER_ICONS.default
  const impact      = IMPACT_LABEL[type] || { label: 'NEUTRE', cls: 'neutre' }
  const impactStyle = IMPACT_STYLES[impact.cls]
  const city        = weather?.cities?.nom || event?.description?.split(' ')[0] || 'Inconnue'
  const temp        = weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : ''
  const condition   = event?.description || '—'

  return (
    <div style={{
      padding: '1.2rem 1.5rem',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <div style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: '0.85rem',
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {city}{temp ? ` — ${temp}` : ''}
        </div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.05em', marginTop: '0.2rem' }}>
          {condition}
        </div>
      </div>
      <div style={{
        fontSize: '0.55rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '2px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        flexShrink: 0,
        ...impactStyle,
      }}>
        {impact.label}
      </div>
    </div>
  )
}
