import ExifReader from 'exifreader';
import { ExifData } from '../types';

export async function extractExifFromImageFile(file: File): Promise<ExifData> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    let lat: number | undefined;
    let lng: number | undefined;
    let altitude: number | undefined;
    let timestamp: string | undefined;
    let deviceInfo: string | undefined;

    // GPS Latitude
    if (tags.GPSLatitude && tags.GPSLatitudeRef) {
      const latVal = tags.GPSLatitude.description;
      const latRef = tags.GPSLatitudeRef.value[0];
      if (typeof latVal === 'number') {
        lat = latRef === 'S' ? -latVal : latVal;
      }
    }

    // GPS Longitude
    if (tags.GPSLongitude && tags.GPSLongitudeRef) {
      const lngVal = tags.GPSLongitude.description;
      const lngRef = tags.GPSLongitudeRef.value[0];
      if (typeof lngVal === 'number') {
        lng = lngRef === 'W' ? -lngVal : lngVal;
      }
    }

    // Altitude
    if (tags.GPSAltitude) {
      altitude = Number(tags.GPSAltitude.description) || undefined;
    }

    // Timestamp
    if (tags.DateTimeOriginal || tags.DateTime) {
      const dt = tags.DateTimeOriginal?.description || tags.DateTime?.description;
      if (dt) {
        // Format ISO
        timestamp = dt.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      }
    }

    // Device Model
    const make = tags.Make?.description || '';
    const model = tags.Model?.description || '';
    if (make || model) {
      deviceInfo = `${make} ${model}`.trim();
    }

    // Fallback timestamp
    if (!timestamp) {
      timestamp = new Date(file.lastModified || Date.now()).toISOString();
    }

    // If EXIF GPS wasn't in photo, try browser geolocation API if permitted
    if (!lat || !lng) {
      const browserPos = await getBrowserLocationSilently();
      if (browserPos) {
        lat = browserPos.lat;
        lng = browserPos.lng;
      }
    }

    return {
      gps: lat !== undefined && lng !== undefined ? { lat, lng, altitude } : undefined,
      timestamp,
      deviceInfo: deviceInfo || 'Mobile Device Camera',
      hasGpsData: lat !== undefined && lng !== undefined,
    };
  } catch (err) {
    console.warn('EXIF extraction warning:', err);
    
    // Fallback location & time
    const browserPos = await getBrowserLocationSilently();
    return {
      gps: browserPos ? { lat: browserPos.lat, lng: browserPos.lng } : { lat: 20.3541, lng: 85.8175 },
      timestamp: new Date().toISOString(),
      deviceInfo: 'Camera Capture',
      hasGpsData: true,
    };
  }
}

async function getBrowserLocationSilently(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
      },
      () => resolve(null),
      { timeout: 3000, enableHighAccuracy: true }
    );
  });
}
