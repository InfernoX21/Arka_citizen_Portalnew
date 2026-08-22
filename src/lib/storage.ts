import { CURRENT_USER, INITIAL_COMMENTS, INITIAL_INCIDENTS, INITIAL_NOTIFICATIONS } from '../data/seedData';
import { IncidentComment, IncidentReport, NotificationItem, UserProfile } from '../types';

const STORAGE_KEYS = {
  INCIDENTS: 'arka_incidents_v1',
  COMMENTS: 'arka_comments_v1',
  NOTIFICATIONS: 'arka_notifications_v1',
  USER_PROFILE: 'arka_user_profile_v1',
  SAVED_IDS: 'arka_saved_incident_ids_v1',
  DRAFT_REPORT: 'arka_draft_report_v1',
};

export function getStoredUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return CURRENT_USER;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredIncidents(): IncidentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    if (raw) {
      const parsed: IncidentReport[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  // Initialize with seed data
  localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(INITIAL_INCIDENTS));
  return INITIAL_INCIDENTS;
}

export function saveIncidents(incidents: IncidentReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredComments(): Record<string, IncidentComment[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(INITIAL_COMMENTS));
  return INITIAL_COMMENTS;
}

export function saveComments(comments: Record<string, IncidentComment[]>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
  return INITIAL_NOTIFICATIONS;
}

export function saveNotifications(notifications: NotificationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (e) {
    console.error(e);
  }
}

export function getDraftReport(): { photoUrl?: string; userDescription?: string; landmark?: string; notes?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT_REPORT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
}

export function saveDraftReport(draft: { photoUrl?: string; userDescription?: string; landmark?: string; notes?: string }): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT_REPORT, JSON.stringify(draft));
  } catch (e) {
    console.error(e);
  }
}

export function clearDraftReport(): void {
  localStorage.removeItem(STORAGE_KEYS.DRAFT_REPORT);
}

// Utility for relative time formatting (e.g. "5 minutes ago", "2 hours ago")
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
