import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import "../App2.css"

// ─── Types ────────────────────────────────────────────────────────────────────
interface SearchedLocation {
  lat: number
  lng: number
  displayName: string
}

interface LayerVisibility {
  businesses: boolean
  permits: boolean
  requests: boolean
  violations: boolean
}

// ─── ArcGIS Endpoints ────────────────────────────────────────────────────────
const ARCGIS = {
  BUSINESSES:
    "https://services7.arcgis.com/xNUwUjOJqYE54USz/ArcGIS/rest/services/Business_view/FeatureServer/0",

  PERMITS:
    "https://services7.arcgis.com/xNUwUjOJqYE54USz/ArcGIS/rest/services/Construction_Permit/FeatureServer/0",
  SERVICE_REQUESTS:
    "https://services7.arcgis.com/xNUwUjOJqYE54USz/ArcGIS/rest/services/Service_Request_311/FeatureServer/0",

  CODE_VIOLATIONS:
    "https://services7.arcgis.com/xNUwUjOJqYE54USz/ArcGIS/rest/services/Code_Violations/FeatureServer/0"
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

// ─── Helper: circle GeoJSON ───────────────────────────────────────────────────
function createCircleGeoJSON(lat: number, lng: number, radiusDeg: number) {
  const points = 64
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    coords.push([lng + radiusDeg * Math.cos(angle), lat + radiusDeg * Math.sin(angle)])
  }
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [coords] },
        properties: {},
      },
    ],
  }
}

// ─── Helper: fetch ArcGIS ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchArcGIS(serviceUrl: string, lat: number, lng: number): Promise<any[]> {
  const params = new URLSearchParams({
    geometry: JSON.stringify({ x: lng, y: lat }),
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: "1609",
    units: "esriSRUnit_Meter",
    outFields: "*",
    returnGeometry: "true",
    resultRecordCount: "100",
    f: "geojson"
  })
  return fetch(serviceUrl + '/query?' + params)
    .then((r) => r.json())
    .then((data) => data.features || [])
    .catch(() => [])
}

// ─── Helper: upsert map source + layer ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function upsertSource(map: maplibregl.Map, id: string, data: any) {
  if (map.getSource(id)) {
    ; (map.getSource(id) as maplibregl.GeoJSONSource).setData(data)
  } else {
    map.addSource(id, { type: 'geojson', data })
  }
}

