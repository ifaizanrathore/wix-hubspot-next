// ── Sync & Contact types ──────────────────────────────────────────────────────

export type SyncSource = 'wix' | 'hubspot' | 'form';
export type SyncAction = 'create' | 'update' | 'skip' | 'error';
export type SyncStatus = 'success' | 'error' | 'skipped';
export type SyncDirection = 'wix_to_hubspot' | 'hubspot_to_wix' | 'bidirectional';
export type TransformType = 'none' | 'trim' | 'lowercase' | 'uppercase';

export interface IInstallation {
  _id?: string;
  siteId: string;
  hubspotPortalId: string | null;
  encryptedAccessToken: string | null;
  encryptedRefreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
  isConnected: boolean;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IContactMapping {
  _id?: string;
  siteId: string;
  wixContactId: string;
  hubspotContactId: string;
  lastSyncSource: SyncSource | null;
  lastSyncId: string | null;
  lastSyncAt: Date | null;
  wixLastUpdatedAt: Date | null;
  hubspotLastUpdatedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFieldMapping {
  _id?: string;
  siteId: string;
  wixField: string;
  hubspotProperty: string;
  syncDirection: SyncDirection;
  transform: TransformType;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISyncLog {
  _id?: string;
  siteId: string;
  syncId: string;
  source: SyncSource;
  action: SyncAction;
  wixContactId: string | null;
  hubspotContactId: string | null;
  status: SyncStatus;
  detail: string;
  errorMessage: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface OAuthStatusResponse {
  connected: boolean;
  hubspotPortalId?: string | null;
  scopes?: string[];
  connectedAt?: Date | null;
}

export interface WixField {
  name: string;
  label: string;
  type: string;
}

export interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
}

export interface SyncResult {
  syncId?: string;
  wixContactId?: string | null;
  hubspotContactId?: string | null;
  action?: string;
  skipped?: boolean;
  reason?: string;
}

export interface FieldMappingRow {
  _id?: string;
  wixField: string;
  hubspotProperty: string;
  syncDirection: SyncDirection;
  transform: TransformType;
}

export interface DashboardStats {
  totalMappings: number;
  totalLogs: number;
  successLogs: number;
  errorLogs: number;
  lastSync: Pick<ISyncLog, 'createdAt' | 'source' | 'action'> | null;
}

export interface FormSubmissionPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  pageUrl?: string;
  referrer?: string;
  customFields?: Record<string, string>;
}
