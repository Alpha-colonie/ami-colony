// ============================================================
// AMI Colony — weather.ts
// Météo réelle Open-Meteo → événement colonie
// ============================================================

import type { WeatherData, City } from './types.ts'

export async function fetchCurrentWeather(city: City): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${city.latitude}` +
      `&longitude=${city.longitude}` +
      `&current=temperature_2m,wind_speed_10m,precipitation,weather_code,visibility`

    const response = await fetch(url)
    const data     = await response.json()
    const current  = data.current

    if (!current) {
      console.error('Open-Meteo: pas de données current')
      return null
    }

    return {
      temperature:   current.temperature_2m,
      vent_kmh:      current.wind_speed_10m,
      precipitation: current.precipitation,
      weather_code:  current.weather_code,
      visibilite_km: (current.visibility || 10000) / 1000
    }
  } catch (err) {
    console.error('Weather fetch error:', err)
    return null
  }
}

export function translateWeatherToEvent(
  weather: WeatherData
): { type: string; intensite: number; description: string } {

  const { temperature, vent_kmh, precipitation, visibilite_km } = weather

  if (temperature > 38) {
    return {
      type:        'canicule',
      intensite:   Math.min(100, Math.floor((temperature - 38) * 5 + 60)),
      description: `Canicule extrême — ${temperature}°C`
    }
  }

  if (vent_kmh > 80) {
    return {
      type:        'tempete',
      intensite:   Math.min(100, Math.floor(vent_kmh - 30)),
      description: `Tempête violente — ${vent_kmh} km/h`
    }
  }

  if (precipitation > 20) {
    return {
      type:        'pluie_forte',
      intensite:   Math.min(100, Math.floor(precipitation * 2)),
      description: `Pluie intense — ${precipitation}mm`
    }
  }

  if (temperature < -5) {
    return {
      type:        'neige',
      intensite:   Math.min(100, Math.floor(Math.abs(temperature) * 5)),
      description: `Gel intense — ${temperature}°C`
    }
  }

  if (vent_kmh > 50) {
    return {
      type:        'vent_fort',
      intensite:   Math.floor(vent_kmh - 20),
      description: `Vents forts — ${vent_kmh} km/h`
    }
  }

  if (visibilite_km < 1) {
    return {
      type:        'brouillard',
      intensite:   Math.floor((1 - visibilite_km) * 80),
      description: `Brouillard dense — ${visibilite_km.toFixed(1)}km`
    }
  }

  if (temperature < 5) {
    return {
      type:        'neige',
      intensite:   Math.floor(Math.abs(temperature) * 3),
      description: `Froid intense — ${temperature}°C`
    }
  }

  if (precipitation > 5) {
    return {
      type:        'pluie_legere',
      intensite:   Math.floor(precipitation * 3),
      description: `Pluie légère — ${precipitation}mm`
    }
  }

  if (temperature > 28) {
    return {
      type:        'abondance',
      intensite:   Math.floor((temperature - 20) * 3),
      description: `Chaleur agréable — ${temperature}°C`
    }
  }

  return {
    type:        'beau_temps',
    intensite:   70,
    description: `Conditions idéales — ${temperature}°C`
  }
}

export function getEventImpact(eventType: string, intensite: number): Record<string, number | boolean> {
  const impacts: Record<string, Record<string, number | boolean>> = {
    canicule:     { vitalite_delta: -20, ressources_delta: -15, eau_delta: -20 },
    tempete:      { vitalite_delta: -15, traces_evaporation: 2, zones_damage: true },
    pluie_forte:  { vitalite_delta: -5,  eau_delta: 30,  traces_evaporation: 1 },
    pluie_legere: { vitalite_delta: 0,   eau_delta: 15 },
    neige:        { vitalite_delta: -15, action_reduction: 50 },
    vent_fort:    { vitalite_delta: -5,  traces_evaporation: 2 },
    brouillard:   { vitalite_delta: 0,   trace_portee_reduction: 70 },
    beau_temps:   { vitalite_delta: 5,   ressources_delta: 10, reproduction_bonus: true },
    abondance:    { vitalite_delta: 10,  ressources_delta: 20, reproduction_bonus: true },
    nuageux:      { vitalite_delta: 0 }
  }

  const base   = impacts[eventType] || { vitalite_delta: 0 }
  const factor = intensite / 100

  return Object.fromEntries(
    Object.entries(base).map(([k, v]) =>
      typeof v === 'number' ? [k, Math.round((v as number) * factor)] : [k, v]
    )
  )
}
