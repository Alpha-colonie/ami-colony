'use client'

import { useEffect, useRef } from 'react'
import type { Agent, Trace } from '@/lib/types'

const COLORS: Record<string, string> = {
  reine:      '#f5c842',
  tisseuse:   '#5bcefa',
  batisseuse: '#ff6b4a',
  gardienne:  '#a78bfa',
  default:    '#4ade80',
}

interface HexNode {
  id: number; x: number; y: number
  ring: number; type: string; nom: string
}
interface HexEdge { a: number; b: number }

function buildHexWeb(cx: number, cy: number, maxR: number): { nodes: HexNode[]; edges: HexEdge[] } {
  const nodes: HexNode[] = []
  const edges: HexEdge[] = []

  nodes.push({ id: 0, x: cx, y: cy, ring: 0, type: 'nid', nom: 'Nid' })

  const r1 = maxR * 0.28
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2 / 6) - Math.PI / 2
    nodes.push({ id: 1+i, x: cx + Math.cos(a)*r1, y: cy + Math.sin(a)*r1, ring: 1, type: 'ressources',
      nom: ['Nord','Nord-Est','Sud-Est','Sud','Sud-Ouest','Nord-Ouest'][i] })
  }

  const r2 = maxR * 0.56
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2 / 12) - Math.PI / 2
    nodes.push({ id: 7+i, x: cx + Math.cos(a)*r2, y: cy + Math.sin(a)*r2, ring: 2, type: 'exploration', nom: `Secteur ${i+1}` })
  }

  const r3 = maxR * 0.88
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2 / 6) - Math.PI / 2
    nodes.push({ id: 19+i, x: cx + Math.cos(a)*r3, y: cy + Math.sin(a)*r3, ring: 3, type: 'frontiere',
      nom: ['Frontière N','Frontière NE','Frontière SE','Frontière S','Frontière SO','Frontière NO'][i] })
  }

  for (let i = 0; i < 6; i++) edges.push({ a: 0, b: 1+i })
  for (let i = 0; i < 6; i++) edges.push({ a: 1+i, b: 1+((i+1)%6) })
  for (let i = 0; i < 6; i++) {
    edges.push({ a: 1+i, b: 7+(i*2) })
    edges.push({ a: 1+i, b: 7+((i*2+1)%12) })
  }
  for (let i = 0; i < 12; i++) edges.push({ a: 7+i, b: 7+((i+1)%12) })
  for (let i = 0; i < 6; i++) {
    edges.push({ a: 7+(i*2), b: 19+i })
    edges.push({ a: 7+((i*2+1)%12), b: 19+i })
  }
  for (let i = 0; i < 6; i++) edges.push({ a: 19+i, b: 19+((i+1)%6) })

  return { nodes, edges }
}

interface AgentState {
  id: string; type: string; identite: string
  vitalite: number; generation: number
  nodeId: number; x: number; y: number; tx: number; ty: number
}

interface Props {
  agents: Agent[]
  traces: Trace[]
  onHover: (agent: AgentState | null) => void
}