function removeLayerAndSource(map: maplibregl.Map, layerId: string, sourceId?: string) {
  if (map.getLayer(layerId)) map.removeLayer(layerId)
  const sid = sourceId ?? layerId
  if (map.getSource(sid)) map.removeSource(sid)
}
function calculateEconomicScore(
  businesses: any[],
  permits: any[],
  requests: any[],
  violations: any[]
) {
  let score = 50

  const bizPoints = Math.min(businesses.length * 1.5, 25)
  score += bizPoints

  const newBiz = businesses.filter(
    b => b.properties?.pvrtDESC === "New" || b.properties?.pvrtDESC === "NEW"
  ).length

  score += Math.min(newBiz * 2, 10)

  const permitPoints = Math.min(permits.length * 2, 15)
  score += permitPoints

  const requestPenalty = Math.min(requests.length * 0.5, 10)
  score -= requestPenalty

  const violationPenalty = Math.min(violations.length * 1, 15)
  score -= violationPenalty

  score = Math.max(0, Math.min(100, Math.round(score)))

  const grade =
    score >= 90 ? "A+" :
      score >= 80 ? "A" :
        score >= 70 ? "B+" :
          score >= 60 ? "B" :
            score >= 50 ? "C" :
              score >= 40 ? "D" :
                "F"

  return { score, grade }
}
async function getAIAnalysis(data: any) {

  const categories = [...new Set(
    data.businesses
      .map((b: any) => b.properties?.scNAME || b.properties?.pvscDESC)
      .filter(Boolean)
  )].slice(0, 5).join(", ")

  const newBizCount = data.businesses.filter(
    (b: any) => b.properties?.pvrtDESC === "New"
  ).length

  const prompt = `
You are an economic analyst for Montgomery, Alabama.

Analyze the following real city data for a location and produce a short professional briefing.

DATA:
Address: ${data.address}
Businesses nearby: ${data.businesses.length}
New businesses: ${newBizCount}
Categories present: ${categories}
Construction permits: ${data.permits.length}
311 service requests: ${data.requests.length}
Code violations: ${data.violations.length}
Economic score: ${data.score}/100 (Grade ${data.grade})

OUTPUT RULES:
• Write exactly 3 sentences.
• Maximum 60 words total.
• Use a professional tone like a city economic report.
• Mention one positive signal and one concern from the data.
• Avoid repetition and avoid generic advice.

Write the briefing now.
`

  try {

    const response = await fetch(
      `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        })
      }
    )

    const result = await response.json()

    return result?.candidates?.[0]?.content?.parts?.[0]?.text
      || "AI analysis unavailable."

  } catch {

    return "AI analysis temporarily unavailable."

  }

}

export default function NeighborhoodScore() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
const [layers, setLayers] = useState<LayerVisibility>({
  businesses: true,
  permits: true,
  requests: true,
})

  // Data counts
  const [businessCount, setBusinessCount] = useState<number | null>(null)
  const [economicScore, setEconomicScore] = useState<{ score: number, grade: string } | null>(null)
  const [aiAnalysis, setAIAnalysis] = useState<string>("")
  const [permitCount, setPermitCount] = useState<number | null>(null)
  const [requestCount, setRequestCount] = useState<number | null>(null)
  const [violationCount, setViolationCount] = useState<number | null>(null)

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm-tiles' }],
      },
      center: [-86.2999, 32.3617],
      zoom: 12,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right')

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Layer visibility sync ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const pairs: [keyof LayerVisibility, string][] = [
      ['businesses', 'businesses-layer'],
      ['permits', 'permits-layer'],
      ['requests', 'requests-layer'],
    ]
    pairs.forEach(([key, layerId]) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', layers[key] ? 'visible' : 'none')
      }
    })
  }, [layers])

  // ── Geocode + fetch ─────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const query = address.trim()
    if (!query) return

    const map = mapRef.current
    if (!map) return

    setIsLoading(true)
    setBusinessCount(null)
    setPermitCount(null)
    setRequestCount(null)
    setViolationCount(null)

    // 1. Geocode
    let lat: number, lng: number, displayName: string
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const results = await res.json()
      if (!results || results.length === 0) {
        showToast('Address not found. Try: 600 Dexter Ave, Montgomery AL')
        setIsLoading(false)
        return
      }
      lat = parseFloat(results[0].lat)
      lng = parseFloat(results[0].lon)
      displayName = results[0].display_name
    } catch {
      showToast('Address not found. Try: 600 Dexter Ave, Montgomery AL')
      setIsLoading(false)
      return
    }

    setSearchedLocation({ lat, lng, displayName })

    // 2. Fly to
    map.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 })

    // 3. Red marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove()
    }
    const el = document.createElement('div')
    el.className = 'search-marker'
    searchMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map)

    // 4. 1-mile radius circle (≈0.01449 degrees)
    const RADIUS_DEG = 0.01449
    const circleData = createCircleGeoJSON(lat, lng, RADIUS_DEG)

    if (map.getLayer('search-radius-line')) map.removeLayer('search-radius-line')
    if (map.getLayer('search-radius-fill')) map.removeLayer('search-radius-fill')
    if (map.getSource('search-radius')) map.removeSource('search-radius')

    map.addSource('search-radius', { type: 'geojson', data: circleData })
    map.addLayer({
      id: 'search-radius-fill',
      type: 'fill',
      source: 'search-radius',
      paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.1 },
    })
    map.addLayer({
      id: 'search-radius-line',
      type: 'line',
      source: 'search-radius',
      paint: {
        'line-color': '#3B82F6',
        'line-width': 2,
        'line-dasharray': [4, 3],
      },
    })

    // 5. Fetch ArcGIS in parallel
    const [businesses, permits, requests, violations] = await Promise.all([
      fetchArcGIS(ARCGIS.BUSINESSES, lat, lng),
      fetchArcGIS(ARCGIS.PERMITS, lat, lng),
      fetchArcGIS(ARCGIS.SERVICE_REQUESTS, lat, lng),
      fetchArcGIS(ARCGIS.CODE_VIOLATIONS, lat, lng),
    ])

    setBusinessCount(businesses.length)
    setPermitCount(permits.length)
    setRequestCount(requests.length)
    setViolationCount(violations.length)

    const scoreResult = calculateEconomicScore(
      businesses,
      permits,
      requests,
      violations
    )

    setEconomicScore(scoreResult)
    getAIAnalysis({
      address: displayName,
      businesses,
      permits,
      requests,
      violations,
      score: scoreResult.score,
      grade: scoreResult.grade
    }).then(setAIAnalysis)

    // 6. Add/update map layers
    // Remove old layers
    removeLayerAndSource(map, 'businesses-layer', 'businesses-source')
    removeLayerAndSource(map, 'permits-layer', 'permits-source')
    removeLayerAndSource(map, 'requests-layer', 'requests-source')
    removeLayerAndSource(map, 'violations-layer', 'violations-source')

    // Businesses — gold
    const businessGeoJSON = {
      type: 'FeatureCollection' as const,
      features: businesses,
    }
    upsertSource(map, 'businesses-source', businessGeoJSON)
    map.addLayer({
      id: 'businesses-layer',
      type: 'circle',
      source: 'businesses-source',
      paint: {
        'circle-color': '#FFB81C',
        'circle-radius': 5,
        'circle-opacity': 0.8,
      },
      layout: { visibility: layers.businesses ? 'visible' : 'none' },
    })

    // Permits — orange
    const permitsGeoJSON = { type: 'FeatureCollection' as const, features: permits }
    upsertSource(map, 'permits-source', permitsGeoJSON)
    map.addLayer({
      id: 'permits-layer',
      type: 'circle',
      source: 'permits-source',
      paint: {
        'circle-color': '#F97316',
        'circle-radius': 5,
        'circle-opacity': 0.8,
      },
      layout: { visibility: layers.permits ? 'visible' : 'none' },
    })

    // 311 Requests — grey
    // Violations — red
    const violationsGeoJSON = { type: 'FeatureCollection' as const, features: violations }

    upsertSource(map, 'violations-source', violationsGeoJSON)

    map.addLayer({
      id: 'violations-layer',
      type: 'circle',
      source: 'violations-source',
      paint: {
        'circle-color': '#EF4444',
        'circle-radius': 5,
        'circle-opacity': 0.8,
      }
    })
    const requestsGeoJSON = { type: 'FeatureCollection' as const, features: requests }
    upsertSource(map, 'requests-source', requestsGeoJSON)
    map.addLayer({
      id: 'requests-layer',
      type: 'circle',
      source: 'requests-source',
      paint: {
        'circle-color': '#9CA3AF',
        'circle-radius': 4,
        'circle-opacity': 0.7,
      },
      layout: { visibility: layers.requests ? 'visible' : 'none' },
    })

    // 7. Popup on click
    if (popupRef.current) popupRef.current.remove()

    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
    popupRef.current = popup

    // Business popup
    map.on('click', 'businesses-layer', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as Record<string, string>

      const name =
        p['custDBA'] ||
        p['custCOMPANY_NAME'] ||
        'Business'

      const category =
        p['pvscDESC'] ||
        p['scNAME'] ||
        ''

      const district =
        p['Council_District'] || ''
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="map-popup">
      <span class="popup-icon">🏢</span>
      <strong>${name}</strong>
      <span class="popup-sub">${category}</span>
      ${district ? `<span class="popup-sub">District ${district}</span>` : ''}
    </div>`
        )
        .addTo(map)
    })
    map.on('mouseenter', 'businesses-layer', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'businesses-layer', () => { map.getCanvas().style.cursor = '' })

    // Permit popup
    map.on('click', 'permits-layer', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as Record<string, string>
      const type = p['PERMIT_TYPE'] || p['TYPE'] || 'Permit'
      const addr = p['ADDRESS'] || p['LOCATION'] || p['SITE_ADDRESS'] || ''
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<div class="map-popup"><span class="popup-icon">🔨</span><strong>${type}</strong><span class="popup-sub">${addr}</span></div>`)
        .addTo(map)
    })
    map.on('mouseenter', 'permits-layer', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'permits-layer', () => { map.getCanvas().style.cursor = '' })

    // 311 popup
    map.on('click', 'requests-layer', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as Record<string, string>
      const type = p['REQUEST_TYPE'] || p['TYPE'] || p['CATEGORY'] || '311 Request'
      const status = p['STATUS'] || p['REQUEST_STATUS'] || ''
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<div class="map-popup"><span class="popup-icon">📋</span><strong>${type}</strong><span class="popup-sub">${status}</span></div>`)
        .addTo(map)
    })
    map.on('mouseenter', 'requests-layer', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'requests-layer', () => { map.getCanvas().style.cursor = '' })

    setIsLoading(false)
  }, [address, layers, showToast])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }





  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon">📍</span>
            <div>
              <h1 className="brand-title">Montgomery</h1>
              <span className="brand-sub">GrowthMap</span>
            </div>
          </div>
          <p className="brand-desc">
            Explore business activity, permits, and 311 requests near any address.
          </p>
        </div>

        {/* Search */}
        <div className="search-box">
          <label className="search-label">Address</label>
          <div className="search-row">
            <input
              className="search-input"
              type="text"
              placeholder="600 Dexter Ave, Montgomery AL"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button className="search-btn" onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <span className="spinner" /> : 'Analyze →'}
            </button>
          </div>
          {searchedLocation && (
            <p className="location-name" title={searchedLocation.displayName}>
              📌 {searchedLocation.displayName.split(',').slice(0, 3).join(',')}
            </p>
          )}
        </div>
        {/* Economic Score Card */}
        <div className="score-card">
          <h3 className="score-title">Economic Opportunity Score</h3>

          {economicScore ? (
            <div className="score-content">
              <span className="score-number">{economicScore.score}</span>
              <span className="score-grade">{economicScore.grade}</span>
            </div>
          ) : (
            <div className="score-empty">Search an address to generate score</div>
          )}
        </div>
        <div className="ai-box">
          <h3>AI Analysis</h3>

          {aiAnalysis ? (
            <p>{aiAnalysis}</p>
          ) : (
            <p className="muted">
              Search an address above to get an AI-powered neighborhood brief.
            </p>
          )}

        </div>

        {/* Data Cards */}
        <div className="cards-grid"></div>
        {/* Data Cards */}

        <div className="cards-grid">
          <DataCard
            icon="🏢"
            label="Businesses"
            count={businessCount}
            loading={isLoading}
            color="#FFB81C"
          />
          <DataCard
            icon="🔨"
            label="Permits"
            count={permitCount}
            loading={isLoading}
            color="#F97316"
          />
          <DataCard
            icon="📋"
            label="311 Requests"
            count={requestCount}
            loading={isLoading}
            color="#9CA3AF"
          />
          <DataCard
            icon="⚠️"
            label="Violations"
            count={violationCount}
            loading={isLoading}
            color="#EF4444"
          />
        </div>

        {/* Layer Control */}
        <div className="layer-panel">
          <h3 className="layer-title">Map Layers</h3>
          <LayerCheckbox
            id="lyr-businesses"
            label="Businesses"
            color="#FFB81C"
            checked={layers.businesses}
            onChange={() => toggleLayer('businesses')}
          />
          <LayerCheckbox
            id="lyr-permits"
            label="Permits"
            color="#F97316"
            checked={layers.permits}
            onChange={() => toggleLayer('permits')}
          />
          <LayerCheckbox
            id="lyr-requests"
            label="311 Requests"
            color="#9CA3AF"
            checked={layers.requests}
            onChange={() => toggleLayer('requests')}
          />
        </div>

        <div className="sidebar-footer">
          <span>Data: City of Montgomery ArcGIS</span>
          <span>Tiles: © OpenStreetMap</span>
        </div>
      </aside>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <main className="map-area">
        <div ref={mapContainer} className="map-container" />
        {/* Radius legend */}
        {searchedLocation && !isLoading && (
          <div className="map-badge">
            <span className="badge-dot" />
            1-mile search radius
          </div>
        )}
      </main>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="toast" role="alert">
          ⚠️ {toast}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────
interface DataCardProps {
  icon: string
  label: string
  count: number | null
  loading: boolean
  color: string
}

function DataCard({ icon, label, count, loading, color }: DataCardProps) {
  return (
    <div className="data-card">
      <div className="card-icon" style={{ background: color + '22', color }}>
        {icon}
      </div>
      <div className="card-body">
        <span className="card-label">{label}</span>
        {loading ? (
          <span className="skeleton" />
        ) : (
          <span className="card-count">
            {count === null ? '—' : count >= 100 ? '100+' : count}
          </span>
        )}
      </div>
    </div>
  )
}

interface LayerCheckboxProps {
  id: string
  label: string
  color: string
  checked: boolean
  onChange: () => void
}

function LayerCheckbox({ id, label, color, checked, onChange }: LayerCheckboxProps) {
  return (
    <label className="layer-row" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="layer-dot" style={{ background: color }} />
      <span className="layer-label">{label}</span>
    </label>
  )
}
