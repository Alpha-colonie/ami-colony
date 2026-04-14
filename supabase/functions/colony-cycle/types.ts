// ============================================================
// AMI Colony — types.ts
// Types TypeScript partagés entre tous les modules
// ============================================================

export interface Adn {
  curiosite:   number  // 0-100
  sociabilite: number  // 0-100
  agressivite: number  // 0-100
  memoire:     number  // 0-100
}

export interface Agent {
  id:              string
  colony_id:       number
  nom:             string | null
  type:            'reine' | 'tisseuse' | 'batisseuse' | 'gardienne'
  identite:        string | null
  adn:             Adn
  prompt_actuel:   string
  vitalite:        number
  zone_id:         number
  parent_id:       string | null
  generation:      number
  vivant:          boolean
  cycle_naissance: number
}

export interface Zone {
  id:          number
  nom:         string
  type:        string
  altitude:    number
  ressources:  number
  danger:      number
  eau:         number
  temperature: number
  accessible:  boolean
}

export interface Trace {
  id:        string
  agent_id:  string
  colony_id: number
  zone_id:   number
  type:      string
  contenu:   string
  intensite: number
}

export interface Event {
  id:        string
  type:      string
  colony_id: number | null
  zone_id:   number | null
  intensite: number
  actif:     boolean
}

export interface ColonyResources {
  nourriture:         number
  eau:                number
  energie_collective: number
  cohesion:           number
}

export interface MemoryContext {
  immediate:  ImmediateMemory[]
  episodique: EpisodicMemory[]
  collective: CollectiveMemory[]
}

export interface ImmediateMemory {
  cycle:      number
  action:     string
  perception: string
  etat:       string
  succes:     boolean
}

export interface EpisodicMemory {
  type:     string
  contenu:  string
  ressenti: string
  force:    number
  cycle:    number
}

export interface CollectiveMemory {
  type:    string
  contenu: string
  force:   number
}

export interface AgentResponse {
  perception:       string
  etat_interne:     string
  decision:         string
  action: {
    type:           string
    zone_cible:     number
    intensite:      number
    trait_utilise:  'curiosite' | 'sociabilite' | 'agressivite' | 'memoire'
    succes:         boolean
  }
  trace: {
    type:      string
    contenu:   string
    intensite: number
  }
  nouvelle_memoire?: {
    type:      string
    contenu:   string
    ressenti:  string
    intensite: number
  } | null
  requete_externe?: {
    contenu: string
    urgence: number
  } | null
}

export interface WeatherData {
  temperature:   number
  vent_kmh:      number
  precipitation: number
  weather_code:  number
  visibilite_km: number
}

export interface City {
  id:         number
  nom:        string
  pays:       string
  latitude:   number
  longitude:  number
  hemisphere: string
  phase:      string
}
