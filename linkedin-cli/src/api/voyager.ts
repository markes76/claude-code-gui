// Voyager API endpoint definitions
// Base: https://www.linkedin.com/voyager/api

export const VOYAGER_BASE = 'https://www.linkedin.com/voyager/api';

export const ENDPOINTS = {
  // Auth check
  me: `${VOYAGER_BASE}/me`,

  // Profile
  profileByUrn: (urn: string) =>
    `${VOYAGER_BASE}/identity/profiles/${urn}`,
  profileByIdentifier: (identifier: string) =>
    `${VOYAGER_BASE}/identity/profiles/${identifier}`,
  profileView: (identifier: string) =>
    `${VOYAGER_BASE}/identity/profileView/${identifier}`,

  // Connections
  connections: `${VOYAGER_BASE}/relationships/connectionCount`,
  connectionsList: `${VOYAGER_BASE}/relationships/connections`,

  // Feed
  feed: `${VOYAGER_BASE}/feed/updatesV2`,

  // Messaging
  conversations: `${VOYAGER_BASE}/messaging/conversations`,
  conversationMessages: (conversationId: string) =>
    `${VOYAGER_BASE}/messaging/conversations/${conversationId}/events`,

  // Notifications
  notifications: `${VOYAGER_BASE}/notification-seen-controllers`,
  notificationsFeed: `${VOYAGER_BASE}/notification/notifications`,

  // Network
  invitations: `${VOYAGER_BASE}/relationships/invitations`,
  networkSuggestions: `${VOYAGER_BASE}/growth/normRecommendations`,

  // Search
  search: `${VOYAGER_BASE}/search/blended`,

  // Jobs
  savedJobs: `${VOYAGER_BASE}/jobs/jobApplications`,
  recommendedJobs: `${VOYAGER_BASE}/jobs/jobRecommendations`,

  // Analytics
  analytics: `${VOYAGER_BASE}/analyticsreporting/contentAnalyticsV2`,
  followerStats: `${VOYAGER_BASE}/analyticsreporting/followingStatistics`,
} as const;

export const DEFAULT_QUERY_PARAMS = {
  decorationId: 'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-86',
} as const;
