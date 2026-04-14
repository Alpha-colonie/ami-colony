// ============================================================
// AMI Colony — evolution.ts
// Évolution ADN + réécriture narrative du prompt
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Agent, Adn } from './types.ts'
import { callGemini, getColonyApiKey } from './api.ts'

// Micro évolution ADN après chaque action
export async function evolveAdn(
  supabase:     ReturnType<typeof createClient>,
  agentId:      string,
  traitUtilise: keyof Adn,
  succes:       boolean
): Promise<void> {
  await supabase.rpc('colony.evolve_adn', {
    p_agent_id: agentId,
    p_trait:    traitUtilise,
    p_succes:   succes
  })
}

// Mutation ADN pour un enfant
export function mutateAdn(parentAdn: Adn): Adn {
  const mutation = () => Math.floor((Math.random() - 0.5) * 20)
  return {
    curiosite:   Math.min(100, Math.max(0, parentAdn.curiosite   + mutation())),
    sociabilite: Math.min(100, Math.max(0, parentAdn.sociabilite + mutation())),
    agressivite: Math.min(100, Math.max(0, parentAdn.agressivite + mutation())),
    memoire:     Math.min(100, Math.max(0, parentAdn.memoire     + mutation()))
  }
}

// Calcul du delta ADN entre deux snapshots
export function adnDelta(before: Adn, after: Adn) {
  return {
    delta_curiosite:   after.curiosite   - before.curiosite,
    delta_sociabilite: after.sociabilite - before.sociabilite,
    delta_agressivite: after.agressivite - before.agressivite,
    delta_memoire:     after.memoire     - before.memoire
  }
}

// Réécriture narrative du prompt tous les 50 cycles
export async function evolvePrompt(
  supabase:  ReturnType<typeof createClient>,
  agent:     Agent,
  cycle:     number,
  adnAvant:  Adn
): Promise<string> {

  // Récupérer les 50 derniers cycles d'actions
  const { data: states } = await supabase
    .from('colony.agent_states')
    .select('cycle, action_type, perception, etat_interne, action_succes')
    .eq('agent_id', agent.id)
    .gte('cycle', cycle - 50)
    .order('cycle', { ascending: true })

  // Récupérer les souvenirs marquants
  const { data: memories } = await supabase
    .from('colony.agent_memory')
    .select('type, contenu, ressenti, intensite')
    .eq('agent_id', agent.id)
    .eq('actif', true)
    .order('intensite', { ascending: false })
    .limit(5)

  const delta = adnDelta(adnAvant, agent.adn)

  const prompt = `Tu es un auteur qui fait évoluer la personnalité d'un être vivant.

PROMPT ACTUEL :
${agent.prompt_actuel}

ÉVOLUTION ADN SUR 50 CYCLES :
Curiosité    : ${adnAvant.curiosite} → ${agent.adn.curiosite} (${delta.delta_curiosite > 0 ? '+' : ''}${delta.delta_curiosite})
Sociabilité  : ${adnAvant.sociabilite} → ${agent.adn.sociabilite} (${delta.delta_sociabilite > 0 ? '+' : ''}${delta.delta_sociabilite})
Agressivité  : ${adnAvant.agressivite} → ${agent.adn.agressivite} (${delta.delta_agressivite > 0 ? '+' : ''}${delta.delta_agressivite})
Mémoire      : ${adnAvant.memoire} → ${agent.adn.memoire} (${delta.delta_memoire > 0 ? '+' : ''}${delta.delta_memoire})

ACTIONS SUR 50 CYCLES :
${(states || []).slice(-20).map((s: any) =>
  `Cycle ${s.cycle}: ${s.action_type || 'repos'} — ${s.action_succes ? 'succès' : 'échec'}`
).join('\n')}

SOUVENIRS MARQUANTS :
${(memories || []).map((m: any) =>
  `[${m.type}] ${m.contenu} — ressenti: ${m.ressenti}`
).join('\n')}

INSTRUCTIONS :
- Réécris le prompt pour refléter qui cet être est devenu
- Garde la première personne
- Ne mentionne jamais code, système ou technologie
- Amplifie les traits renforcés, atténue les affaiblis
- Intègre les souvenirs marquants naturellement
- Longueur similaire au prompt original
- Termine toujours par les obligations de cycle en JSON
- Retourne UNIQUEMENT le nouveau prompt — aucun texte avant ou après`

  const apiKey    = await getColonyApiKey(supabase, agent.colony_id)
  const newPrompt = await callGemini(prompt, apiKey, 800)

  if (!newPrompt) return agent.prompt_actuel

  // Sauvegarder l'historique d'évolution
  await supabase.from('colony.agent_prompt_history').insert({
    agent_id:         agent.id,
    colony_id:        agent.colony_id,
    cycle,
    prompt_avant:     agent.prompt_actuel,
    prompt_apres:     newPrompt,
    raison_evolution: `Évolution naturelle — cycles ${cycle - 50} à ${cycle}`,
    adn_avant:        adnAvant,
    adn_apres:        agent.adn,
    ...adnDelta(adnAvant, agent.adn),
    resume_periode:   `${states?.length || 0} actions, ${memories?.length || 0} souvenirs marquants`
  })

  // Mettre à jour le prompt de l'agent
  await supabase.from('colony.agents')
    .update({ prompt_actuel: newPrompt, updated_at: new Date().toISOString() })
    .eq('id', agent.id)

  return newPrompt
}
