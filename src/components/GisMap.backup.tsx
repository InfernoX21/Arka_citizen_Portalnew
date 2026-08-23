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
  Activity as PulseIcon 
} from 'lucide-react';
import { Junction, RoadSegment, Hospital, Ambulance, DigitalTwinVehicle } from '../types';

declare global {
  interface Window {
    Cesium: any;
  }
}

// Mock additional V2X infrastructure types
interface Tower5G {
  id: string;
  name: string;
  lat: number;
  lng: number;
  signalStrength: number; // 0-100
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
  defaultReplayMode?: boolean;
}

// Inline SVG Data-URL generators for dynamic Cesium billboards
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
  let color = '#3B82F6'; // Car
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
  layers,
  setLayers,
  onOpenFeed,
  simulationTicking,
  detectedVehicles = [],
  activeVehicleId = null,
  onSelectVehicle = () => {},
  defaultReplayMode
}: GisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // Operational State
  const [followMode, setFollowMode] = useState<boolean>(true);
  const [gNetworkActive, setGNetworkActive] = useState<boolean>(true);
  const [legendOpen, setLegendOpen] = useState<boolean>(true);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeCalcProgress, setRouteCalcProgress] = useState<number>(1.0);
  const prevActiveAmbulanceId = useRef<string | null>(null);

  // Floating notifications overlay list
  const [mapEvents, setMapEvents] = useState<Array<{ id: string; msg: string; type: string }>>([
    { id: 'ev1', msg: 'ARKA Sentinel 3D Twin Core Active', type: 'system' }
  ]);

  // Playback Replay State
  const [isReplayMode, setIsReplayMode] = useState<boolean>(defaultReplayMode || false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [replayProgress, setReplayProgress] = useState<number>(45);
  const [replayPlaying, setReplayPlaying] = useState<boolean>(false);
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectedMissionTitle = "Emergency Operations Wave: Jaydev Vihar ➔ Apollo Hospital";

  // Replay Frames
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

  // Replay timeline clock ticker
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
  // INITIALIZE CESIUM VIEWER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;
    if (viewerRef.current) return;

    if (typeof window.Cesium === 'undefined') {
      console.warn("Cesium is not loaded from CDN.");
      return;
    }

    // Set fallback token to avoid popup warnings
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
      // Load dark-themed map layer template
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

    // Center view on Bhubaneswar city bounds with tilt perspective
    viewer.scene.camera.setView({
      destination: window.Cesium.Cartesian3.fromDegrees(85.8245, 20.2850, 8500),
      orientation: {
        heading: window.Cesium.Math.toRadians(0),
        pitch: window.Cesium.Math.toRadians(-50),
        roll: 0.0
      }
    });

    // Pick selection click handler
    const handler = new window.Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);
      if (window.Cesium.defined(picked) && picked.id) {
        const entityId: string = picked.id.id;
        
        if (entityId.startsWith('junc-')) {
          const jId = entityId.replace('junc-', '');
          onSelectJunction(jId);
          setSelectedCameraId(null);
          setSelectedTowerId(null);
          pushMapEvent(`Selected signal node intersection: ${jId}`, 'system');
        } else if (entityId.startsWith('cam-')) {
          const cId = entityId.replace('cam-', '');
          setSelectedCameraId(cId);
          onSelectJunction(null);
          setSelectedTowerId(null);
          pushMapEvent(`Selected camera CCTV node: ${cId}`, 'system');
        } else if (entityId.startsWith('tower-')) {
          const tId = entityId.replace('tower-', '');
          setSelectedTowerId(tId);
          onSelectJunction(null);
          setSelectedCameraId(null);
          pushMapEvent(`Selected 5G hypercell V2X antenna: ${tId}`, 'system');
        } else if (entityId.startsWith('amb-')) {
          const aId = entityId.replace('amb-', '');
          onSelectAmbulance(aId);
          pushMapEvent(`Focused on responder asset: ${aId}`, 'corridor');
        }
      } else {
        onSelectJunction(null);
        setSelectedCameraId(null);
        setSelectedTowerId(null);
      }
    }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // UPDATE AND RE-RENDER CESIUM ENTITIES ON STATE/LAYERS CHANGES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear all previously rendered entities to draw a synchronized fresh frame
    viewer.entities.removeAll();

    const activeAmb = isReplayMode 
      ? { id: 'A-102', status: 'Green Corridor Active', route: ['JV', 'AV', 'APOLLO'] }
      : ambulances.find(a => a.status === 'Green Corridor Active');

    // 1. RENDER 5G TOWERS & COVERAGE (Always rendered if active or sliced)
    if (gNetworkActive) {
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

    // 2. RENDER ROADS & 3D ELEVATED FLYOVERS (if corridors/roads layers are true)
    if (layers.corridors || layers.density) {
      roads.forEach(road => {
        const fromNode = junctions.find(j => j.id === road.fromNode) || hospitals.find(h => h.id === road.fromNode);
        const toNode = junctions.find(j => j.id === road.toNode) || hospitals.find(h => h.id === road.toNode);

        if (fromNode && toNode) {
          const isFlyover = !!road.isFlyover;
          const roadHeight = isFlyover ? 25 : 0; // elevated by 25 meters!

          // Identify color coded status
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

    // 3. RENDER HOSPITALS (if toggled)
    if (layers.hospitals) {
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

    // 4. RENDER CAMERAS (if toggled)
    if (layers.cameras) {
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

    // 5. RENDER INTERSECTIONS / SIGNALS (if toggled)
    if (layers.signals) {
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

    // 6. RENDER AMBULANCES (if toggled)
    if (layers.ambulances) {
      ambulances.forEach(a => {
        let lat = a.currentPosition.lat;
        let lng = a.currentPosition.lng;

        if (isReplayMode && currentReplayFrame && a.id === 'A-102') {
          lat = currentReplayFrame.lat;
          lng = currentReplayFrame.lng;
        }

        const isCorridorActive = a.status === 'Green Corridor Active';

        viewer.entities.add({
          id: `amb-${a.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(lng, lat, 6),
          billboard: {
            image: createSvgAmbulanceIcon(isCorridorActive),
            width: isCorridorActive ? 34 : 28,
            height: isCorridorActive ? 34 : 28
          },
          label: {
            text: isCorridorActive ? `🚑 ${a.name} [V2X LOCKED]` : a.name,
            font: 'bold 9px monospace',
            fillColor: isCorridorActive ? window.Cesium.Color.fromCssColorString('#D9EF92') : window.Cesium.Color.WHITE,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, -20)
          }
        });

        // Cinematic follow active corridor vehicle
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

    // 7. RENDER SIMULATED DETECTED VEHICLES
    if (detectedVehicles.length > 0) {
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

    // 8. RENDER INCIDENT / ACCIDENT ZONES (if toggled)
    if (layers.accidents) {
      // Mock historical accident coordinates in Bhubaneswar
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

    // 9. RENDER CONSTRUCTION ZONES (if toggled)
    if (layers.constructions) {
      const constructions = [
        { id: 'C-1', name: 'Metro Pillar constr at Vani Vihar', lat: 20.2882, lng: 85.8430 }
      ];

      constructions.forEach(c => {
        viewer.entities.add({
          id: `construction-${c.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(c.lng, c.lat, 0),
          billboard: {
            image: createSvgConstructionIcon(),
            width: 28,
            height: 28,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: '🚧 ROAD CONSTRUCTION',
            font: 'bold 8px sans-serif',
            fillColor: window.Cesium.Color.fromCssColorString('#F59E0B'),
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
    layers,
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

  // Selectors
  const selectedJunction = junctions.find(j => j.id === activeJunctionId);
  const selectedAmbulance = ambulances.find(a => a.id === activeAmbulanceId);
  const selectedCamera = camerasList.find(c => c.id === selectedCameraId);
  const selectedTower = TOWER_STATIONS.find(t => t.id === selectedTowerId);

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-2xl border border-[#1F242E] bg-[#05070a] overflow-hidden select-none shadow-2xl flex flex-col font-sans">
      
      {/* Dynamic Cesium Map Canvas Container */}
      <div ref={mapRef} className="flex-1 w-full h-full z-10" />

      {/* -----------------------------------------------------------------------
          [LEFT TOP HUD] REAL-TIME ARKA NOTIFICATIONS FEED
          ----------------------------------------------------------------------- */}
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

      {/* -----------------------------------------------------------------------
          [RIGHT TOP HUD] OPERATIONAL FLOATING INSTRUMENTS ZOOM CONTROL & STATE
          ----------------------------------------------------------------------- */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-3 pointer-events-none">
        
        {/* Core Zoom controls */}
        <div className="flex flex-col border border-[#1e2736] bg-[#070b10]/95 p-1.5 rounded-lg backdrop-blur-md gap-1 pointer-events-auto shadow-2xl">
          <button
            onClick={handleMapZoomIn}
            className="w-8 h-8 rounded bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleMapZoomOut}
            className="w-8 h-8 rounded bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleMapReset}
            className="w-8 h-8 rounded bg-[#131d2a] hover:bg-[#D9EF92] text-slate-400 hover:text-black hover:scale-105 border border-white/[0.02] flex items-center justify-center transition-all cursor-pointer"
            title="Recenter"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Global toggles: V2X Slices and Cinematic lock */}
        <div className="flex flex-col border border-[#1e2736] bg-[#070b10]/98 p-2.5 rounded-xl backdrop-blur-md gap-2 pointer-events-auto shadow-2xl w-44">
          <div className="text-[8.5px] font-bold font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>OPERATIONS MATRIX</span>
          </div>
          
          <button
            onClick={() => {
              setFollowMode(!followMode);
              pushMapEvent(`Cinematic follow mode ${!followMode ? 'Engaged' : 'Suspended'}`);
            }}
            className={`flex items-center justify-between w-full p-1.5 rounded-lg text-[9px] font-mono tracking-wide transition-all border ${
              followMode 
                ? 'bg-[#D9EF92]/10 text-[#D9EF92] border-[#D9EF92]/20' 
                : 'bg-black/20 text-slate-500 border-slate-800'
            }`}
          >
            <span>CAMERA FOLLOW</span>
            <span className={`h-1.5 w-1.5 rounded-full ${followMode ? 'bg-[#D9EF92]' : 'bg-slate-700'}`} />
          </button>

          <button
            onClick={() => {
              setGNetworkActive(!gNetworkActive);
              pushMapEvent(`5G Slice network ${!gNetworkActive ? 'Routed' : 'Offline'}`);
            }}
            className={`flex items-center justify-between w-full p-1.5 rounded-lg text-[9px] font-mono tracking-wide transition-all border ${
              gNetworkActive 
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                : 'bg-black/20 text-slate-500 border-slate-800'
            }`}
          >
            <span>5G V2X SLICE</span>
            <span className={`h-1.5 w-1.5 rounded-full ${gNetworkActive ? 'bg-cyan-400' : 'bg-slate-700'}`} />
          </button>
        </div>

        {/* --- DYNAMIC COLLAPSIBLE MAP LEGEND OVERLAY --- */}
        <div className="flex flex-col border border-[#1e2736] bg-[#070b10]/98 p-3 rounded-xl backdrop-blur-md gap-2 pointer-events-auto shadow-2xl w-44 transition-all duration-300">
          <button 
            onClick={() => setLegendOpen(!legendOpen)}
            className="text-[8.5px] font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center justify-between w-full cursor-pointer focus:outline-none"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span className="h-2 w-2 rounded-full bg-[#D9EF92]" />
              <span>MAP LEGEND</span>
            </div>
            <span className="text-[7.5px] text-slate-500 font-bold font-mono">
              {legendOpen ? '▼' : '▲'}
            </span>
          </button>

          {legendOpen && (
            <div className="flex flex-col gap-2 pt-1.5 border-t border-slate-900 text-[8.5px] font-mono leading-none">
              
              <div className="flex flex-col gap-1.5 pb-2 border-b border-white/[0.04]">
                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Road Network</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-7 rounded-sm bg-[#3B82F6]" />
                  <span className="text-white">Major City Roads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-7 rounded-sm border border-[#4B5563] bg-[#1F2937]" />
                  <span className="text-white">Elevated Flyover</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pb-2 border-b border-white/[0.04]">
                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Signals & V2X</span>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                  <span className="text-white">Nominal Green</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
                  <span className="text-white">Red / Override</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Assets</span>
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 bg-red-600/20 border border-red-500/30 text-red-500 flex items-center justify-center font-bold text-[7px] rounded">H</span>
                  <span className="text-white">Hospital</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-purple-400">📷</span>
                  <span className="text-white">CCTV Edge Cam</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#00ECFF]">🗼</span>
                  <span className="text-white">5G V2X Tower</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          [FLOATING CONTROLLER OVERLAYS] INTERNAL CANVASES & DETAILS PANEL HUD
          ----------------------------------------------------------------------- */}
      <div className="absolute inset-x-4 bottom-4 z-20 pointer-events-none flex flex-col gap-4 justify-end">
        
        {/* Real-time Ambulance Mission & ETA Countdown Dashboard */}
        {(() => {
          const activeRescueAmb = ambulances.find(a => a.status === 'Green Corridor Active' || a.status === 'En Route');
          const destHospital = activeRescueAmb ? hospitals.find(h => h.id === activeRescueAmb.route[activeRescueAmb.route.length - 1]) : null;
          
          if (!activeRescueAmb || !destHospital) return null;
          
          return (
            <div className="pointer-events-auto self-start bg-[#080d15]/95 border border-red-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-sm w-full text-left flex flex-col gap-3 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🚑</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-bold tracking-widest text-red-400 uppercase">ACTIVE TRANSIT CORRIDOR</span>
                    <strong className="text-xs font-sans text-white font-extrabold">{activeRescueAmb.name} ({activeRescueAmb.id})</strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-[9px] font-mono text-red-400 rounded-sm uppercase tracking-wide font-bold animate-pulse">
                  Critical Trauma
                </span>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="flex items-center gap-2.5 bg-black/40 p-2 border border-white/[0.04] rounded-lg">
                <span className="text-lg">🏥</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block leading-none">Receiving Trauma Hub</span>
                  <strong className="text-[11px] font-sans text-white font-bold truncate block">{destHospital.name}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-black/30 p-2 border border-white/[0.03] rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">ETA Countdown</span>
                  <strong className="text-[#D9EF92] text-sm font-bold font-mono mt-0.5">
                    {Math.floor(activeRescueAmb.etaToHospital / 60)}m {activeRescueAmb.etaToHospital % 60}s
                  </strong>
                </div>
                <div className="bg-black/30 p-2 border border-white/[0.03] rounded-lg flex flex-col justify-center">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">Current Velocity</span>
                  <strong className="text-white text-sm font-bold font-mono mt-0.5">
                    {Math.round(activeRescueAmb.speed || 68)} KM/H
                  </strong>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Progress: {Math.round(activeRescueAmb.progress * 100)}%</span>
                  <span>5G-Slice Pre-emption Locked</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-[#D9EF92] transition-colors duration-300"
                    style={{ width: `${activeRescueAmb.progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dynamic Multi-Inspector Layer */}
        <div className="flex flex-row flex-wrap items-end justify-between gap-4">
          
          {/* Dynamic Popup HUD */}
          {(selectedJunction || selectedCamera || selectedTower) && (
            <div className="pointer-events-auto bg-[#070b10]/95 border border-[#1e2736] p-4 rounded-xl backdrop-blur-md shadow-2xl max-w-sm w-full md:w-85 flex flex-col gap-3 relative text-left">
              <button
                onClick={() => {
                  onSelectJunction(null);
                  setSelectedCameraId(null);
                  setSelectedTowerId(null);
                }}
                className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-[10px] font-mono tracking-widest"
              >
                ✕ CLOSE
              </button>

              {/* CAMERA INTERACTIVE OVERLAY */}
              {selectedCamera && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4.5 h-4.5 text-amber-400" />
                    <div className="flex flex-col">
                      <h4 className="font-sans font-bold text-xs text-white uppercase tracking-tight">{selectedCamera.name}</h4>
                      <span className="text-[7.5px] font-mono text-emerald-400 font-semibold tracking-wider">CCTV EDGE STREAM ON</span>
                    </div>
                  </div>

                  <div className="relative h-44 rounded-lg bg-black border border-slate-900 overflow-hidden flex items-center justify-center uppercase font-mono text-[9px]">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none animate-pulse" />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-red-400 font-bold tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                      LIVE FEED
                    </div>
                    
                    <div className="absolute border border-amber-500/70 p-1 flex flex-col rounded text-[7px] text-amber-400 justify-between bg-amber-500/5" style={{ top: '25%', left: '15%', width: '38px', height: '24px' }}>
                      <span>CAR 98%</span>
                    </div>
                    <div className="absolute border border-emerald-400/80 p-1 flex flex-col rounded text-[7px] text-emerald-400 justify-between bg-emerald-500/5 border-dashed" style={{ top: '40%', right: '20%', width: '42px', height: '28px' }}>
                      <span>CAB 91%</span>
                    </div>

                    {(activeAmbulanceId || isReplayMode) && (
                      <div className="absolute border-2 border-[#D9EF92] p-1 flex flex-col rounded text-[8px] text-[#D9EF92] font-semibold justify-between bg-[#D9EF92]/10 animate-pulse" style={{ bottom: '15%', left: '38%', width: '74px', height: '42px' }}>
                        <span>AMB LOCKED</span>
                        <span className="text-[6.5px]">CONF: 99.8%</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-900">
                    <div>RESOLUTION: <span className="text-white">1080P ARC</span></div>
                    <div>FPS RATE: <span className="text-white">30 FPS</span></div>
                    <div>CARS LOGGED: <span className="text-white">{selectedCamera.vehiclesDetected} UNITS</span></div>
                    <div>LATENCY: <span className="text-emerald-400">1.2 MS (5G)</span></div>
                  </div>
                </div>
              )}

              {/* 5G TOWER OVERLAY */}
              {selectedTower && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
                    <div className="flex flex-col">
                      <h4 className="font-sans font-bold text-xs text-white uppercase tracking-tight">{selectedTower.name}</h4>
                      <span className="text-[7.5px] font-mono text-cyan-400 font-semibold tracking-wider">V2X BEAM STREAM LOCKED</span>
                    </div>
                  </div>

                  <div className="h-px bg-[#1F242E]" />

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9.5px] font-mono text-slate-400">
                    <span>Power Output:</span>
                    <span className="text-white text-right">45 dBm</span>
                    <span>Slicing ID:</span>
                    <span className="text-[#D9EF92] text-right font-bold">Slice #4</span>
                    <span>Ping Latency:</span>
                    <span className="text-emerald-400 text-right">0.8 ms</span>
                    <span>Tower Status:</span>
                    <span className="text-cyan-400 text-right font-bold uppercase">{selectedTower.status}</span>
                  </div>
                </div>
              )}

              {/* JUNCTION OVERLAY */}
              {selectedJunction && !selectedCamera && (() => {
                const fId = selectedJunction.id;
                const connectedSigs = roads
                  .filter(r => r.fromNode === fId || r.toNode === fId)
                  .map(r => r.fromNode === fId ? r.toNode : r.fromNode)
                  .filter(id => id !== fId && junctions.some(jn => jn.id === id));
                const connectedSigsStr = connectedSigs.length > 0 ? connectedSigs.join(', ') : 'None';

                let nearestH = hospitals[0];
                let minD = Infinity;
                hospitals.forEach(h => {
                  const dist = Math.hypot(h.lat - selectedJunction.lat, h.lng - selectedJunction.lng);
                  if (dist < minD) {
                    minD = dist;
                    nearestH = h;
                  }
                });

                const activeAmbulance = ambulances.find(a => a.status === 'Green Corridor Active' || a.status === 'En Route');
                let emergencyStatusText = '🟢 SYNCHRONIZED';
                let isEmergencyWaveOn = false;
                if (activeAmbulance) {
                  const pathIdx = activeAmbulance.route.indexOf(fId);
                  const currIdx = activeAmbulance.routeIndex;
                  if (pathIdx !== -1) {
                    if (pathIdx === currIdx) {
                      emergencyStatusText = '🚑 CORRIDOR LOCK ACTIVE';
                      isEmergencyWaveOn = true;
                    } else if (pathIdx === currIdx + 1) {
                      emergencyStatusText = '⚡ PRE-EMPTIVE WAVE DRAIN';
                      isEmergencyWaveOn = true;
                    } else if (pathIdx > currIdx) {
                      emergencyStatusText = '🟡 COORD SLICE TUNNELED';
                      isEmergencyWaveOn = true;
                    }
                  }
                }

                return (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Signal className={`w-4.5 h-4.5 ${isEmergencyWaveOn ? 'text-red-500 animate-pulse' : 'text-[#D9EF92]'}`} />
                      <div className="flex flex-col">
                        <h4 className="font-sans font-bold text-xs text-white uppercase tracking-tight">{selectedJunction.name}</h4>
                        <span className="text-[7.5px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">
                          {isEmergencyWaveOn ? 'V2X OVERRIDE SYSTEM ACTIVE' : 'ARKA INTERSECTION NOMINAL'}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-slate-800" />

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9.5px] font-mono text-slate-400">
                      <span>Junction ID:</span>
                      <span className="text-white text-right font-bold">{selectedJunction.id}</span>
                      <span>Coordinates:</span>
                      <span className="text-white text-right">{selectedJunction.lat.toFixed(4)}, {selectedJunction.lng.toFixed(4)}</span>
                      <span>Current Phase:</span>
                      <span className="text-[#D9EF92] text-right font-bold uppercase truncate">{selectedJunction.phase}</span>
                      <span>Queue Length:</span>
                      <span className="text-white text-right">{selectedJunction.queueLength} vehicles</span>
                      <span>Density Rate:</span>
                      <span className="text-white text-right">{selectedJunction.density}%</span>
                      <span>Connected Nodes:</span>
                      <span className="text-cyan-400 text-right truncate max-w-[120px]">{connectedSigsStr}</span>
                      <span>Nearest Hospital:</span>
                      <span className="text-rose-400 text-right truncate max-w-[120px]">{nearestH.name}</span>
                      <span>Twin Status:</span>
                      <span className={`text-right font-bold ${isEmergencyWaveOn ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                        {emergencyStatusText}
                      </span>
                    </div>

                    <div className="h-1 bg-slate-900 rounded overflow-hidden mt-1">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          selectedJunction.density > 75 ? 'bg-red-500 animate-pulse' :
                          selectedJunction.density > 45 ? 'bg-amber-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${selectedJunction.density}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div />

          {/* Floating bottom switches tray */}
          <div className="pointer-events-auto bg-[#070b10]/95 border border-[#1e2736] p-1.5 rounded-xl backdrop-blur-md shadow-2xl flex flex-wrap items-center gap-1.5 justify-end">
            <button
              onClick={() => setLayers(l => ({ ...l, ambulances: !l.ambulances }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wide transition-all cursor-pointer border ${
                layers.ambulances 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                  : 'bg-black/20 text-slate-500 border-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>RESPONDERS</span>
            </button>

            <button
              onClick={() => setLayers(l => ({ ...l, density: !l.density }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wide transition-all cursor-pointer border ${
                layers.density 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-black/20 text-slate-500 border-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>DENSITY FLOW</span>
            </button>

            <button
              onClick={() => setLayers(l => ({ ...l, signals: !l.signals }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wide transition-all cursor-pointer border ${
                layers.signals 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                  : 'bg-black/20 text-slate-500 border-slate-800'
              }`}
            >
              <Signal className="w-3.5 h-3.5" />
              <span>SIGNALS</span>
            </button>

            <button
              onClick={() => setLayers(l => ({ ...l, hospitals: !l.hospitals }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wide transition-all cursor-pointer border ${
                layers.hospitals 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : 'bg-black/20 text-slate-500 border-slate-800'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>HOSPITALS</span>
            </button>

            <button
              onClick={() => setLayers(l => ({ ...l, cameras: !l.cameras }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wide transition-all cursor-pointer border ${
                layers.cameras 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                  : 'bg-black/20 text-slate-500 border-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>CCTVS</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            [INTERACTIVE MISSION REPLAY PANEL] PLAYBACK CONTROLLER TIMELINE SCRUBBER
            --------------------------------------------------------------------- */}
        <div className="pointer-events-auto bg-[#070b10]/98 border border-[#1e2736] p-4 rounded-xl shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center gap-4 text-left select-none">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setIsReplayMode(!isReplayMode);
                setReplayPlaying(false);
                pushMapEvent(`Switched map engine timeline context to ${!isReplayMode ? 'Historical Replay Mode' : 'Live Digital Twin Simulation'}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase border cursor-pointer transition-colors ${
                isReplayMode 
                  ? 'bg-[#D9EF92]/15 text-[#D9EF92] border-[#D9EF92]/30 animate-pulse' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {isReplayMode ? '• REPLAY MODE ACTIVE' : 'ENTER REPLAY MODE'}
            </button>

            {isReplayMode && (
              <div className="flex items-center gap-1 bg-black/40 border border-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setReplayPlaying(!replayPlaying)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-slate-800 text-[#D9EF92] hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title={replayPlaying ? 'Pause' : 'Play'}
                >
                  {replayPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-[#D9EF92]" />}
                </button>
                <button
                  onClick={() => setReplayProgress(0)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Rewind"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setReplaySpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)}
                  className="px-1.5 py-1 text-[8.5px] font-mono font-bold text-[#D9EF92] bg-slate-950 border border-slate-900 rounded transition-all select-none hover:bg-slate-850 shrink-0 cursor-pointer"
                >
                  {replaySpeed}X
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="w-3.5 h-3.5 text-[#D9EF92]" />
                {isReplayMode ? selectedMissionTitle : 'LIVE DIGITAL TWIN CORRIDOR ENGINE'}
              </span>
              <span className="text-[#D9EF92]">
                {isReplayMode ? `TIMELINE LOG: ${replayProgress}%` : 'CONNECTED ENGINE IN REAL-TIME'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[8.5px] font-mono text-slate-500 select-none shrink-0">00:00</span>
              <input
                type="range"
                min="0"
                max="100"
                disabled={!isReplayMode}
                value={isReplayMode ? replayProgress : 100}
                onChange={(e) => setReplayProgress(Number(e.target.value))}
                className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-950 outline-none border border-slate-900 accent-[#D9EF92] ${
                  !isReplayMode ? 'opacity-30' : ''
                }`}
                style={{
                  background: `linear-gradient(to right, #D9EF92 0%, #D9EF92 ${isReplayMode ? replayProgress : 100}%, #090e14 ${isReplayMode ? replayProgress : 100}%, #090e14 100%)`
                }}
              />
              <span className="text-[8.5px] font-mono text-slate-500 select-none shrink-0">
                {isReplayMode ? '04:52' : 'INF.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding Right Detail HUD for Responder Details */}
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
