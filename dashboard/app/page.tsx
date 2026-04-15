'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase, COLONY_ID } from '@/lib/supabase'
import ColonyStats  from '@/components/ColonyStats'
import WeatherBlock from '@/components/WeatherBlock'
import TraceFeed    from '@/components/TraceFeed'
import type { Agent, Trace, Event, WeatherLog, QueenRequest } from '@/lib/types'

// Canvas must be client-only — no SSR
const WorldCanvas = dynamic(() => import('@/components/WorldCanvas'), { ssr: false })

export default function Page() {
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [traces,       setTraces]       = useState<Trace[]>([])
  const [event,        setEvent]        = useState<Event | null>(null)
  const [weather,      setWeather]      = useState<WeatherLog | null>(null)
  const [queenReq,     setQueenReq]     = useState<QueenRequest | null>(null)
  const [cycle,        setCycle]        = useState(0)
  const [naissances,   setNaissances]   = useState(0)
  const [morts,        setMorts]        = useState(0)
  const [genMax,       setGenMax]       = useState(1)

  // ── Initial fetch ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      // Agents vivants
      const { data: ag } = await supabase
        .from('agents_public')
        .select('*')
        .eq('colony_id', COLONY_ID)
      if (ag) setAgents(ag as Agent[])

      // Traces récentes
      const { data: tr } = await supabase
        .from('traces_public')
        .select('*, agents:agent_id(identite, type)')
        .eq('colony_id', COLONY_ID)
        .order('created_at', { ascending: false })
        .limit(20)
      if (tr) setTraces(tr as unknown as Trace[])

      // Événement météo actif
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('colony_id', COLONY_ID)
        .eq('actif', true)
        .eq('source', 'meteo')
        .maybeSingle()
      if (ev) setEvent(ev as Event)

      // Dernière météo
      const { data: wt } = await supabase
        .from('weather_log')
        .select('*, cities(nom, pays)')
        .eq('colony_id', COLONY_ID)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (wt) setWeather(wt as unknown as WeatherLog)

      // Cycle counter
      const { data: cc } = await supabase
        .from('cycle_counter')
        .select('cycle_actuel')
        .eq('colony_id', COLONY_ID)
        .maybeSingle()
      if (cc) setCycle(cc.cycle_actuel)

      // Stats naissances / morts
      const { count: nb } = await supabase
        .from('colony_history')
        .select('*', { count: 'exact', head: true })
        .eq('colony_id', COLONY_ID)
        .eq('event_type', 'naissance')
      setNaissances(nb || 0)

      const { count: nd } = await supabase
        .from('colony_history')
        .select('*', { count: 'exact', head: true })
        .eq('colony_id', COLONY_ID)
        .eq('event_type', 'mort')
      setMorts(nd || 0)

      // Génération max
      const { data: gm } = await supabase
        .from('agents_public')
        .select('generation')
        .eq('colony_id', COLONY_ID)
        .order('generation', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (gm) setGenMax(gm.generation)

      // Dernière requête urgente non répondue
      const { data: qr } = await supabase
        .from('queen_requests_public')
        .select('*')
        .eq('colony_id', COLONY_ID)
        .eq('statut', 'envoyee')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (qr) setQueenReq(qr as unknown as QueenRequest)
    }

    load()
  }, [])

  // ── Realtime subscriptions ───────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`colony-${COLONY_ID}-live`)

      // Nouvelles traces
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'traces_public',
        filter: `colony_id=eq.${COLONY_ID}`,
      }, async (payload) => {
        // Enrichir avec le nom de l'agent
        const { data: ag } = await supabase
          .from('agents_public')
          .select('identite, type')
          .eq('id', payload.new.agent_id)
          .maybeSingle()

        const trace = { ...payload.new, agents: ag || undefined } as unknown as Trace
        setTraces(prev => [trace, ...prev].slice(0, 20))
        setCycle(prev => payload.new.cycle || prev)
      })

      // Mise à jour agents
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'agents_public',
        filter: `colony_id=eq.${COLONY_ID}`,
      }, async () => {
        const { data } = await supabase
          .from('agents_public')
          .select('*')
          .eq('colony_id', COLONY_ID)
        if (data) setAgents(data as Agent[])
      })

      // Nouveau signal reine
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'queen_requests_public',
        filter: `colony_id=eq.${COLONY_ID}`,
      }, (payload) => {
        if (payload.new.statut === 'envoyee') {
          setQueenReq(payload.new as unknown as QueenRequest)
        }
      })

      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const agentsAlive = agents.filter(a => a.vivant)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Header */}
      <header style={{
        padding: '2rem 2.5rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '1rem',
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '1.1rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#fff',
          }}>
            AMI <span style={{ color: 'var(--queen)' }}>Colony</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.08em', fontStyle: 'italic' }}>
            expérience d'intelligence émergente — observatoire public
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/aquarium" style={{
            fontSize: '0.58rem',
            letterSpacing: '0.1em',
            color: 'var(--text-dim)',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}>
            → Aquarium
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--ok)', textTransform: 'uppercase' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ok)',
              animation: 'pulse-live 2s ease-in-out infinite',
            }} />
            En cours
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        flex: 1,
        overflow: 'hidden',
      }}>

        {/* Canvas zone */}
        <div style={{
          position: 'relative',
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '1.5rem', left: '1.5rem',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            zIndex: 10,
          }}>
            carte des zones — colonie alpha
          </div>
          <WorldCanvas agents={agentsAlive} />
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <ColonyStats
            cycle={cycle}
            agents={agentsAlive.length}
            naissances={naissances}
            morts={morts}
            genMax={genMax}
          />

          <WeatherBlock event={event} weather={weather} />

          <TraceFeed traces={traces} queenRequest={queenReq} cycle={cycle} />

        </div>
      </main>
    </div>
  )
}
