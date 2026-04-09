// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/apiConfig.ts
//
// Single source of truth for every API endpoint.
// Verified against app/main.py router registrations and each router file.
//
// Usage:
//   import { API, WS_URL } from '@services/apiConfig';
//   const res = await authRequest(API.disasters.active());
//   const ws  = new WebSocket(`${WS_URL}${API.notifications.ws()}?token=${tok}`);
// ═══════════════════════════════════════════════════════════════════════════

import { API_BASE_URL } from '@constants/index';

// ─── WebSocket base (strips /api/v1, swaps http→ws) ──────────────────────
export const WS_URL = API_BASE_URL
  .replace(/^https/, 'wss')
  .replace(/^http/, 'ws')
  .replace('/api/v1', '');

// ─── Endpoint map ─────────────────────────────────────────────────────────
// Every string is the path AFTER /api/v1 — pass directly to authRequest().

export const API = {

  // ── Citizen Auth  (prefix: /auth) ─────────────────────────────────────
  // router: app/api/v1/user_auth.py
  auth: {
    register:          () => '/auth/register',          // POST { phone_number, full_name, email? }
    registerVerify:    () => '/auth/register/verify',   // POST { phone_number, otp }
    login:             () => '/auth/login',             // POST { phone_number }
    loginVerify:       () => '/auth/login/verify',      // POST { phone_number, otp }
    tokenRefresh:      () => '/auth/token/refresh',     // POST { refresh_token }
    health:            () => '/auth/health',            // GET
  },

  // ── ERT Auth  (prefix: /emergency-team) ───────────────────────────────
  // router: app/api/v1/emergency_team_auth.py
  responder: {
    register:          () => '/emergency-team/register',
    // POST { phone_number, password, full_name, email, role, department, employee_id? }
    registerVerify:    () => '/emergency-team/register/verify',
    // POST { phone_number, otp }
    login:             () => '/emergency-team/login',
    // POST { email, password } → { login_token, message }
    loginVerify:       () => '/emergency-team/login/verify',
    // POST { login_token, otp } → { team_member, tokens }
    loginResendOtp:    () => '/emergency-team/login/resend-otp',
    // POST { login_token }
    changePassword:    () => '/emergency-team/change-password',
    // POST (JWT required)
    deactivate:        (id: string) => `/emergency-team/deactivate/${id}`,
    // POST (admin only)
    forgotPassword:    () => '/emergency-team/forgot-password',
    // POST { email }  → sends temp password to email
    resetPassword:     () => '/emergency-team/reset-password',
    // POST { email, temp_password, new_password }
  },

  // ── Disaster Reports  (prefix: /disaster-reports) ─────────────────────
  // router: app/api/v1/disaster_report.py
  reports: {
    submit:           () => '/disaster-reports/submit',
    // POST multipart/form-data — all-in-one with optional files[]
    // Fields: user_id, location_address, disaster_type, severity, description,
    //         latitude, longitude, people_affected, multiple_casualties,
    //         structural_damage, road_blocked, files[] (optional)
    uploadMedia:      () => '/disaster-reports/upload-media',
    // POST multipart/form-data files[] only
    create:           () => '/disaster-reports/',
    // POST JSON (no photos)
    byId:             (id: string) => `/disaster-reports/${id}`,
    // GET
    byUser:           (userId: string, limit = 20) =>
                        `/disaster-reports/user/${userId}?limit=${limit}`,
    // GET
    review:           (id: string) => `/disaster-reports/${id}/review`,
    // POST (admin)
    pendingAll:       () => '/disaster-reports/pending/all',
    // GET (admin)
    pendingClustered: () => '/disaster-reports/pending/clustered',
    // GET (admin)
    clusterReview:    () => '/disaster-reports/cluster/review',
    // POST (admin)
  },

  // ── Disasters  (prefix: /disasters) ───────────────────────────────────
  // router: app/api/v1/disaster.py
  // + dispatch from app/api/v1/deployment.py
  // + suggestedUnits / unitPositions from app/api/v1/deploy.py
  // + timeline from app/api/v1/incident_log.py
  disasters: {
    active:           (limit = 50) => `/disasters/active?limit=${limit}`,
    // GET → { disasters: ActiveDisaster[] }
    all:              (limit = 50) => `/disasters/all?limit=${limit}`,
    // GET (admin)
    byId:             (id: string) => `/disasters/${id}`,
    // GET
    deployments:      (id: string) => `/disasters/${id}/deployments`,
    // GET → { deployments[], summary }
    photos:           (id: string) => `/disasters/${id}/photos`,
    // GET
    timeline:         (id: string) => `/disasters/${id}/timeline`,
    // GET (incident_log router)
    resolve:          (id: string) => `/disasters/${id}/resolve`,
    // POST (admin)
    escalate:         (id: string) => `/disasters/${id}/escalate`,
    // POST (admin)
    dispatch:         (id: string) => `/disasters/${id}/dispatch`,
    // POST (admin) — deployment router
    suggestedUnits:   (id: string) => `/disasters/${id}/suggested-units`,
    // GET — deploy router
    unitPositions:    (id: string) => `/disasters/${id}/unit-positions`,
    // GET — deploy router (live GPS polling)
  },

  // ── Disaster Evaluation  (prefix: /disaster-evaluation) ───────────────
  // router: app/api/v1/disaster_evaluation.py
  evaluation: {
    activeRanked:     () => '/disaster-evaluation/active-ranked',
    // GET
    result:           (reportId: string) =>
                        `/disaster-evaluation/result/${reportId}`,
    // GET
    evaluate:         (reportId: string) =>
                        `/disaster-evaluation/evaluate/${reportId}`,
    // POST
    review:           (disasterId: string) =>
                        `/disaster-evaluation/review/${disasterId}`,
    // POST { approved: bool, notes?: string }
    reassess:         (disasterId: string) =>
                        `/disaster-evaluation/reassess/${disasterId}`,
    // POST
  },

  // ── Deployments  (no shared prefix) ───────────────────────────────────
  // router: app/api/v1/deployment.py  +  app/api/v1/deploy.py
  deployments: {
    unitActive:       (unitId: string, limit = 20) =>
                        `/deployments/unit/${unitId}/active?limit=${limit}`,
    // GET
    unitCompleted:    (unitId: string, limit = 20) =>
                        `/deployments/unit/${unitId}/completed?limit=${limit}`,
    // GET
    byId:             (id: string) => `/deployments/${id}`,
    // GET
    updateStatus:     (id: string) => `/deployments/${id}/update-status`,
    // POST DeploymentStatusUpdate
    route:            (id: string) => `/deployments/${id}/route`,
    // GET — deploy router
    updateLocation:   (id: string) => `/deployments/${id}/location`,
    // POST { lat, lng } — deploy router
    recall:           (id: string) => `/deployments/${id}/recall`,
    // POST — deploy router
  },

  // ── Routes  (no prefix, deploy router) ────────────────────────────────
  routes: {
    calculate:        () => '/routes/calculate',
    // POST { origin_lat, origin_lng, dest_lat, dest_lng }
  },

  // ── Emergency Units  (prefix: /emergency-units) ───────────────────────
  // router: app/api/v1/emergency_unit.py
  units: {
    available:        () => '/emergency-units/available',
    // GET
    list:             () => '/emergency-units/',
    // GET
    create:           () => '/emergency-units/',
    // POST
    byId:             (id: string) => `/emergency-units/${id}`,
    // GET
    update:           (id: string) => `/emergency-units/${id}`,
    // PUT
    decommission:     (id: string) => `/emergency-units/${id}`,
    // DELETE
    crewReplace:      (id: string) => `/emergency-units/${id}/crew`,
    // PUT
    crewAdd:          (id: string) => `/emergency-units/${id}/crew`,
    // POST
    crewRemove:       (unitId: string, memberId: string) =>
                        `/emergency-units/${unitId}/crew/${memberId}`,
    // DELETE
  },

  // ── Reroute  (prefix: /reroute) ───────────────────────────────────────
  // router: app/api/v1/reroute.py
  reroute: {
    trigger:          () => '/reroute/trigger',
    // POST { disaster_id }
    restore:          () => '/reroute/restore',
    // POST { disaster_id }
    override:         () => '/reroute/override',
    // POST RerouteOverrideRequest
    status:           (disasterId: string, routeId?: string) =>
                        routeId
                          ? `/reroute/status/${disasterId}?route_id=${routeId}`
                          : `/reroute/status/${disasterId}`,
    // GET — route_id is a QUERY param, not a path segment
    plans:            () => '/reroute/plans',
    // GET
    health:           () => '/reroute/health',
    // GET
  },

  // ── Evacuations  (prefix: /evacuations) ──────────────────────────────
  // router: app/api/v1/evacuation.py
  evacuations: {
    plan:             () => '/evacuations/plan',
    // POST { disaster_id }
    list:             () => '/evacuations/',
    // GET
    byId:             (id: string) => `/evacuations/${id}`,
    // GET
    approve:          (id: string) => `/evacuations/${id}/approve`,
    // POST
    activate:         (id: string) => `/evacuations/${id}/activate`,
    // POST
    progressGet:      (id: string) => `/evacuations/${id}/progress`,
    // GET
    progressPost:     (id: string) => `/evacuations/${id}/progress`,
    // POST
    routeBlockage:    (id: string) => `/evacuations/${id}/route-blockage`,
    // POST
    escalate:         (id: string) => `/evacuations/${id}/escalate`,
    // POST
  },

  // ── Live Map  (prefix: /live-map) ─────────────────────────────────────
  // router: app/api/v1/live_map.py
  liveMap: {
    initialize:       () => '/live-map/initialize',
    // GET
    mapConfig:        () => '/live-map/map-config',
    // GET
    tiles:            () => '/live-map/tiles',
    // GET
    styles:           () => '/live-map/styles',
    // GET
    disasters:        (bounds?: string) =>
                        bounds
                          ? `/live-map/disasters?bounds=${bounds}`
                          : '/live-map/disasters',
    // GET
    traffic:          (bounds?: string) =>
                        bounds
                          ? `/live-map/traffic?bounds=${bounds}`
                          : '/live-map/traffic',
    // GET
    data:             (bounds?: string) =>
                        bounds
                          ? `/live-map/data?bounds=${bounds}`
                          : '/live-map/data',
    // GET — combined disasters + traffic
    pendingDisasters: () => '/live-map/pending-disasters',
    // GET
  },

  // ── Vehicles  (prefix: /vehicles) ─────────────────────────────────────
  // router: app/api/v1/vehicles.py
  // NOTE: register/deregister/status all operate on /vehicles/register[/{user_id}]
  vehicles: {
    register:         () => '/vehicles/register',
    // POST VehicleRegisterRequest { user_id, current_lat, current_lng,
    //                               dest_lat, dest_lng, vehicle_type }
    deregister:       (userId: string) => `/vehicles/register/${userId}`,
    // DELETE — user arrived / app closed / destination changed
    status:           (userId: string) => `/vehicles/register/${userId}`,
    // GET — check if user has an active trip registered
  },

  // ── User Management  (prefix: /users) ────────────────────────────────
  // router: app/api/v1/user_management.py
  users: {
    departmentMap:    () => '/users/department-map',
    // GET
    create:           () => '/users/',
    // POST
    list:             () => '/users/',
    // GET
    byId:             (id: string) => `/users/${id}`,
    // GET
    update:           (id: string) => `/users/${id}`,
    // PUT
    delete:           (id: string) => `/users/${id}`,
    // DELETE (soft)
  },

  // ── Disaster Group Chat  ──────────────────────────────────────────────
  // router: app/api/v1/chat.py
  // ERT only. STAFF → must be assigned to disaster. ADMIN/MANAGER → any disaster.
  chat: {
    ws:      (disasterId: string) => `/api/v1/ws/chat/${disasterId}`,
    // Full URL: WS_URL + chat.ws(id) + ?token=<access_token>
    history: (disasterId: string, limit = 50) =>
               `/chat/${disasterId}/history?limit=${limit}`,
    // GET — works for all statuses including RESOLVED
  },

  // ── WebSocket Notifications ───────────────────────────────────────────
  // router: app/api/v1/notifications_ws.py
  // Connect: new WebSocket(`${WS_URL}/api/v1/ws/notifications?token=<access_token>`)
  notifications: {
    ws:               () => '/api/v1/ws/notifications',
  },

} as const;

export default API;