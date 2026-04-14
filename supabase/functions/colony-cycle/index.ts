// ============================================================
// AMI Colony — index.ts
// Point d'entrée de l'Edge Function — orchestrateur principal
//
// Appelé par pg_cron : POST /colony-cycle {"colony_id": 1..4}
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runAgentCycle } from './agent.ts'
import { tryLayEgg, handleUrgencyProtocol } from './queen.ts'
import { fetchCurrentWeather, translateWeatherToEvent } from './weather.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Initialiser le client Supabase ──────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 2. Parser la colonie cible ─────────────────────────────
    const body      = await req.json()
    const colonyId: number = body.colony_id

    if (!colonyId || colonyId < 1 || colonyId > 4) {
      return new Response(
        JSON.stringify({ error: 'colony_id invalide (1-4)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Colony ${colonyId}] Démarrage du cycle`)

    // ── 3. Incrémenter le compteur de cycle ───────────────────
    const { data: cycleData } = await supabase
      .rpc('increment_cycle', { p_colony_id: colonyId })
    const cycle: number = cycleData || 0

    console.log(`[Colony ${colonyId}] Cycle ${cycle}`)

    // ── 4. Récupérer la ville météo actuelle ──────────────────
    const { data: cityProgress } = await supabase
      .from('city_progress')
      .select('city_id, cities(*)')
      .eq('colony_id', colonyId)
      .single()

    // ── 5. Récupérer la météo réelle Open-Meteo ───────────────
    let weatherEventType = 'nuageux'  // défaut si API indisponible
    let weatherDescription = 'Météo inconnue'

    if (cityProgress?.cities) {
      const city    = cityProgress.cities as any
      const weather = await fetchCurrentWeather(city)

      if (weather) {
        const event = translateWeatherToEvent(weather)
        weatherEventType   = event.type
        weatherDescription = event.description

        // Logger la météo
        await supabase.from('weather_log').insert({
          city_id:     city.id,
          colony_id:   colonyId,
          temperature: weather.temperature,
          vent_kmh:    weather.vent_kmh,
          precipitation: weather.precipitation,
          weather_code:  weather.weather_code,
          visibilite_km: weather.visibilite_km,
          raw_data:      weather
        })

        // Logger dans l'historique
        await supabase.from('logs.weather_history').insert({
          colony_id:     colonyId,
          cycle,
          city_nom:      city.nom,
          temperature:   weather.temperature,
          condition:     weatherEventType,
          event_genere:  weatherDescription,
          impact_colonie: ''
        })
      }
    }

    // ── 6. Créer l'événement météo actif ─────────────────────
    // Désactiver l'événement précédent
    await supabase
      .from('events')
      .update({ actif: false })
      .eq('colony_id', colonyId)
      .eq('source',    'meteo')

    await supabase.from('events').insert({
      source:      'meteo',
      colony_id:   colonyId,
      type:        weatherEventType,
      intensite:   70,
      description: weatherDescription,
      actif:       true,
      expires_at:  new Date(Date.now() + 45 * 60 * 1000).toISOString()  // 45 minutes
    })

    // ── 7. Régénération des ressources (toutes les 12 cycles ≈ 9h)
    if (cycle % 12 === 0) {
      await supabase.rpc('colony.regenerate_resources', {
        p_colony_id:  colonyId,
        p_event_type: weatherEventType,
        p_cycle:      cycle
      })
    }

    // ── 8. Consommation des ressources ─────────────────────────
    await supabase.rpc('colony.consume_resources', {
      p_colony_id: colonyId,
      p_cycle:     cycle
    })

    // ── 9. Récupérer les agents vivants ───────────────────────
    const { data: agents } = await supabase
      .from('colony.agents')
      .select('*')
      .eq('colony_id', colonyId)
      .eq('vivant',    true)
      .order('type')   // reine en premier

    if (!agents || agents.length === 0) {
      console.log(`[Colony ${colonyId}] Aucun agent vivant — extinction`)
      await supabase.from('logs.colony_history').insert({
        colony_id:   colonyId,
        cycle,
        event_type:  'extinction',
        description: 'La colonie s\'est éteinte — aucun agent survivant'
      })
      return new Response(
        JSON.stringify({ colony_id: colonyId, cycle, status: 'extinction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Colony ${colonyId}] ${agents.length} agents actifs`)

    // ── 10. Exécuter le cycle de chaque agent ─────────────────
    const results: string[] = []

    for (const agent of agents) {
      try {
        await runAgentCycle(supabase, agent, cycle)
        results.push(`${agent.identite || agent.type}: OK`)

        // Tentative de ponte si reine
        if (agent.type === 'reine') {
          const laid = await tryLayEgg(supabase, agent, cycle)
          if (laid) results.push(`${agent.identite}: ponte réussie`)
        }

      } catch (err: any) {
        // Quota épuisé → logger sans crasher les autres agents
        if (err.message?.includes('Quota Gemini épuisé')) {
          console.warn(`[Colony ${colonyId}] Quota épuisé pour ${agent.identite}`)
          await supabase.from('logs.colony_history').insert({
            colony_id:   colonyId,
            cycle,
            event_type:  'quota_epuise',
            agent_id:    agent.id,
            description: `Quota Gemini épuisé — ${agent.identite || agent.type} saute ce cycle`
          })
        } else {
          console.error(`[Colony ${colonyId}] Erreur agent ${agent.identite}:`, err)
        }
      }
    }

    // ── 11. Vérifier les signaux d'urgence de la reine ────────
    const { data: urgentRequests } = await supabase
      .from('colony.requetes_externes')
      .select('*')
      .eq('colony_id', colonyId)
      .eq('statut',    'envoyee')
      .gte('urgence',  70)
      .order('created_at', { ascending: false })
      .limit(1)

    if (urgentRequests && urgentRequests.length > 0) {
      const req = urgentRequests[0]
      console.log(`[Colony ${colonyId}] Signal urgence ${req.urgence} — "${req.contenu.substring(0, 50)}"`)

      // Protocole d'urgence automatique si >= 90 et pas de réponse dans l'heure
      const delai = Date.now() - new Date(req.created_at).getTime()
      if (req.urgence >= 90 && delai > 60 * 60 * 1000) {
        await handleUrgencyProtocol(supabase, colonyId, req.urgence, cycle)
        await supabase.from('colony.requetes_externes')
          .update({ statut: 'repondue', reponse: 'Protocole automatique activé', repondu_at: new Date().toISOString() })
          .eq('id', req.id)
      }
    }

    // ── 12. Snapshot ADN si multiple de 10 ────────────────────
    if (cycle % 10 === 0) {
      await supabase.rpc('colony.snapshot_adn', { p_colony_id: colonyId })
    }

    // ── 13. Retourner le résumé ────────────────────────────────
    const response = {
      colony_id: colonyId,
      cycle,
      agents:    agents.length,
      meteo:     weatherEventType,
      ville:     cityProgress?.cities ? (cityProgress.cities as any).nom : 'inconnue',
      actions:   results,
      timestamp: new Date().toISOString()
    }

    console.log(`[Colony ${colonyId}] Cycle ${cycle} terminé`, response)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Erreur Edge Function:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
