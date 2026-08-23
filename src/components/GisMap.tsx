import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Tv, 
  Activity, 
  AlertTriangle, 
  Navigation, 
  Camera, 
  Radio, 
  ShieldAlert, 
  Clock, 
  HeartPulse, 
  Signal, 
  Play, 
  Pause, 
  Cpu, 
  Volume2, 
  Sliders, 
  Maximize2,
  Minimize2,
  Compass,
  Map as MapIcon,
  Search,
  Eye,
  Layers,
  Info,
  Activity as PulseIcon 
} from 'lucide-react';
import { Junction, RoadSegment, Hospital, Ambulance, DigitalTwinVehicle } from '../types';

declare global {
  interface Window {
    Cesium: any;
  }
}

// V2X infrastructure types
interface Tower5G {
  id: string;
  name: string;
  lat: number;
  lng: number;
  signalStrength: number;
  status: 'ACTIVE' | 'SLICING' | 'OVERLOAD';
}

interface TrafficCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  junctionId: string;
  health: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  coverageAngle: number;
  vehiclesDetected: number;
  confidence: number;
}

interface ReplayFrame {
  progress: number;
  routeIndex: number;
  lat: number;
  lng: number;
  speed: number;
  activeJunctionState: string;
  overriddenJunctions: string[];
  logs: string[];
}

interface GisMapProps {
  junctions: Junction[];
  roads: RoadSegment[];
  hospitals: Hospital[];
  ambulances: Ambulance[];
  activeJunctionId: string | null;
  onSelectJunction: (id: string | null) => void;
  activeAmbulanceId: string | null;
  onSelectAmbulance: (id: string | null) => void;
  layers: {
    ambulances: boolean;
    density: boolean;
    signals: boolean;
    hospitals: boolean;
    cameras: boolean;
    weather: boolean;
    accidents: boolean;
    constructions: boolean;
    corridors: boolean;
  };
  setLayers: React.Dispatch<React.SetStateAction<{
    ambulances: boolean;
    density: boolean;
    signals: boolean;
    hospitals: boolean;
    cameras: boolean;
    weather: boolean;
    accidents: boolean;
    constructions: boolean;
    corridors: boolean;
  }>>;
  onOpenFeed?: (junctionId: string) => void;
  simulationTicking: boolean;
  detectedVehicles?: DigitalTwinVehicle[];
  activeVehicleId?: string | null;
  onSelectVehicle?: (id: string | null) => void;
  theme?: 'cyber-dark' | 'satellite' | 'terrain';
}

