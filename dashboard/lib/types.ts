export interface Agent {
  id: string
  colony_id: number
  type: 'reine' | 'tisseuse' | 'batisseuse' | 'gardienne'
  identite: string
  vitalite: number
  zone_id: number
  generation: number
  vivant: boolean
  cycle_naissance: number
  adn: { curiosite: number; sociabilite: number; agressivite: number; memoire: number }
}

export interface Zone {
  id: number
  nom: string
  type: string
  x: number
  y: number
  ressources: number
  danger: number
  eau: number
  altitude: number
}

export interface Trace {
  id: string
  agent_id: string
  colony_id: number
  zone_id: number
  type: string
  contenu: string
  intensite: number
  created_at: string
  agents?: { identite: string; type: string }
}

export interface Event {
  id: string
  colony_id: number | null
  type: string
  intensite: number
  description: string
  actif: boolean
  source: string
}

export interface ColonyStats {
  cycle_actuel: number
  agents_vivants: number
  naissances: number
  morts: number
  generation_max: number
}

export interface WeatherLog {
  id: string
  colony_id: number
  temperature: number
  vent_kmh: number
  precipitation: number
  created_at: string
  cities: { nom: string; pays: string }
}

export interface QueenRequest {
  id: string
  colony_id: number
  contenu: string
  urgence: number
  statut: string
  created_at: string
  cycle: number
}