export default function HexAquarium({ agents: propAgents, traces, onHover }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const agentsRef  = useRef<AgentState[]>([])
  const tRef       = useRef(0)
  const rafRef     = useRef<number>(0)
  const webRef     = useRef<{ nodes: HexNode[]; edges: HexEdge[] } | null>(null)
  const onHoverRef = useRef(onHover)
  onHoverRef.current = onHover

  useEffect(() => {
    agentsRef.current = propAgents.filter(a => a.vivant).map(a => {
      const existing = agentsRef.current.find(e => e.id === a.id)
      if (existing) return { ...existing, vitalite: a.vitalite }
      const nodeId = Math.floor(Math.random() * 25)
      const web = webRef.current
      const pos = web ? web.nodes[nodeId] : { x: 0, y: 0 }
      return { id: a.id, type: a.type, identite: a.identite, vitalite: a.vitalite,
        generation: a.generation, nodeId, x: pos.x, y: pos.y, tx: pos.x, ty: pos.y }
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
      const w = rect.width, h = rect.height
      const maxR = Math.min(w, h) * 0.44
      webRef.current = buildHexWeb(w/2, h/2, maxR)
    }

    const getSize = () => ({
      w: canvas.width / window.devicePixelRatio,
      h: canvas.height / window.devicePixelRatio,
    })

    const nodeColors: Record<string, string> = {
      nid:        '#f5c842',
      ressources: 'rgba(48,209,88,0.7)',
      exploration:'rgba(91,206,250,0.5)',
      frontiere:  'rgba(255,100,60,0.4)',
    }

    const draw = () => {
      if (!webRef.current) { rafRef.current = requestAnimationFrame(draw); return }
      const { w, h } = getSize()
      const { nodes, edges } = webRef.current
      tRef.current += 0.006
      const t = tRef.current

      ctx.clearRect(0, 0, w, h)

      // Background
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.6)
      grad.addColorStop(0, 'rgba(15,20,35,0.5)')
      grad.addColorStop(1, 'rgba(4,6,10,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Edges
      edges.forEach(edge => {
        const na = nodes[edge.a], nb = nodes[edge.b]
        ctx.beginPath()
        ctx.moveTo(na.x, na.y)
        ctx.lineTo(nb.x, nb.y)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth   = 0.8
        ctx.stroke()
      })

      // Pheromone particles on edges
      edges.forEach((edge, i) => {
        const na = nodes[edge.a], nb = nodes[edge.b]
        const prog = ((t * 0.25 + i * 0.53) % 1)
        const px = na.x + (nb.x - na.x) * prog
        const py = na.y + (nb.y - na.y) * prog
        ctx.beginPath()
        ctx.arc(px, py, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fill()
      })

      // Nodes
      nodes.forEach(node => {
        const color = nodeColors[node.type] || 'rgba(200,208,224,0.3)'
        const pulse = 1 + Math.sin(t * 1.2 + node.id * 0.8) * 0.08
        const r     = node.ring === 0 ? 10 * pulse : node.ring === 1 ? 6 * pulse : node.ring === 2 ? 4 : 5

        if (node.ring === 0) {
          const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 30)
          glow.addColorStop(0, 'rgba(245,200,66,0.15)')
          glow.addColorStop(1, 'transparent')
          ctx.beginPath()
          ctx.arc(node.x, node.y, 30, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })

      // Agents
      agentsRef.current.forEach(agent => {
        if (webRef.current) {
          const target = webRef.current.nodes[agent.nodeId]
          agent.tx = target.x
          agent.ty = target.y
        }
        agent.x += (agent.tx - agent.x) * 0.025
        agent.y += (agent.ty - agent.y) * 0.025
        agent.x += Math.sin(t * 0.6 + agent.id.charCodeAt(0)) * 0.4
        agent.y += Math.cos(t * 0.4 + agent.id.charCodeAt(1) || 0) * 0.4

        const color = COLORS[agent.type] || COLORS.default
        const alpha = agent.vitalite / 100
        const r     = 5 + agent.generation * 0.5

        // Pheromone trail
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, r * 3, 0, Math.PI * 2)
        const rgb = color.slice(1).match(/.{2}/g)!.map(h => parseInt(h, 16))
        const trail = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, r * 3)
        trail.addColorStop(0, `rgba(${rgb.join(',')},${alpha * 0.15})`)
        trail.addColorStop(1, 'transparent')
        ctx.fillStyle = trail
        ctx.fill()

        // Agent dot
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, r, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()

        if (agent.type === 'reine') {
          ctx.beginPath()
          ctx.arc(agent.x, agent.y, r + 3 + Math.sin(t * 4) * 1, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(245,200,66,0.5)'
          ctx.lineWidth   = 1
          ctx.stroke()
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    // Move agents every 5s
    const moveInterval = setInterval(() => {
      agentsRef.current.forEach(agent => {
        if (Math.random() < 0.6 && webRef.current) {
          agent.nodeId = Math.floor(Math.random() * webRef.current.nodes.length)
        }
      })
    }, 5000)

    // Hover detection
    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const hit = agentsRef.current.find(a => {
        const dx = a.x - mx, dy = a.y - my
        return Math.sqrt(dx*dx + dy*dy) < 12
      })
      onHoverRef.current(hit || null)
    }

    const resizeObs = new ResizeObserver(() => resize())
    resizeObs.observe(canvas.parentElement!)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseleave', () => onHoverRef.current(null))

    resize()
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(moveInterval)
      resizeObs.disconnect()
      canvas.removeEventListener('mousemove', handleMove)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }} />
  )
}
