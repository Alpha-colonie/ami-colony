'use client'

import { useEffect, useRef } from 'react'
import type { Agent, Zone } from '@/lib/types'

const COLORS: Record<string, string> = {
  reine:      '#f5c842',
  tisseuse:   '#5bcefa',
  batisseuse: '#ff6b4a',
  gardienne:  '#a78bfa',
  default:    '#4ade80',
}

const ZONE_LAYOUT = [
  { id: 1, nom: 'Centre',       x: 0.5,  y: 0.5,  type: 'nid',            danger: 5  },
  { id: 2, nom: 'Nord',         x: 0.5,  y: 0.12, type: 'ressources',     danger: 10 },
  { id: 3, nom: 'Est',          x: 0.85, y: 0.5,  type: 'inconnue',       danger: 20 },
  { id: 4, nom: 'Sud',          x: 0.5,  y: 0.88, type: 'dangereuse',     danger: 60 },
  { id: 5, nom: 'Ouest',        x: 0.15, y: 0.5,  type: 'eau',            danger: 10 },
  { id: 6, nom: 'Frontière N.', x: 0.2,  y: 0.12, type: 'frontiere_nord', danger: 40 },
  { id: 7, nom: 'Frontière S.', x: 0.8,  y: 0.88, type: 'frontiere_sud',  danger: 40 },
]

const CONNECTIONS = [
  [1,2],[1,3],[1,4],[1,5],[2,6],[4,7],[2,3],[3,4],[4,5],[5,2]
]

const ZONE_COLORS: Record<string, string> = {
  nid:            'rgba(245,200,66,0.08)',
  ressources:     'rgba(48,209,88,0.06)',
  inconnue:       'rgba(200,208,224,0.04)',
  dangereuse:     'rgba(255,59,59,0.08)',
  eau:            'rgba(91,206,250,0.06)',
  frontiere_nord: 'rgba(200,208,224,0.03)',
  frontiere_sud:  'rgba(200,208,224,0.03)',
}

interface AgentState {
  id: string
  type: string
  zone_id: number
  vitalite: number
  age: number
  x: number; y: number
  tx: number; ty: number
}

interface Props {
  agents: Agent[]
}

