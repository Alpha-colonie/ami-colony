// ============================================================
// AMI Colony — memory.ts
// Gestion des 3 niveaux de mémoire des agents
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { MemoryContext } from './types.ts'

export async function buildMemoryContext(
  supabase: ReturnType<typeof createClient>,
  agentId:  string,
  cycle:    number
): Promise<MemoryContext> {

  const { data } = await supabase
    .rpc('build_memory_context', {
      p_agent_id: agentId,
      p_cycle:    cycle
    })

  return data || { immediate: [], episodique: [], collective: [] }
}

export async function maybeCreateMemory(
  supabase:   ReturnType<typeof createClient>,
  agentId:    string,
  colonyId:   number,
  cycle:      number,
  type:       string,
  contenu:    string,
  ressenti:   string,
  intensite:  number,
  zoneId:     number
): Promise<void> {
  if (intensite <= 70) return

  await supabase
    .from('colony.agent_memory')
    .insert({
      agent_id:  agentId,
      colony_id: colonyId,
      cycle,
      type,
      contenu,
      ressenti,
      intensite,
      zone_id:   zoneId
    })
}

export async function updateCollectiveMemory(
  supabase:  ReturnType<typeof createClient>,
  agentId:   string,
  colonyId:  number,
  type:      string,
  contenu:   string,
  cycle:     number
): Promise<void> {

  const { data: existing } = await supabase
    .from('colony.collective_memory')
    .select('*')
    .eq('colony_id', colonyId)
    .eq('type', type)
    .ilike('contenu', `%${contenu.substring(0, 30)}%`)
    .eq('actif', true)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('colony.collective_memory')
      .update({
        force:         existing.force + 1,
        contribue_par: [...(existing.contribue_par || []), agentId],
        dernier_cycle: cycle,
        updated_at:    new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('colony.collective_memory')
      .insert({
        colony_id:     colonyId,
        type,
        contenu,
        force:         1,
        contribue_par: [agentId],
        premier_cycle: cycle,
        dernier_cycle: cycle
      })
  }
}
