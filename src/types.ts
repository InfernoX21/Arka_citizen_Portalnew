export type IncidentCategory =
  | 'Road Block'
  | 'Waterlogging'
  | 'Accident'
  | 'Fire'
  | 'Garbage'
  | 'Broken Road'
  | 'Fallen Tree'
  | 'Power Failure'
  | 'Water Leakage'
  | 'Building Damage'
  | 'Animal Hazard'
  | 'Traffic Congestion'
  | 'Other';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type IncidentStatus = 'Active' | 'Resolved' | 'Under Review' | 'Merged';

export type AuthMethod = 'google' | 'email';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  authMethod: AuthMethod;
  role?: 'citizen' | 'admin' | 'officer';
  department?: string;
  trustScore: number; // e.g. 0 to 100
  totalReports: number;
  verifiedCount: number;
  joinDate: string;
  badges: string[];
  location?: {
    lat: number;
    lng: number;
    city: string;
  };
}

export interface ExifData {
  gps?: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  timestamp?: string;
  deviceInfo?: string;
  hasGpsData: boolean;
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    trustScore: number;
  };
  content: string;
  createdAt: string;
  parentId?: string;
  mentions?: string[];
  isVerificationConfirm?: boolean;
}

export interface IncidentReport {
  id: string;
  photoUrl: string;
  aiTitle: string; // e.g. "Road Waterlogging Near KIIT Square"
  userDescription: string;
  landmark?: string;
  additionalNotes?: string;
  category: IncidentCategory;
  keywords: string[];
  severity: SeverityLevel;
  aiConfidence: number; // e.g. 96 (legacy alias)
  photoTitleMatchScore?: number; // 0 to 100% Photo-Title relevance
  photoTitleExplanation?: string; // Reason why photo matches/doesn't match title
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    name: string;
    avatar: string;
    trustScore: number;
  };
  upvotes: string[]; // User IDs who confirmed issue
  downvotes: string[]; // User IDs who disputed issue
  verificationCount: number; // Net score (upvotes - downvotes)
  resolvedBy?: {
    id: string;
    name: string;
    timestamp: string;
  };
  duplicateCount: number; // Total citizens reporting this issue (e.g. 18)
  mergedReporters?: { name: string; avatar: string; trustScore: number }[];
  exif?: ExifData;
  locationName: string;
  commentsCount: number;
  isSaved?: boolean;
  spamOrIrrelevant?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'verified' | 'resolved' | 'category_updated' | 'nearby_incident' | 'comment' | 'trust_score_changed' | 'duplicate_merged';
  title: string;
  message: string;
  incidentId?: string;
  timestamp: string;
  isRead: boolean;
  actor?: {
    name: string;
    avatar: string;
  };
  trustDelta?: number;
}

export interface CategoryMetadata {
  name: IncidentCategory;
  iconName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export interface AIAnalysisResult {
  aiTitle: string;
  category: IncidentCategory;
  keywords: string[];
  severity: SeverityLevel;
  aiConfidence: number;
  photoTitleMatchScore: number; // 0-100% Photo-Title Relevance Score
  photoTitleExplanation: string; // 1-sentence explanation of why photo matches/doesn't match title
  detectedSummary: string;
  isSpamOrIrrelevant: boolean;
  spamReason?: string;
  possibleDuplicateId?: string;
  duplicateMatchConfidence?: number;
  imageVerifiedByAI?: boolean; // true = Gemini vision actually analyzed the image; false = text-only heuristic
  visualSubjectDetected?: string; // What the AI/heuristic thinks the photo shows (e.g. 'fire', 'flood', 'unknown')
}

export interface Junction {
  [key: string]: any;
}

export interface DigitalTwinVehicle {
  [key: string]: any;
}

export interface Hospital {
  [key: string]: any;
}

export type AmbulanceStatus = string;

export interface Ambulance {
  [key: string]: any;
}

export interface LogEvent {
  [key: string]: any;
}

export interface RoadSegment {
  [key: string]: any;
}

export interface HistoricalIncident {
  [key: string]: any;
}

export interface CameraFeed {
  [key: string]: any;
}