export default function WorldCanvas({ agents: propAgents }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const agentsRef = useRef<AgentState[]>([])
  const tRef      = useRef(0)
  const rafRef    = useRef<number>(0)

  // Sync agents from props → internal state
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.parentElement!.getBoundingClientRect()
    const w = rect.width, h = rect.height
    const pad = 80

    const getPos = (zoneId: number) => {
      const z = ZONE_LAYOUT.find(z => z.id === zoneId) || ZONE_LAYOUT[0]
      return {
        x: pad + z.x * (w - pad * 2),
        y: pad + z.y * (h - pad * 2),
      }
    }

    agentsRef.current = propAgents
      .filter(a => a.vivant)
      .map(a => {
        const existing = agentsRef.current.find(e => e.id === a.id)
        const pos = getPos(a.zone_id)
        const jitter = () => (Math.random() - 0.5) * 40
        return existing ?? {
          id:       a.id,
          type:     a.type,
          zone_id:  a.zone_id,
          vitalite: a.vitalite,
          age:      0,
          x:        pos.x + jitter(),
          y:        pos.y + jitter(),
          tx:       pos.x + jitter(),
          ty:       pos.y + jitter(),
        }
      })
  }, [propAgents])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width  = rect.width  * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      canvas.style.width  = rect.width  + 'px'
      canvas.style.height = rect.height + 'px'
    }

    const getSize = () => ({
      w: canvas.width  / window.devicePixelRatio,
      h: canvas.height / window.devicePixelRatio,
    })

    const zonePos = (zoneId: number) => {
      const { w, h } = getSize()
      const pad = 80
      const z = ZONE_LAYOUT.find(z => z.id === zoneId) || ZONE_LAYOUT[0]
      return { x: pad + z.x * (w - pad * 2), y: pad + z.y * (h - pad * 2) }
    }

    const agentRadius = (age: number) => Math.min(18, 5 + Math.sqrt(age) * 0.8)

    const draw = () => {
      const { w, h } = getSize()
      tRef.current += 0.008
      const t = tRef.current

      ctx.clearRect(0, 0, w, h)

      // Background gradient
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7)
      grad.addColorStop(0, 'rgba(20,28,45,0.4)')
      grad.addColorStop(1, 'rgba(8,10,15,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Connections
      CONNECTIONS.forEach(([a, b]) => {
        const pa = zonePos(a), pb = zonePos(b)
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // Pheromone dots on connections
      CONNECTIONS.forEach(([a, b], i) => {
        const pa   = zonePos(a), pb = zonePos(b)
        const prog = ((t * 0.3 + i * 0.7) % 1)
        const px   = pa.x + (pb.x - pa.x) * prog
        const py   = pa.y + (pb.y - pa.y) * prog
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fill()
      })

      // Zones
      ZONE_LAYOUT.forEach(zone => {
        const pos   = zonePos(zone.id)
        const pulse = 1 + Math.sin(t * 1.5 + zone.id) * 0.03
        const zr    = 40 * 0.38 * pulse

        if (zone.danger > 30) {
          const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, zr * 4)
          halo.addColorStop(0, `rgba(255,59,59,${zone.danger * 0.001})`)
          halo.addColorStop(1, 'transparent')
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, zr * 4, 0, Math.PI * 2)
          ctx.fillStyle = halo
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, zr, 0, Math.PI * 2)
        ctx.fillStyle   = ZONE_COLORS[zone.type] || 'rgba(200,208,224,0.04)'
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.lineWidth   = 1
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = 'rgba(200,208,224,0.25)'
        ctx.font      = `9px Space Mono`
        ctx.textAlign = 'center'
        ctx.fillText(zone.nom.toUpperCase(), pos.x, pos.y + zr + 14)
      })

      // Agents
      agentsRef.current.forEach(agent => {
        agent.x += (agent.tx - agent.x) * 0.02
        agent.y += (agent.ty - agent.y) * 0.02
        agent.x += Math.sin(t * 0.7 + agent.id.charCodeAt(0)) * 0.3
        agent.y += Math.cos(t * 0.5 + agent.id.charCodeAt(0)) * 0.3
        agent.age += 0.1

        const r     = agentRadius(agent.age)
        const color = COLORS[agent.type] || COLORS.default
        const alpha = agent.vitalite / 100

        // Halo
        const rgb = color.slice(1).match(/.{2}/g)!.map(h => parseInt(h, 16))
        const halo = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, r * 2.5)
        halo.addColorStop(0, `rgba(${rgb.join(',')},${alpha * 0.3})`)
        halo.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, r * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = halo
        ctx.fill()

        // Dot
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, r, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()

        // Queen ring
        if (agent.type === 'reine') {
          ctx.beginPath()
          ctx.arc(agent.x, agent.y, r + 4 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(245,200,66,0.4)'
          ctx.lineWidth   = 1
          ctx.stroke()
        }

        // Low vitality blink
        if (agent.vitalite < 30) {
          const blinkAlpha = (Math.sin(t * 6) + 1) / 2 * 0.6
          ctx.beginPath()
          ctx.arc(agent.x, agent.y, r + 3, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,59,59,${blinkAlpha})`
          ctx.lineWidth   = 1.5
          ctx.stroke()
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    // Randomize agent targets every 4s
    const moveInterval = setInterval(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.parentElement!.getBoundingClientRect()
      const w = rect.width, h = rect.height
      const pad = 80

      agentsRef.current.forEach(agent => {
        if (Math.random() < 0.3) {
          const zones = ZONE_LAYOUT
          agent.zone_id = zones[Math.floor(Math.random() * zones.length)].id
        }
        const z = ZONE_LAYOUT.find(z => z.id === agent.zone_id) || ZONE_LAYOUT[0]
        const jitter = () => (Math.random() - 0.5) * 50
        agent.tx = pad + z.x * (w - pad * 2) + jitter()
        agent.ty = pad + z.y * (h - pad * 2) + jitter()
      })
    }, 4000)

    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(canvas.parentElement!)

    resize()
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(moveInterval)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
