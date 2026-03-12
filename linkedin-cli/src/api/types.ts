// ─── Voyager API response types ─────────────────────────────────────────────

export interface VoyagerMeResponse {
  miniProfile?: {
    firstName: string;
    lastName: string;
    occupation: string;
    publicIdentifier: string;
    objectUrn: string;
    entityUrn: string;
    picture?: {
      artifacts: Array<{ fileIdentifyingUrlPathSegment: string; width: number; height: number }>;
      rootUrl: string;
    };
  };
}

export interface VoyagerProfile {
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  locationName: string;
  industryName: string;
  publicIdentifier: string;
  entityUrn: string;
}

export interface VoyagerConnection {
  entityUrn: string;
  firstName: string;
  lastName: string;
  headline: string;
  publicIdentifier: string;
  connectedAt?: number;
}

export interface VoyagerConnectionsResponse {
  elements: VoyagerConnection[];
  paging: VoyagerPaging;
}

export interface VoyagerPaging {
  count: number;
  start: number;
  total: number;
  links: Array<{ rel: string; href: string; type: string }>;
}

export interface VoyagerFeedItem {
  entityUrn: string;
  actor?: {
    name?: { text: string };
    description?: { text: string };
  };
  commentary?: { text: { text: string } };
  socialDetail?: {
    totalSocialActivityCounts?: {
      numLikes: number;
      numComments: number;
      numShares: number;
    };
  };
  resharedUpdate?: { entityUrn: string };
  createdAt?: number;
}

export interface VoyagerFeedResponse {
  elements: VoyagerFeedItem[];
  paging: VoyagerPaging;
}

export interface VoyagerMessage {
  entityUrn: string;
  subject?: string;
  lastActivityAt: number;
  read: boolean;
  participants: Array<{
    participantType?: {
      member?: {
        firstName: { text: string };
        lastName: { text: string };
        publicIdentifier: string;
      };
    };
  }>;
  events?: Array<{
    createdAt: number;
    eventContent?: {
      attributedBody?: { text: string };
    };
  }>;
}

export interface VoyagerMessagesResponse {
  elements: VoyagerMessage[];
  paging: VoyagerPaging;
}

export interface VoyagerNotification {
  entityUrn: string;
  publishedAt: number;
  read: boolean;
  headline?: { text: string };
  subtext?: { text: string };
}

export interface VoyagerNotificationsResponse {
  elements: VoyagerNotification[];
  paging: VoyagerPaging;
}

export interface VoyagerInvitation {
  entityUrn: string;
  sentTime: number;
  toMember?: {
    firstName: string;
    lastName: string;
    headline: string;
    publicIdentifier: string;
  };
  fromMember?: {
    firstName: string;
    lastName: string;
    headline: string;
    publicIdentifier: string;
  };
  message?: string;
  invitationType: string;
}

export interface VoyagerInvitationsResponse {
  elements: VoyagerInvitation[];
  paging: VoyagerPaging;
}

export interface VoyagerSearchResult {
  entityUrn: string;
  title?: { text: string };
  primarySubtitle?: { text: string };
  secondarySubtitle?: { text: string };
  navigationUrl?: string;
  publicIdentifier?: string;
}

export interface VoyagerSearchResponse {
  elements: Array<{
    results?: VoyagerSearchResult[];
    paging?: VoyagerPaging;
  }>;
}

export interface VoyagerJobPosting {
  entityUrn: string;
  title: string;
  companyName: string;
  locationName: string;
  listedAt: number;
  jobPostingUrl?: string;
  applyMethod?: { companyApplyUrl?: string };
}

export interface VoyagerJobsResponse {
  elements: VoyagerJobPosting[];
  paging: VoyagerPaging;
}

export interface VoyagerAnalyticsSummary {
  entityUrn: string;
  totalImpressions: number;
  uniqueImpressions: number;
  totalEngagements: number;
  engagementRate: number;
  totalClicks: number;
  totalReactions: number;
  totalComments: number;
  totalReposts: number;
  timeRange?: { start: number; end: number };
}