// Inline SVGs for Cesium billboards
const createSvgTowerIcon = (status: string) => {
  const color = status === 'SLICING' ? '#00ECFF' : status === 'ACTIVE' ? '#10B981' : '#EF4444';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="2" fill="${color}"/>
    <path d="M12 12v10"/>
    <path d="M12 2a10 10 0 0 1 10 10"/>
    <path d="M12 6a6 6 0 0 1 6 6"/>
    <path d="M12 2a10 10 0 0 0-10 10"/>
    <path d="M12 6a6 6 0 0 0-6 6"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createSvgCameraIcon = (health: string) => {
  const color = health === 'OPERATIONAL' ? '#A855F7' : health === 'DEGRADED' ? '#F59E0B' : '#EF4444';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="rgba(168,85,247,0.1)"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createSvgHospitalIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#F43F5E" stroke="#FFFFFF" stroke-width="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8M8 12h8" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createSvgSignalIcon = (status: string, isSelected: boolean) => {
  const color = status === 'GREEN' ? '#10B981' : status === 'RED' ? '#EF4444' : status === 'YELLOW' ? '#F59E0B' : '#00ECFF';
  const border = isSelected ? '#FFFFFF' : '#070b10';
  const borderWidth = isSelected ? '2.5' : '1.5';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="8" fill="${color}" stroke="${border}" stroke-width="${borderWidth}"/>
    <circle cx="16" cy="16" r="12" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="3,3"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createSvgAmbulanceIcon = (isCorridorActive: boolean) => {
  const color = isCorridorActive ? '#EF4444' : '#64748B';
  const signalColor = isCorridorActive ? '#D9EF92' : '#FFFFFF';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="${signalColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6" width="14" height="11" rx="1" ry="1"/>
    <polygon points="16 8 22 12 22 17 16 17 16 8"/>
    <circle cx="6" cy="19" r="2" fill="#1E293B"/>
    <circle cx="17" cy="19" r="2" fill="#1E293B"/>
    ${isCorridorActive ? `<circle cx="10" cy="3" r="2.5" fill="#00ECFF" stroke="#00ECFF"/>` : ''}
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createSvgVehicleIcon = (type: string) => {
  let color = '#3B82F6';
  if (type === 'Bus') color = '#06B6D4';
  else if (type === 'Truck') color = '#F59E0B';
  else if (type === 'Motorcycle') color = '#A855F7';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="${color}">
    <circle cx="8" cy="8" r="5" stroke="#FFFFFF" stroke-width="1"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createSvgAccidentIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 2 22 22 22 12 2"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke="#FFFFFF" stroke-width="2"/>
    <line x1="12" y1="17" x2="12.01" y2="17" stroke="#FFFFFF" stroke-width="2.5"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createSvgConstructionIcon = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#F59E0B" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

export default function GisMap({
  junctions,
  roads,
  hospitals,
  ambulances,
  activeJunctionId,
  onSelectJunction,
  activeAmbulanceId,
  onSelectAmbulance,
  layers: externalLayers,
  setLayers: setExternalLayers,
  onOpenFeed,
  simulationTicking,
  detectedVehicles = [],
  activeVehicleId = null,
  onSelectVehicle = () => {},
  theme
}: GisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const prevAmbulancePositions = useRef<Record<string, { lat: number; lng: number; heading: number }>>({});

  // Guard container dimensions prior to Cesium load
  const [dimensionsReady, setDimensionsReady] = useState<boolean>(false);

  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensionsReady(true);
        }
      }
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  // Operational State
  const [followMode, setFollowMode] = useState<boolean>(true);
  const [gNetworkActive, setGNetworkActive] = useState<boolean>(true);
  const [legendOpen, setLegendOpen] = useState<boolean>(true);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeCalcProgress, setRouteCalcProgress] = useState<number>(1.0);
  const prevActiveAmbulanceId = useRef<string | null>(null);

  // Replay frame structures
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [replayProgress, setReplayProgress] = useState<number>(45);
  const [replayPlaying, setReplayPlaying] = useState<boolean>(false);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Floating notifications overlay list
  const [mapEvents, setMapEvents] = useState<Array<{ id: string; msg: string; type: string }>>([
    { id: 'ev1', msg: 'ARKA Sentinel 3D Twin Core Active', type: 'system' }
  ]);

  // Synchronize external layers props with internal GIS layers
  useEffect(() => {
    setGisLayers(prev => ({
      ...prev,
      emergencyVehicles: externalLayers.ambulances,
      traffic: externalLayers.density,
      signals: externalLayers.signals,
      hospitals: externalLayers.hospitals,
      cctv: externalLayers.cameras,
      weather: externalLayers.weather,
      floodZones: externalLayers.accidents,
      construction: externalLayers.constructions,
      roads: externalLayers.corridors
    }));
  }, [
    externalLayers.ambulances,
    externalLayers.density,
    externalLayers.signals,
    externalLayers.hospitals,
    externalLayers.cameras,
    externalLayers.weather,
    externalLayers.accidents,
    externalLayers.constructions,
    externalLayers.corridors
  ]);

  // Sync theme changes from parent tabs
  useEffect(() => {
    if (theme) {
      if (theme === 'cyber-dark') {
        handleLayerPreset('street');
      } else if (theme === 'satellite') {
        handleLayerPreset('satellite');
      } else if (theme === 'terrain') {
        handleLayerPreset('terrain');
      }
    }
  }, [theme]);

  const selectedMissionTitle = "Emergency Operations Wave: Jaydev Vihar ➔ Apollo Hospital";

  const TOWER_STATIONS = useMemo<Tower5G[]>(() => [
    { id: 'TW-JV', name: 'Jaydev 5G Macro cell', lat: 20.3015, lng: 85.8205, signalStrength: 98, status: 'SLICING' },
    { id: 'TW-AV', name: 'Acharya V2X Base station', lat: 20.2925, lng: 85.8320, signalStrength: 95, status: 'SLICING' },
    { id: 'TW-VV', name: 'Vani Vihar 5G Slice Node', lat: 20.2850, lng: 85.8450, signalStrength: 92, status: 'SLICING' },
    { id: 'TW-PT', name: 'Patia Campus Smart gNodeB', lat: 20.3395, lng: 85.8210, signalStrength: 99, status: 'ACTIVE' },
    { id: 'TW-CS', name: 'CRP Square V2X Array', lat: 20.2810, lng: 85.8030, signalStrength: 88, status: 'ACTIVE' }
  ], []);

  const camerasList = useMemo<TrafficCamera[]>(() => {
    return junctions.map(j => ({
      id: `CAM-${j.id}`,
      name: `CCTV Edge Cam - ${j.id}`,
      lat: j.lat + 0.0016,
      lng: j.lng - 0.0014,
      junctionId: j.id,
      health: j.id === 'RS' ? 'DEGRADED' : 'OPERATIONAL',
      coverageAngle: j.id === 'JV' ? 45 : j.id === 'AV' ? 120 : j.id === 'VV' ? 220 : 310,
      vehiclesDetected: Math.max(3, Math.round(j.queueLength * 1.15)),
      confidence: j.status === 'OVERRIDE' ? 99.4 : 96.5
    }));
  }, [junctions]);

  const replayFrames = useMemo<ReplayFrame[]>(() => {
    const totalFrames = 100;
    const startLat = 20.2974;
    const endLat = 20.3082;
    const startLng = 85.8230;
    const endLng = 85.8315;

    const frames: ReplayFrame[] = [];
    for (let i = 0; i < totalFrames; i++) {
      const p = i / (totalFrames - 1);
      const lat = startLat + (endLat - startLat) * p;
      const lng = startLng + (endLng - startLng) * p;
      const speed = p < 0.2 ? 45 : p < 0.8 ? 91 : 35;
      
      let activeJunctionState = "Restoring Flow";
      let overriddenJunctions: string[] = [];
      let logs: string[] = [];

      if (p < 0.4) {
        activeJunctionState = "Evacuating queue at Jaydev Vihar Square";
        overriddenJunctions = ['JV'];
        logs = ["Siren trigger registered", "JV corridor path evicting: -14 vehicles/min"];
      } else if (p < 0.8) {
        activeJunctionState = "Override locked at Acharya Vihar Overpass";
        overriddenJunctions = ['JV', 'AV'];
        logs = ["5G slice tunnel secured", "Vani corridor holding cross traffic"];
      } else {
        activeJunctionState = "Triage docking handshake at Apollo Hospital";
        overriddenJunctions = ['AV', 'APOLLO'];
        logs = ["Hospital trauma room notified", "ECG telemetry synchronized"];
      }

      frames.push({
        progress: p,
        routeIndex: p < 0.5 ? 0 : 1,
        lat,
        lng,
        speed,
        activeJunctionState,
        overriddenJunctions,
        logs
      });
    }
    return frames;
  }, []);

  const currentReplayFrame = replayFrames[Math.floor((replayProgress / 100) * (replayFrames.length - 1))];

  // Replay timeline Clock ticker
  useEffect(() => {
    if (isReplayMode && replayPlaying) {
      replayIntervalRef.current = setInterval(() => {
        setReplayProgress(prev => {
          if (prev >= 100) {
            setReplayPlaying(false);
            return 100;
          }
          return Math.min(100, prev + 1 * replaySpeed);
        });
      }, 120);
    } else {
      if (replayIntervalRef.current) clearInterval(replayIntervalRef.current);
    }
    return () => {
      if (replayIntervalRef.current) clearInterval(replayIntervalRef.current);
    };
  }, [isReplayMode, replayPlaying, replaySpeed]);

  const pushMapEvent = (msg: string, type = 'system') => {
    setMapEvents(prev => [{ id: `ev-${Date.now()}`, msg, type }, ...prev.slice(0, 4)]);
  };

  // Trigger progressive route computation upon active emergency dispatches
  useEffect(() => {
    if (activeAmbulanceId && activeAmbulanceId !== prevActiveAmbulanceId.current) {
      const activeAmb = ambulances.find(a => a.id === activeAmbulanceId);
      if (activeAmb && activeAmb.status === 'Green Corridor Active') {
        setIsCalculatingRoute(true);
        setRouteCalcProgress(0);
        pushMapEvent(`AI Optimizer calculating 5G corridor waves for ${activeAmb.name}`, 'corridor');
        
        let pVal = 0;
        const intv = setInterval(() => {
          pVal += 0.1;
          setRouteCalcProgress(Math.min(1, pVal));
          if (pVal >= 1.0) {
            clearInterval(intv);
            setIsCalculatingRoute(false);
            pushMapEvent(`5G Cellular Slice Tunnel active. Green Wave active.`, 'success');
          }
        }, 150);

        return () => clearInterval(intv);
      }
    }
    prevActiveAmbulanceId.current = activeAmbulanceId;
  }, [activeAmbulanceId, ambulances]);

  // ---------------------------------------------------------------------------
  // NEW ENHANCED GIS TOOLBAR AND LAYER MANAGER STATES
  // ---------------------------------------------------------------------------
  const [fullscreenActive, setFullscreenActive] = useState<boolean>(false);
  const [coordinateString, setCoordinateString] = useState<string>('Hover map for coordinates');
  const [activeTool, setActiveTool] = useState<'pan' | 'measure-distance' | 'measure-area' | 'picker'>('pan');
  const [measurementPoints, setMeasurementPoints] = useState<any[]>([]);
  const [measurementResult, setMeasurementResult] = useState<string>('');
  
  // Layer Search & Filtering States
  const [layerSearch, setLayerSearch] = useState<string>('');
  const [layerCategory, setLayerCategory] = useState<'ALL' | 'INFRA' | 'EMERGENCY' | 'METRICS'>('ALL');
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({
    traffic: 1.0,
    roads: 0.9,
    buildings: 0.85,
    wardBoundaries: 0.7,
    satellite: 1.0,
    terrain: 1.0,
    hospitals: 1.0,
    policeStations: 1.0,
    fireStations: 1.0,
    schools: 1.0,
    cctv: 1.0,
    emergencyVehicles: 1.0,
    weather: 0.6,
    floodZones: 0.5,
    construction: 1.0,
    utilities: 0.7,
    iotSensors: 1.0
  });

  const [gisLayers, setGisLayers] = useState<Record<string, boolean>>({
    traffic: true,
    roads: true,
    buildings: true,
    wardBoundaries: false,
    satellite: false,
    terrain: false,
    hospitals: true,
    policeStations: false,
    fireStations: false,
    schools: false,
    cctv: true,
    emergencyVehicles: true,
    weather: false,
    floodZones: false,
    construction: true,
    utilities: false,
    iotSensors: false
  });

  // Interactive popup detail states
  const [queryBuilding, setQueryBuilding] = useState<any | null>(null);
  const [queryRoad, setQueryRoad] = useState<any | null>(null);

  // Category classification lookup
  const getLayerCategory = (key: string): 'INFRA' | 'EMERGENCY' | 'METRICS' => {
    const categories: Record<string, 'INFRA' | 'EMERGENCY' | 'METRICS'> = {
      traffic: 'METRICS',
      roads: 'INFRA',
      buildings: 'INFRA',
      wardBoundaries: 'INFRA',
      satellite: 'INFRA',
      terrain: 'INFRA',
      hospitals: 'EMERGENCY',
      policeStations: 'EMERGENCY',
      fireStations: 'EMERGENCY',
      schools: 'INFRA',
      cctv: 'METRICS',
      emergencyVehicles: 'EMERGENCY',
      weather: 'METRICS',
      floodZones: 'METRICS',
      construction: 'METRICS',
      utilities: 'INFRA',
      iotSensors: 'METRICS'
    };
    return categories[key] || 'INFRA';
  };

  // Toggle internal layers
  const toggleGisLayer = (key: string) => {
    setGisLayers(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Sync defaults with parent components if name matches
      if (key === 'emergencyVehicles' && setExternalLayers) {
        setExternalLayers(e => ({ ...e, ambulances: next[key] }));
      }
      if (key === 'cctv' && setExternalLayers) {
        setExternalLayers(e => ({ ...e, cameras: next[key] }));
      }
      if (key === 'roads' && setExternalLayers) {
        setExternalLayers(e => ({ ...e, density: next[key] }));
      }
      return next;
    });
    pushMapEvent(`Toggled visibility of layer: ${key.replace(/([A-Z])/g, ' $1')}`);
  };

  const handleOpacityChange = (key: string, value: number) => {
    setLayerOpacities(prev => ({ ...prev, [key]: value }));
  };

  // ---------------------------------------------------------------------------
  // INITIALIZE CESIUM VIEWER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!dimensionsReady) return;
    if (!mapRef.current) return;
    if (viewerRef.current) return;

    if (typeof window.Cesium === 'undefined') {
      console.warn("Cesium is not loaded from CDN.");
      return;
    }

    // Set fallback token to bypass popups
    window.Cesium.Ion.defaultAccessToken = '';

    const viewer = new window.Cesium.Viewer(mapRef.current, {
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false,
      imageryProvider: new window.Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        subdomains: ['a', 'b', 'c', 'd']
      }),
      terrainProvider: new window.Cesium.EllipsoidTerrainProvider()
    });

    if (viewer.creditContainer) {
      viewer.creditContainer.style.display = 'none';
    }

    viewerRef.current = viewer;

    // Load 3D buildings with robust async fallbacks
    (async () => {
      try {
        if (typeof window.Cesium.createGooglePhotorealistic3DTileset === 'function') {
          try {
            const tileset = await window.Cesium.createGooglePhotorealistic3DTileset();
            viewer.scene.primitives.add(tileset);
            pushMapEvent('Loaded Google Photorealistic 3D Tileset', 'success');
            return;
          } catch (googleErr) {
            console.warn("Failed to load Google Photorealistic 3D Tiles, falling back to OSM Buildings:", googleErr);
          }
        }
        
        if (typeof window.Cesium.createOsmBuildingsAsync === 'function') {
          try {
            const osmBuildings = await window.Cesium.createOsmBuildingsAsync();
            viewer.scene.primitives.add(osmBuildings);
            pushMapEvent('Loaded OSM Buildings Layer', 'success');
            return;
          } catch (osmErr) {
            console.warn("Failed to load OSM Buildings:", osmErr);
          }
        }
        
        pushMapEvent('Running in 2D vector mode (no 3D building layers available)', 'system');
      } catch (err) {
        console.warn("Error during 3D buildings initialization:", err);
      }
    })();

    // Center view on Bhubaneswar city bounds with tilt perspective
    viewer.scene.camera.setView({
      destination: window.Cesium.Cartesian3.fromDegrees(85.8245, 20.2850, 8500),
      orientation: {
        heading: window.Cesium.Math.toRadians(0),
        pitch: window.Cesium.Math.toRadians(-50),
        roll: 0.0
      }
    });

    // Screen Space Handler setup
    const handler = new window.Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    
    // Click Handler for selection and interactive querying
    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);
      if (window.Cesium.defined(picked) && picked.id) {
        const entityId: string = picked.id.id;
        
        if (entityId.startsWith('junc-')) {
          const jId = entityId.replace('junc-', '');
          onSelectJunction(jId);
          setSelectedCameraId(null);
          setSelectedTowerId(null);
          setQueryBuilding(null);
          setQueryRoad(null);
          pushMapEvent(`Selected signal node intersection: ${jId}`, 'system');
        } else if (entityId.startsWith('cam-')) {
          const cId = entityId.replace('cam-', '');
          setSelectedCameraId(cId);
          onSelectJunction(null);
          setSelectedTowerId(null);
          setQueryBuilding(null);
          setQueryRoad(null);
          pushMapEvent(`Selected camera CCTV node: ${cId}`, 'system');
        } else if (entityId.startsWith('tower-')) {
          const tId = entityId.replace('tower-', '');
          setSelectedTowerId(tId);
          onSelectJunction(null);
          setSelectedCameraId(null);
          setQueryBuilding(null);
          setQueryRoad(null);
          pushMapEvent(`Selected 5G hypercell V2X antenna: ${tId}`, 'system');
        } else if (entityId.startsWith('amb-')) {
          const aId = entityId.replace('amb-', '');
          onSelectAmbulance(aId);
          setQueryBuilding(null);
          setQueryRoad(null);
          pushMapEvent(`Focused on responder asset: ${aId}`, 'corridor');
        } else if (entityId.startsWith('road-')) {
          const rId = entityId.replace('road-', '');
          const rd = roads.find(r => r.id === rId);
          if (rd) {
            setQueryRoad({
              name: rd.name,
              congestion: rd.congestion,
              avgSpeed: `${rd.avgSpeed} km/h`,
              vehicleCount: `${rd.vehicleCount} units`,
              accessibility: `${rd.emergencyAccessibilityScore || 85}/100`
            });
            onSelectJunction(null);
            setSelectedCameraId(null);
            setSelectedTowerId(null);
            setQueryBuilding(null);
            pushMapEvent(`Queried road segment: ${rd.name}`, 'system');
          }
        }
      } else {
        // Did not pick a billboard entity. Try checking 3D building intersection
        const cartesian = viewer.scene.pickPosition(click.position);
        if (cartesian) {
          const cartographic = window.Cesium.Cartographic.fromCartesian(cartesian);
          const lat = window.Cesium.Math.toDegrees(cartographic.latitude);
          const lng = window.Cesium.Math.toDegrees(cartographic.longitude);
          const height = cartographic.height > 0 ? Math.round(cartographic.height) : Math.round(15 + Math.random() * 20);
          
          // Generate mock building queries
          setQueryBuilding({
            name: `Structure BB-${Math.floor(lng * 1000 % 1000)}`,
            type: height > 28 ? 'Commercial High-Rise Office' : height > 18 ? 'Residential Apartment' : 'Retail Facility',
            height: `${height} meters`,
            nearbyRoads: 'NH-16 Expressway Link',
            nearbyHospitals: 'Apex Trauma General (Hospital 1)',
            ward: `Bhubaneswar Ward #${Math.floor(lat * 100 % 10 + 1)}`,
            coordinates: `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`
          });
          setQueryRoad(null);
          onSelectJunction(null);
          setSelectedCameraId(null);
          setSelectedTowerId(null);
        } else {
          // Reset
          onSelectJunction(null);
          setSelectedCameraId(null);
          setSelectedTowerId(null);
          setQueryBuilding(null);
          setQueryRoad(null);
        }
      }
    }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Mouse Move Handler for coordinate picking
    handler.setInputAction((movement: any) => {
      const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = window.Cesium.Cartographic.fromCartesian(cartesian);
        const lat = window.Cesium.Math.toDegrees(cartographic.latitude).toFixed(5);
        const lng = window.Cesium.Math.toDegrees(cartographic.longitude).toFixed(5);
        setCoordinateString(`Lat: ${lat}°N  Lng: ${lng}°E`);
      }
    }, window.Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [dimensionsReady]);

  // ---------------------------------------------------------------------------
  // RENDER DYNAMIC ENTITIES AND GEOMETRY
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    const activeAmb = isReplayMode 
      ? { id: 'A-102', status: 'Green Corridor Active', route: ['JV', 'AV', 'APOLLO'] }
      : ambulances.find(a => a.status === 'Green Corridor Active');

    // 1. Render 5G Network Towers (if toggled)
    if (gNetworkActive && gisLayers.iotSensors) {
      TOWER_STATIONS.forEach(tower => {
        viewer.entities.add({
          id: `tower-${tower.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(tower.lng, tower.lat, 10),
          billboard: {
            image: createSvgTowerIcon(tower.status),
            width: 32,
            height: 32,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: tower.name,
            font: '10px monospace',
            fillColor: window.Cesium.Color.fromCssColorString('#00ECFF'),
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2,
            style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -22)
          }
        });

        // 3D range dome ellipse on ground
        viewer.entities.add({
          position: window.Cesium.Cartesian3.fromDegrees(tower.lng, tower.lat, 0),
          ellipse: {
            semiMajorAxis: 800.0,
            semiMinorAxis: 800.0,
            material: window.Cesium.Color.fromCssColorString(tower.status === 'SLICING' ? 'rgba(0, 236, 255, 0.06)' : 'rgba(16, 185, 129, 0.03)'),
            outline: true,
            outlineColor: window.Cesium.Color.fromCssColorString(tower.status === 'SLICING' ? '#00ECFF' : '#10B981'),
            outlineWidth: 1.0
          }
        });
      });
    }

    // 2. Render Roads & Elevated Flyovers
    if (gisLayers.roads) {
      roads.forEach(road => {
        const fromNode = junctions.find(j => j.id === road.fromNode) || hospitals.find(h => h.id === road.fromNode);
        const toNode = junctions.find(j => j.id === road.toNode) || hospitals.find(h => h.id === road.toNode);

        if (fromNode && toNode) {
          const isFlyover = !!road.isFlyover;
          const roadHeight = isFlyover ? 25 : 0;

          let baseColor = '#D1D5DB';
          if (road.congestion === 'critical') baseColor = '#EF4444';
          else if (road.congestion === 'heavy') baseColor = '#EA580C';
          else if (road.congestion === 'moderate') baseColor = '#F59E0B';
          else if (road.congestion === 'free') baseColor = '#10B981';

          let isCorridorActive = false;
          if (activeAmb) {
            const fIdx = activeAmb.route.indexOf(fromNode.id);
            const tIdx = activeAmb.route.indexOf(toNode.id);
            if (fIdx !== -1 && tIdx !== -1 && Math.abs(fIdx - tIdx) === 1) {
              isCorridorActive = true;
            }
          }

          const strokeColor = isCorridorActive ? '#D9EF92' : baseColor;
          const polylineGlow = isCorridorActive ? 0.35 : isFlyover ? 0.2 : 0.05;
          const width = isCorridorActive ? 7.0 : isFlyover ? 4.5 : 2.5;

          // Draw the Polyline segment in 3D
          viewer.entities.add({
            id: `road-${road.id}`,
            polyline: {
              positions: window.Cesium.Cartesian3.fromDegreesArrayHeights([
                fromNode.lng, fromNode.lat, roadHeight,
                toNode.lng, toNode.lat, roadHeight
              ]),
              width: width,
              material: new window.Cesium.PolylineGlowMaterialProperty({
                color: window.Cesium.Color.fromCssColorString(strokeColor),
                glowPower: polylineGlow
              })
            }
          });

          // Draw Concrete Pillars for Elevated Flyovers
          if (isFlyover) {
            const pillarsCount = 4;
            for (let i = 0; i < pillarsCount; i++) {
              const fraction = i / (pillarsCount - 1);
              const pLat = fromNode.lat + (toNode.lat - fromNode.lat) * fraction;
              const pLng = fromNode.lng + (toNode.lng - fromNode.lng) * fraction;

              // Concrete cylinder pillar supporting flyover deck
              viewer.entities.add({
                position: window.Cesium.Cartesian3.fromDegrees(pLng, pLat, roadHeight / 2),
                cylinder: {
                  length: roadHeight,
                  topRadius: 1.2,
                  bottomRadius: 1.8,
                  material: window.Cesium.Color.fromCssColorString('#1F2937'),
                  outline: true,
                  outlineColor: window.Cesium.Color.fromCssColorString('#4B5563')
                }
              });
            }
          }
        }
      });
    }

    // 3. Render Hospitals (if toggled)
    if (gisLayers.hospitals) {
      hospitals.forEach(h => {
        viewer.entities.add({
          id: `hosp-${h.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(h.lng, h.lat, 0),
          billboard: {
            image: createSvgHospitalIcon(),
            width: 32,
            height: 32,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: h.name.split(', ')[0],
            font: 'bold 9px sans-serif',
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2,
            style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -22)
          }
        });
      });
    }

    // 4. Render Cameras (if toggled)
    if (gisLayers.cctv) {
      camerasList.forEach(cam => {
        viewer.entities.add({
          id: `cam-${cam.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(cam.lng, cam.lat, 0),
          billboard: {
            image: createSvgCameraIcon(cam.health),
            width: 26,
            height: 26,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: cam.id,
            font: '8px monospace',
            fillColor: window.Cesium.Color.fromCssColorString('#C084FC'),
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -18)
          }
        });
      });
    }

    // 5. Render Signals/Intersections (if toggled)
    if (gisLayers.signals) {
      junctions.forEach(j => {
        const isSelected = j.id === activeJunctionId;
        
        let status = j.status;
        if (activeAmb) {
          const pathIdx = activeAmb.route.indexOf(j.id);
          const currentIdx = isReplayMode && currentReplayFrame ? currentReplayFrame.routeIndex : (ambulances.find(amb => amb.status === 'Green Corridor Active')?.routeIndex || 0);

          if (pathIdx !== -1) {
            if (pathIdx === currentIdx || pathIdx === currentIdx + 1) {
              status = 'OVERRIDE';
            }
          }
        }

        viewer.entities.add({
          id: `junc-${j.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(j.lng, j.lat, 0),
          billboard: {
            image: createSvgSignalIcon(status, isSelected),
            width: isSelected ? 34 : 26,
            height: isSelected ? 34 : 26,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: `${j.id} (${j.density}%)`,
            font: '9px monospace',
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2,
            style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -20)
          }
        });
      });
    }

    // 6. Render Emergency Vehicles (if toggled)
    if (gisLayers.emergencyVehicles) {
      ambulances.forEach(a => {
        let lat = a.currentPosition.lat;
        let lng = a.currentPosition.lng;

        if (isReplayMode && currentReplayFrame && a.id === 'A-102') {
          lat = currentReplayFrame.lat;
          lng = currentReplayFrame.lng;
        }

        const isCorridorActive = a.status === 'Green Corridor Active';

        // Calculate dynamic heading/bearing
        const prev = prevAmbulancePositions.current[a.id];
        let headingRad = prev ? prev.heading : 0;
        if (prev) {
          const dLat = lat - prev.lat;
          const dLng = lng - prev.lng;
          if (Math.abs(dLat) > 0.000001 || Math.abs(dLng) > 0.000001) {
            const bearing = Math.atan2(dLng, dLat);
            headingRad = -bearing + Math.PI / 2;
          }
        }
        prevAmbulancePositions.current[a.id] = { lat, lng, heading: headingRad };

        viewer.entities.add({
          id: `amb-${a.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(lng, lat, 6),
          billboard: {
            image: createSvgAmbulanceIcon(isCorridorActive),
            width: isCorridorActive ? 34 : 28,
            height: isCorridorActive ? 34 : 28,
            rotation: headingRad
          },
          label: {
            text: isCorridorActive ? `🚑 ${a.name} [V2X LOCKED]` : a.name,
            font: 'bold 9px monospace',
            fillColor: isCorridorActive ? window.Cesium.Color.fromCssColorString('#D9EF92') : window.Cesium.Color.WHITE,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -20)
          }
        });

        // Draw 5G V2X communication links in real-time
        if (gNetworkActive && gisLayers.iotSensors) {
          TOWER_STATIONS.forEach(tower => {
            const towerCartesian = window.Cesium.Cartesian3.fromDegrees(tower.lng, tower.lat, 0);
            const ambCartesian = window.Cesium.Cartesian3.fromDegrees(lng, lat, 0);
            const distance = window.Cesium.Cartesian3.distance(towerCartesian, ambCartesian);
            
            if (distance < 3100) {
              viewer.entities.add({
                polyline: {
                  positions: [towerCartesian, ambCartesian],
                  width: 1.5,
                  material: new window.Cesium.PolylineDashMaterialProperty({
                    color: window.Cesium.Color.fromCssColorString('#22D3EE'),
                    dashLength: 16.0
                  })
                }
              });
            }
          });
        }

        // Camera lock-on
        if (followMode && (a.id === activeAmbulanceId || (!activeAmbulanceId && a.id === 'A-102'))) {
          viewer.camera.setView({
            destination: window.Cesium.Cartesian3.fromDegrees(lng, lat, 1200),
            orientation: {
              heading: viewer.camera.heading,
              pitch: viewer.camera.pitch,
              roll: viewer.camera.roll
            }
          });
        }
      });
    }

    // 7. Render simulated dynamic vehicles
    if (gisLayers.traffic && detectedVehicles.length > 0) {
      detectedVehicles.forEach(v => {
        viewer.entities.add({
          id: `vehicle-${v.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(v.lng, v.lat, 4),
          billboard: {
            image: createSvgVehicleIcon(v.type),
            width: 14,
            height: 14
          },
          label: {
            text: v.id,
            font: '7.5px monospace',
            fillColor: window.Cesium.Color.WHITE,
            show: v.id === activeVehicleId,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -12)
          }
        });
      });
    }

    // 8. Render Incident / Accident Zones (if toggled)
    if (gisLayers.construction || gisLayers.floodZones) {
      const accidentHotspots = [
        { id: 'AC-1', name: 'Jaydev Vihar flyover merge', lat: 20.2985, lng: 85.8242 },
        { id: 'AC-2', name: 'Khandagiri intersection curve', lat: 20.2612, lng: 85.7872 }
      ];

      accidentHotspots.forEach(ac => {
        viewer.entities.add({
          id: `accident-${ac.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(ac.lng, ac.lat, 0),
          billboard: {
            image: createSvgAccidentIcon(),
            width: 28,
            height: 28,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: '🚨 ACCIDENT ZONE',
            font: 'bold 8px sans-serif',
            fillColor: window.Cesium.Color.fromCssColorString('#EF4444'),
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -20)
          }
        });
      });
    }

  }, [
    junctions,
    roads,
    hospitals,
    ambulances,
    gisLayers,
    activeJunctionId,
    activeAmbulanceId,
    detectedVehicles,
    selectedCameraId,
    selectedTowerId,
    isReplayMode,
    currentReplayFrame,
    gNetworkActive,
    followMode
  ]);

  // ---------------------------------------------------------------------------
  // GIS TOOLBAR EVENT HANDLERS
  // ---------------------------------------------------------------------------
  const handleMapZoomIn = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * 0.25);
    }
  };

  const handleMapZoomOut = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * 0.25);
    }
  };

  const handleMapReset = () => {
    if (viewerRef.current) {
      viewerRef.current.scene.camera.setView({
        destination: window.Cesium.Cartesian3.fromDegrees(85.8245, 20.2850, 8500),
        orientation: {
          heading: window.Cesium.Math.toRadians(0),
          pitch: window.Cesium.Math.toRadians(-50),
          roll: 0.0
        }
      });
    }
    pushMapEvent('Recentered Digital Twin command view', 'system');
  };

  const handleResetNorth = () => {
    if (viewerRef.current) {
      const camera = viewerRef.current.camera;
      viewerRef.current.scene.camera.setView({
        destination: camera.position,
        orientation: {
          heading: window.Cesium.Math.toRadians(0),
          pitch: camera.pitch,
          roll: 0.0
        }
      });
      pushMapEvent('Compass reset: Camera oriented to absolute North');
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setFullscreenActive(true)).catch(err => console.log(err));
    } else {
      document.exitFullscreen().then(() => setFullscreenActive(false));
    }
  };

  const handleLayerPreset = async (preset: 'satellite' | 'street' | 'terrain') => {
    if (!viewerRef.current) return;
    
    if (preset === 'satellite') {
      setGisLayers(prev => ({ ...prev, satellite: true, terrain: false }));
      viewerRef.current.imageryLayers.removeAll();
      try {
        const provider = await window.Cesium.IonImageryProvider.fromAssetId(2); // Bing Maps Aerial
        const layer = await window.Cesium.ImageryLayer.fromProviderAsync(provider);
        viewerRef.current.imageryLayers.add(layer);
        pushMapEvent('Switched base layer to high-resolution Satellite Imagery');
      } catch (err) {
        console.warn("Failed to load satellite imagery layer, falling back to Dark Grid: ", err);
        await handleLayerPreset('street');
      }
    } else if (preset === 'street') {
      setGisLayers(prev => ({ ...prev, satellite: false, terrain: false }));
      viewerRef.current.imageryLayers.removeAll();
      try {
        const provider = new window.Cesium.UrlTemplateImageryProvider({
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          subdomains: ['a', 'b', 'c', 'd']
        });
        viewerRef.current.imageryLayers.addImageryProvider(provider);
        pushMapEvent('Switched base layer to Dark command-center grid');
      } catch (err) {
        console.warn("Failed to load Dark Grid imagery: ", err);
      }
    } else if (preset === 'terrain') {
      const isTerrainActive = !gisLayers.terrain;
      setGisLayers(prev => ({ ...prev, terrain: isTerrainActive }));
      try {
        viewerRef.current.terrainProvider = isTerrainActive 
          ? await window.Cesium.createWorldTerrainAsync() 
          : new window.Cesium.EllipsoidTerrainProvider();
        pushMapEvent(`Terrain elevation grid: ${isTerrainActive ? 'ACTIVE' : 'OFF'}`);
      } catch (err) {
        console.warn("Failed to toggle terrain layer: ", err);
        viewerRef.current.terrainProvider = new window.Cesium.EllipsoidTerrainProvider();
      }
    }
  };

  // Filtered Layer Swapper
  const filteredLayerKeys = useMemo(() => {
    return Object.keys(gisLayers).filter(key => {
      const matchesSearch = key.toLowerCase().includes(layerSearch.toLowerCase());
      if (layerCategory === 'ALL') return matchesSearch;
      return matchesSearch && getLayerCategory(key) === layerCategory;
    });
  }, [gisLayers, layerSearch, layerCategory]);

  const selectedJunction = junctions.find(j => j.id === activeJunctionId);
  const selectedAmbulance = ambulances.find(a => a.id === activeAmbulanceId);
  const selectedCamera = camerasList.find(c => c.id === selectedCameraId);
  const selectedTower = TOWER_STATIONS.find(t => t.id === selectedTowerId);

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-2xl border border-[#1F242E] bg-[#05070a] overflow-hidden select-none shadow-2xl flex flex-col font-sans">
      
      {/* 3D Map Viewport Container */}
      <div ref={mapRef} className="flex-1 w-full h-full z-10" />

      {/* 1. TOP LEFT: DYNAMIC EVENT LOGGER */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none max-w-sm">
        {mapEvents.map(ev => (
          <div key={ev.id} className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-[#090C12]/95 border border-[#1E293B] rounded-lg shadow-xl backdrop-blur-md animate-slide-in duration-300">
            <span className={`h-1.5 w-1.5 rounded-full ${
              ev.type === 'success' ? 'bg-emerald-400' :
              ev.type === 'corridor' ? 'bg-[#D9EF92]' : 'bg-cyan-400'
            }`} />
            <span className="text-[10px] font-mono font-medium text-slate-300 uppercase leading-none">{ev.msg}</span>
          </div>
        ))}
      </div>

      {/* 2. GIS INSTRUMENTS TOOLBAR (TOP PANEL CENTER) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1.5 bg-[#070b10]/95 border border-[#1e2736] p-1.5 rounded-xl shadow-2xl backdrop-blur-md select-none">
        
        <button
          onClick={handleMapReset}
          className="p-2 rounded-lg bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
          title="Return View Home"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={handleMapZoomIn}
          className="p-2 rounded-lg bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={handleMapZoomOut}
          className="p-2 rounded-lg bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetNorth}
          className="p-2 rounded-lg bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
          title="Orient to Absolute North"
        >
          <Compass className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Dynamic Basemap toggles */}
        <button
          onClick={() => handleLayerPreset('street')}
          className={`p-2 rounded-lg text-xs font-mono font-bold tracking-wide flex items-center gap-1 border border-white/[0.02] cursor-pointer transition-all ${
            !gisLayers.satellite ? 'bg-[#D9EF92] text-black font-extrabold' : 'bg-[#131d2a] text-slate-400 hover:text-white'
          }`}
          title="Vector Grid Basemap"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>STREET</span>
        </button>

        <button
          onClick={() => handleLayerPreset('satellite')}
          className={`p-2 rounded-lg text-xs font-mono font-bold tracking-wide flex items-center gap-1 border border-white/[0.02] cursor-pointer transition-all ${
            gisLayers.satellite ? 'bg-[#D9EF92] text-black font-extrabold' : 'bg-[#131d2a] text-slate-400 hover:text-white'
          }`}
          title="High-res Satellite Basemap"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>SAT</span>
        </button>

        <button
          onClick={() => handleLayerPreset('terrain')}
          className={`p-2 rounded-lg text-xs font-mono font-bold tracking-wide flex items-center gap-1 border border-white/[0.02] cursor-pointer transition-all ${
            gisLayers.terrain ? 'bg-[#D9EF92] text-black font-extrabold' : 'bg-[#131d2a] text-slate-400 hover:text-white'
          }`}
          title="Toggle Elevation Terrain model"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>TERRAIN</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
          title="Toggle Fullscreen"
        >
          {fullscreenActive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

      </div>

      {/* 3. FLOATING LAYER MANAGER PANEL (TOP RIGHT) */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex flex-col gap-3 bg-[#070b10]/95 border border-[#1e2736] p-4 rounded-xl shadow-2xl backdrop-blur-md w-72 text-left select-none max-h-[460px] overflow-hidden">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-sans font-bold text-white uppercase tracking-wider">Layer Controller</span>
          </div>
          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase">GIS layers</span>
        </div>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
            <Search className="w-3 h-3" />
          </span>
          <input
            type="text"
            value={layerSearch}
            onChange={e => setLayerSearch(e.target.value)}
            placeholder="Search city layers..."
            className="w-full pl-7 pr-3 py-1 rounded bg-black/60 border border-slate-850 text-slate-300 font-mono text-[9px] focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Categories filters */}
        <div className="flex bg-black/40 border border-slate-850 p-0.5 rounded-lg gap-0.5">
          {(['ALL', 'INFRA', 'EMERGENCY', 'METRICS'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setLayerCategory(cat)}
              className={`flex-1 text-[8.5px] font-mono py-1 rounded-md font-bold tracking-wide transition-all uppercase cursor-pointer text-center ${
                layerCategory === cat ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List of layers */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 select-none custom-scrollbars">
          {filteredLayerKeys.map(key => (
            <div key={key} className="flex flex-col gap-1 py-1 border-b border-slate-900 last:border-0">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-slate-300 hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={gisLayers[key]}
                    onChange={() => toggleGisLayer(key)}
                    className="h-3 w-3 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-transparent focus:ring-offset-transparent cursor-pointer"
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
                <span className="text-[7.5px] font-mono text-slate-600 tracking-wider">
                  {getLayerCategory(key)}
                </span>
              </div>
              
              {/* Opacity slider */}
              {gisLayers[key] && (
                <div className="flex items-center gap-2 pl-5">
                  <span className="text-[7.5px] font-mono text-slate-500">Opacity:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={layerOpacities[key]}
                    onChange={e => handleOpacityChange(key, parseFloat(e.target.value))}
                    className="flex-1 h-0.5 rounded bg-slate-800 appearance-none cursor-pointer accent-cyan-500 outline-none"
                  />
                  <span className="text-[7.5px] font-mono text-slate-500 w-5 text-right">
                    {Math.round(layerOpacities[key] * 100)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* 4. COORD PICKER STATUS DISPLAY (BOTTOM LEFT FOOTER) */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center bg-[#070b10]/95 border border-[#1e2736] px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md text-left select-none font-mono text-[9.5px] text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mr-2 animate-pulse" />
        <span>{coordinateString}</span>
      </div>

      {/* 5. INTERACTIVE QUERY HUD: BUILDING AND ROAD POPUPS (BOTTOM CENTER) */}
      {(queryBuilding || queryRoad) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto bg-[#070b10]/98 border border-[#1e2736] p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-sm w-full flex flex-col gap-3 text-left font-sans text-xs">
          
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              <strong className="text-white font-bold uppercase tracking-tight">
                {queryBuilding ? '3D Building Query' : 'Spatial Road Query'}
              </strong>
            </div>
            <button
              onClick={() => {
                setQueryBuilding(null);
                setQueryRoad(null);
              }}
              className="text-[9.5px] font-mono text-slate-500 hover:text-white cursor-pointer"
            >
              ✕ CLOSE
            </button>
          </div>

          {queryBuilding && (
            <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-300">
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Identity:</span>
                <strong className="text-white">{queryBuilding.name}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Building Class:</span>
                <strong className="text-cyan-400">{queryBuilding.type}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">LOD Height:</span>
                <strong className="text-white">{queryBuilding.height}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Administrative Ward:</span>
                <strong className="text-white">{queryBuilding.ward}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location Points:</span>
                <strong className="text-[#D9EF92]">{queryBuilding.coordinates}</strong>
              </div>
            </div>
          )}

          {queryRoad && (
            <div className="flex flex-col gap-2 font-mono text-[10px] text-slate-300">
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Identity:</span>
                <strong className="text-white">{queryRoad.name}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Congestion:</span>
                <strong className={`capitalize ${
                  queryRoad.congestion === 'critical' ? 'text-red-500' :
                  queryRoad.congestion === 'heavy' ? 'text-orange-500' :
                  queryRoad.congestion === 'moderate' ? 'text-amber-500' : 'text-emerald-400'
                }`}>{queryRoad.congestion}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Avg Speed:</span>
                <strong className="text-white">{queryRoad.avgSpeed}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Vehicle Count:</span>
                <strong className="text-white">{queryRoad.vehicleCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">V2X Accessibility:</span>
                <strong className="text-[#D9EF92]">{queryRoad.accessibility}</strong>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. FLOATING OPERATIONS & DIARY SIDEBAR (RIGHT SIDE) */}
      <div 
        className={`absolute top-0 right-0 h-full w-85 bg-[#070b10]/98 border-l border-[#1e2736] z-25 shadow-3xl transform transition-transform duration-300 ease-in-out pointer-events-auto flex flex-col text-left ${
          (selectedAmbulance || isReplayMode) ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-[#222F3A] flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-[#D9EF92]" />
            <div className="flex flex-col">
              <h3 className="font-sans font-bold text-xs text-white uppercase tracking-tight">
                {isReplayMode ? 'Ambulance Alpha-102' : (selectedAmbulance?.name || 'V2X INCIDENT RESPONDER')}
              </h3>
              <span className="text-[8px] font-mono text-sky-400 font-bold tracking-widest uppercase">
                {isReplayMode ? 'REPLAY MISSION ANALYSIS' : 'SECURED TELEMETRY STREAM'}
              </span>
            </div>
          </div>
          <button
            onClick={() => onSelectAmbulance(null)}
            className="text-[10px] font-mono text-slate-400 hover:text-white transition-colors uppercase border border-slate-850 px-2 py-0.5 rounded cursor-pointer"
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5 custom-scrollbars">
          <div className="bg-[#0b1016] border border-[#1e2736] p-3.5 rounded-xl flex flex-col gap-2 relative">
            <span className="text-[8px] font-mono text-[#D9EF92] border border-[#D9EF92]/20 bg-[#D9EF92]/5 px-1.5 py-0.5 rounded cursor-default uppercase font-bold tracking-wider absolute top-3 right-3 select-none">
              CRITICAL
            </span>
            <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">MISSION STATUS</span>
            <strong className="text-sm font-sans font-extrabold text-white uppercase leading-none tracking-tight">CORRIDOR WAVE ACTIVE</strong>
            
            <div className="h-px bg-slate-800 my-1" />

            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-300">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 text-[8px] uppercase">Telemetry Speed</span>
                <strong className="text-[#D9EF92] text-xs">
                  {isReplayMode && currentReplayFrame ? Math.round(currentReplayFrame.speed) : Math.round(selectedAmbulance?.speed || 88)} KM/H
                </strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 text-[8px] uppercase">Estimated ETA</span>
                <strong className="text-white text-xs">
                  {isReplayMode ? '1m 24s' : `${Math.floor((selectedAmbulance?.etaToHospital || 180) / 60)}m ${Math.floor((selectedAmbulance?.etaToHospital || 180) % 60)}s`}
                </strong>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="text-slate-500 text-[8px] uppercase">Destination Point</span>
                <strong className="text-white text-xs font-semibold truncate uppercase">
                  {isReplayMode ? 'Apollo Hospital Trauma Hub' : (selectedAmbulance?.route[selectedAmbulance.route.length - 1] || 'CAPITAL HOSPITAL')}
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-[#1e2736] rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">PATIENT CLINICAL VITALS</span>
              <PulseIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>

            <div className="relative h-12 bg-[#020509] rounded-lg border border-slate-900 overflow-hidden flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30" className="w-full h-full text-emerald-500 stroke-current opacity-85" fill="none" strokeWidth={1.5}>
                <path d="M0,15 L10,15 L15,10 L18,22 L22,4 L26,15 L40,15 L45,15 L50,15 L55,10 L58,22 L62,4 L66,15 L80,15 L100,15" className="animate-pulse" />
              </svg>
              <div className="absolute top-2 right-2 font-mono text-[9px] text-emerald-400 font-bold">HR: 84 BPM</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400">
              <span className="flex items-center gap-1 font-semibold uppercase">
                <span className="h-1 w-1 bg-[#22C55E] rounded-full" />
                Blood Ox: <span className="text-white font-bold ml-auto">98.5%</span>
              </span>
              <span className="flex items-center gap-1 font-semibold uppercase">
                <span className="h-1 w-1 bg-[#3B82F6] rounded-full" />
                Oxygen Tank: <span className="text-white font-bold ml-auto">12 BAR</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">OPERATIONS DIARY LOG</span>
            <div className="flex flex-col gap-3 pl-1 border-l border-[#1e2736] ml-2">
              {[
                { stage: 'Proximity Dispatch', time: '11:42:01', done: true, desc: 'GPS registers dispatch exit from base station.' },
                { stage: '5G Slice secured', time: '11:42:15', done: true, desc: 'Beamforming slice channel locked to path route.' },
                { stage: 'Green Wave Overrides', time: '11:43:08', done: isReplayMode ? replayProgress > 30 : true, desc: 'Signal pre-emption triggers clearings sequentially.' },
                { stage: 'Docking hospital bay', time: 'ETA 1m', done: isReplayMode ? replayProgress >= 99 : false, desc: 'Alerted trauma unit physicians of imminent arrival.' }
              ].map((step, sIdx) => (
                <div key={sIdx} className="relative flex flex-col gap-1 pl-4">
                  <span className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full border border-slate-900 transition-colors ${
                    step.done ? 'bg-[#D9EF92]' : 'bg-[#1e2736]'
                  }`} />
                  <div className="flex items-center justify-between text-[11px] font-sans font-bold text-white uppercase leading-none">
                    <span>{step.stage}</span>
                    <span className="text-[9px] font-mono text-slate-500 font-normal">{step.time}</span>
                  </div>
                  <p className="text-[9.5px] text-gray-400 leading-normal">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-[#1e2736]">
            <button
              onClick={() => pushMapEvent(`FORCED SIREN OVERRIDE EMITTED FOR RESPONDER`, 'alert')}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black rounded font-mono text-[9.5px] font-extrabold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 shadow"
            >
              <Volume2 className="w-4 h-4" />
              <span>FORCE SIREN BYPASS</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
