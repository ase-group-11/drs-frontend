# Test Suite Documentation

**Project:** Disaster Response Mobile App (React Native)  
**Test Runner:** Jest + `@testing-library/react-native`  
**Total Tests:** 284 (282 passing, 2 skipped)  
**Test Files:** 23 active test files across unit and integration layers

---

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Running Tests](#running-tests)
4. [Unit Tests](#unit-tests)
   - [Utils — Validation](#utils--validation)
   - [Utils — Formatters](#utils--formatters)
   - [Components — Atoms (Button & Input)](#components--atoms-button--input)
   - [Components — Forms (LoginForm & SignupForm)](#components--forms-loginform--signupform)
   - [Hooks — useOTPTimer](#hooks--useotptimer)
   - [Hooks — useDisasterData](#hooks--usedisasterdata)
   - [Screens — TypeStep](#screens--typestep)
   - [Services — authService (Validators)](#services--authservice-validators)
   - [Services — authService (Network)](#services--authservice-network)
   - [Services — mapService (Unit)](#services--mapservice-unit)
   - [Services — mapService (Full Coverage)](#services--mapservice-full-coverage)
   - [Services — disasterService](#services--disasterservice)
5. [Integration Tests](#integration-tests)
   - [Auth Flow (Login + OTP Verification)](#auth-flow-login--otp-verification)
   - [Signup Screen](#signup-screen)
   - [Responder Login Screen](#responder-login-screen)
   - [Home Screen (mapService integration)](#home-screen-mapservice-integration)
   - [Alerts Screen](#alerts-screen)
   - [Active Missions Screen](#active-missions-screen)
   - [My Reports Screen](#my-reports-screen)
   - [Report Detail Screen](#report-detail-screen)
   - [Settings Screen](#settings-screen)
   - [Map Service (Full Pipeline Integration)](#map-service-full-pipeline-integration)
6. [Features Covered](#features-covered)
7. [Mocking Strategy](#mocking-strategy)
8. [Skipped Tests](#skipped-tests)

---

## Overview

This test suite validates a React Native disaster response application. It covers citizen and emergency responder authentication, disaster reporting, map-based data fetching, real-time alerts, and settings management.

Tests are split into two categories:

- **Unit tests** — validate individual functions, hooks, and components in isolation with all dependencies mocked.
- **Integration tests** — validate how screens, services, and navigation work together using controlled mocks for external APIs and storage.

---

## Test Architecture

```
mobile/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── validation.test.ts
│   │   │   └── formatters.test.ts
│   │   ├── components/
│   │   │   ├── atoms.test.tsx
│   │   │   └── forms.test.tsx
│   │   ├── hooks/
│   │   │   ├── useOTPTimer.test.ts
│   │   │   └── useDisasterData.test.ts
│   │   ├── screens/
│   │   │   └── TypeStep.test.tsx
│   │   └── services/
│   │       └── mapService.full.test.ts
│   └── integration/
│       ├── Authflow.test.tsx
│       ├── SignupScreen.test.tsx
│       ├── ResponderLoginScreen.test.tsx
│       ├── HomeScreen.test.tsx
│       ├── AlertsScreen.test.tsx
│       ├── ActiveMissionsScreen.test.tsx
│       ├── MyReportsScreen.test.tsx
│       ├── ReportDetailScreen.test.tsx
│       ├── SettingsScreen.test.tsx
│       └── mapservice.integration.test.ts
└── src/
    ├── services/__tests__/
    │   ├── authService.network.test.ts
    │   ├── authService.validators.test.ts
    │   ├── mapService.test.ts
    │   └── disasterService.test.ts
    └── utils/__tests__/
        └── validation.test.ts
```

---

## Running Tests

```bash
# Run all tests
npx jest

# Run only unit tests
npx jest __tests__/unit

# Run only integration tests
npx jest __tests__/integration

# Run a specific file
npx jest __tests__/unit/hooks/useOTPTimer.test.ts

# Run with coverage
npx jest --coverage
```

---

## Unit Tests

### Utils — Validation

**Files:** `__tests__/unit/utils/validation.test.ts` and `src/utils/__tests__/validation.test.ts`

These tests cover all exported validation and formatting helpers in `src/utils/validation.ts`.

| Function | What is tested |
|---|---|
| `isValidIrishPhone` | Valid 10-digit Irish mobile, 9-digit without leading 0, numbers with spaces, rejection of < 7 or > 10 digits, empty string |
| `isValidPhone` | Generic 7–15 digit acceptance, strip of dashes, rejection outside that range |
| `isValidName` | Min 2 chars, max 100 chars, trims whitespace, rejects single char and whitespace-only strings |
| `isValidOTP` | Exactly 6 digits by default, custom length (4), rejects letters, rejects wrong length |
| `isValidEmail` | Standard format, subdomain, plus-sign, rejects missing `@`, missing domain, missing TLD |
| `formatPhoneDisplay` | 3-digit passthrough, space insertion at positions 3 and 6, strips non-digits |
| `maskPhone` | Default masks all but last 4 digits, custom visible digit count, short strings returned as-is |

---

### Utils — Formatters

**File:** `__tests__/unit/utils/formatters.test.ts`

Tests `src/utils/formatters.ts` — pure utility functions that format display values.

| Function | What is tested |
|---|---|
| `getTimeAgo` | "just now" for < 60s, singular/plural minutes, hours, "yesterday" at 24h, days count for 48h+ |
| `getDisasterIcon` | Returns correct emoji for fire 🔥, flood 🌊, storm 💨, accident 🚗, power ⚡, unknown → 📍, empty string → 📍 |
| `getSeverityLabel` | Capitalises critical/high/medium/low, handles already-capitalised input |

---

### Components — Atoms (Button & Input)

**File:** `__tests__/unit/components/atoms.test.tsx`

Tests the foundational `Button` and `Input` atoms used throughout the app.

**Button:**
- Renders title text
- Calls `onPress` when tapped
- Does not call `onPress` when `disabled` or `loading`
- Hides title text and shows `ActivityIndicator` when `loading=true`
- Renders left icon when provided
- Accepts `outline`, `ghost` variants and `small` size without crashing

**Input:**
- Renders with a label
- Renders optional `labelSuffix`
- Shows error message when `error` prop is set; hides it when empty
- Fires `onChangeText` when user types
- Sets `editable={false}` when `disabled`

---

### Components — Forms (LoginForm & SignupForm)

**File:** `__tests__/unit/components/forms.test.tsx`

Tests the `LoginForm` and `SignupForm` organism components. `PhoneInput` is mocked with a plain `TextInput` so country-picker internals are bypassed.

**LoginForm:**
- Renders Continue, Sign Up, and Emergency Responder buttons
- Calls `onSignupPress` and `onResponderPress` callbacks correctly
- Does not call `onSubmit` when phone is empty or too short (< 7 digits)
- Calls `onSubmit(phone, countryCode)` for a valid phone number
- Hides the Continue label and shows loading spinner when `isLoading=true`

**SignupForm:**
- Renders first name, last name, email, and phone fields
- Calls `onLoginPress` when Log In is tapped
- Blocks submit when all fields are empty
- Shows "First name must be at least 2 characters" error for single-char first name
- Shows "Please enter a valid email address" for malformed email
- Calls `onSubmit(firstName, lastName, phone, countryCode)` on valid form
- Includes trimmed email in `onSubmit` when a valid email is provided

---

### Hooks — useOTPTimer

**File:** `__tests__/unit/hooks/useOTPTimer.test.ts`

Uses Jest fake timers to test the OTP countdown hook without real delays.

| Scenario | Tests |
|---|---|
| Initial state | `autoStart=true` → timer equals `initialTime`, `canResend=false`; `autoStart=false` → timer is 0, `canResend=true` |
| Countdown | Decrements by 1 per second; sets `canResend=true` when timer hits 0 |
| `startTimer()` | Resets timer to `initialTime`, sets `canResend=false` |
| `resetTimer()` | Resets mid-countdown back to `initialTime`, `canResend=false` |
| `formatTime()` | 0 → `"0:00"`, 60 → `"1:00"`, 65 → `"1:05"`, 9 → `"0:09"`, 125 → `"2:05"` |

---

### Hooks — useDisasterData

**File:** `__tests__/unit/hooks/useDisasterData.test.ts`

Tests the `useDisasterData` hook which fetches disasters, alerts, and reports on mount.

| Scenario | Tests |
|---|---|
| Success | Starts with empty arrays; populates `disasters`, `alerts`, `reports` after resolution; sets `isLoading=false` |
| Error | Sets `error` string from rejected promise; `disasters` stays empty |
| Refresh | Calling `refresh()` triggers another fetch cycle |

---

### Screens — TypeStep

**File:** `__tests__/unit/screens/TypeStep.test.tsx`

Simple data-driven tests verifying the constants used in the disaster reporting TypeStep form.

- There are 8 disaster types: fire, flood, storm, earthquake, hurricane, tsunami, tornado, other
- There are 4 severity levels: low, medium, high, critical
- Default type is `"other"` (last item); fire is first
- Default severity is `"medium"` (index 1)

---

### Services — authService (Validators)

**File:** `src/services/__tests__/authService.validators.test.ts`

Tests the validation and formatting functions exported directly from `authService`.

| Function | Tests |
|---|---|
| `formatPhoneForApi` | Combines country code + phone, adds leading `+` if missing, strips spaces/dashes |
| `validatePhoneNumber` | Valid 7–15 digits; errors for empty, < 7, > 15 digits |
| `validateEmail` | Valid email; empty string is valid (optional field); error for invalid format |
| `validateFullName` | Valid 2+ char name; errors for empty, 1 char, > 100 chars, names with numbers; hyphen/apostrophe accepted |
| `validateOTP` | 6-digit numeric valid; fails for letters, wrong length; custom length of 4 supported |
| `ApiError` | Is an `instanceof Error`; stores `message`, `status`, and optional `data` payload |

---

### Services — authService (Network)

**File:** `src/services/__tests__/authService.network.test.ts`

Tests the HTTP network calls made by `authService` with `fetch` mocked globally.

| Method | Tests |
|---|---|
| `login` | POSTs to `/auth/login`; throws `ApiError` on 404 |
| `register` | POSTs to `/auth/register`; throws `ApiError` on 409 (duplicate phone) |
| `verifyLogin` | Returns `{ tokens, user }` on success; throws `ApiError` on 400 (invalid OTP) |
| `verifyRegistration` | POSTs to verify-registration and returns tokens; throws on 410 (expired OTP) |
| `logout` | Calls `AsyncStorage.removeItem` to clear auth keys |
| `getStoredUser` | Parses and returns stored user object; returns `null` when nothing stored |
| `resendOTP` | Internally calls the login endpoint when `isSignup=false` |

---

### Services — mapService (Unit)

**File:** `src/services/__tests__/mapService.test.ts`

Focused unit tests for `mapService` with `authRequest` mocked.

| Method | Tests |
|---|---|
| `formatBounds` | Formats four coordinates into a comma-separated string |
| `getDisasters` | Flat array response, nested `{ disasters: [] }` response, unexpected format → empty array, network failure → throw |
| `getTraffic` | Calls `/live-map/traffic?bounds=...` |
| `getPendingDisasters` | Calls `/live-map/pending-disasters` |

---

### Services — mapService (Full Coverage)

**File:** `__tests__/unit/services/mapService.full.test.ts`

Extends mapService coverage to all remaining methods.

| Method | Tests |
|---|---|
| `getReroutePlan` | Calls `/reroute/status/{disasterId}`, uses ID verbatim, throws 404, returns full plan object, handles empty routes |
| `getLiveMapData` | Calls `/live-map/data?bounds=...&zoom=...`, passes different zoom levels, returns raw response |
| `getPendingDisasters` | Default limit 50, custom limit, returns raw array |
| `getTraffic` | Calls correct URL, returns `available:true` with traffic flow, `available:false`, propagates ApiError on 408 |
| `formatBounds` | Decimal precision preserved |
| `getDisasters` (edge cases) | Falls back to top-level `lat/lon` if no location object, falls back to `latitude/longitude` field names, drops entries where both formats are missing |

---

### Services — disasterService

**File:** `src/services/__tests__/disasterService.test.ts`

Tests `disasterService` with `authRequest` mocked.

| Method | Tests |
|---|---|
| `createReport` | Calls `POST /disaster-reports/`, returns created report with ID |
| `getUserReports` | Returns reports array with correct `disaster_type` |
| `getMyReports` | Returns an array |
| `getReport` | Returns report by ID |

---

## Integration Tests

### Auth Flow (Login + OTP Verification)

**File:** `__tests__/integration/Authflow.test.tsx`

Tests the complete authentication journey for a citizen user. Navigation, PhoneInput, and OTPInputGroup are all mocked to lightweight components.

**LoginScreen:**
- Renders without crashing and shows Continue button
- Calls `authService.login` with the entered phone number on submit
- Navigates to `OTPVerification` after successful login response
- Does not navigate when `authService.login` throws an `ApiError`
- Pressing Sign Up navigates to `Signup`
- Pressing the Emergency Responder button navigates to `ResponderLogin`

**OTPVerificationScreen:**
- Renders the OTP input group
- Calls `authService.verifyLogin` with the 6-digit code when Verify is pressed
- Navigates (resets stack) to `Main` after successful verification
- Does not navigate when `verifyLogin` rejects

---

### Signup Screen

**File:** `__tests__/integration/SignupScreen.test.tsx`

Tests citizen registration flow.

- Renders signup button and Log In link
- Calls `authService.register` with formatted phone number and full name
- Navigates to `OTPVerification` with `isSignup: true` on success
- Does not navigate when `register` throws a 409 ApiError (phone taken)
- Shows error text from `ApiError.message` in the UI
- Navigates to `Login` when Log In link is pressed

---

### Responder Login Screen

**File:** `__tests__/integration/ResponderLoginScreen.test.tsx`

Tests the emergency responder (email/password) login.

**Validation:**
- Empty email is invalid
- Valid email (`john@drs.ie`) passes
- Email without `@` is invalid
- Email without domain is invalid

**Network fetch:**
- POSTs to `/emergency-team/login`, returns `tokens` and `team_member` data
- Returns 401 on bad credentials
- Propagates network errors

---

### Home Screen (mapService integration)

**File:** `__tests__/integration/HomeScreen.test.tsx`

Tests the mapService methods as used by the Home screen.

- `formatBounds` returns the correct comma-separated string
- `getDisasters` resolves to an array and returns correct `id` field
- `getDisasters` is called with the correct bounds and limit arguments
- `getDisasters` returns empty array when no events
- `getDisasters` rejects on error
- `getTraffic` returns an `available` status field

---

### Alerts Screen

**File:** `__tests__/integration/AlertsScreen.test.tsx`

Tests the client-side filter logic for the Alerts screen.

| Filter | Test |
|---|---|
| Critical | Returns only `severity === "critical"` alerts |
| My Area | Returns only alerts within 1 km (`distance ≤ 1`) |
| All | Returns all alerts unfiltered |
| Empty list | Returns zero results |
| Count | Correctly counts multiple critical alerts |

---

### Active Missions Screen

**File:** `__tests__/integration/ActiveMissionsScreen.test.tsx`

Tests the Active Missions screen used by emergency responders.

**Rendering:**
- Shows "Active Missions" heading
- Shows static fallback address (`O'Connell Street, Dublin 1`) when API fails
- Shows static `FIRE` disaster type when API fails

**Tab switching:**
- Active tab shown by default
- Completed tab switches without crashing

**API calls:**
- Fetches `/emergency-units/` on mount
- Fetches `/deployments/unit/{id}/active` after getting the unit ID

---

### My Reports Screen

**File:** `__tests__/integration/MyReportsScreen.test.tsx`

Tests service interactions for the citizen's report history screen.

- `getStoredUser` returns the current user
- `getMyReports` is called with the user's ID
- `getMyReports` returns an empty array when no reports exist
- Returns `null` when no user is stored
- Active filter (`status !== "resolved"`) returns 1 result
- Resolved filter (`status === "resolved"`) returns 1 result

---

### Report Detail Screen

**File:** `__tests__/integration/ReportDetailScreen.test.tsx`

Tests `disasterService.getReport` as used by the Report Detail screen.

- Resolves with report data including `id` and `location_address`
- Called with the correct report ID
- Rejects with "Not found" error
- Handles `report_status: "pending"` and `"verified"`
- Returns `rejection_reason` when status is `"rejected"`

---

### Settings Screen

**File:** `__tests__/integration/SettingsScreen.test.tsx`

Tests the Settings screen state management and logout flow.

**AsyncStorage reads on mount:**
- Reads `@prefs/push_notifications`
- Reads `@prefs/sms_alerts`
- Reads `@prefs/location_services`

**User data:**
- Loads and displays user's full name from `authService`
- Loads and displays phone number from `authService`

**Logout:**
- Calls `authService.logout`
- Resets navigation stack to `Auth` after logout

---

### Map Service (Full Pipeline Integration)

**File:** `__tests__/integration/mapservice.integration.test.ts`

Tests the complete pipeline: `mapService → authRequest → fetch → response parsing`. AsyncStorage is pre-seeded with a valid token to allow `authRequest` to proceed.

**getDisasters:**
- Parses a real `{ disasters: [] }` API response into normalised objects
- Includes the `Authorization: Bearer <token>` header from AsyncStorage
- Includes `bounds` and `limit` query params in the request URL
- Throws `ApiError` with `status: 401` on 401 response
- Throws `ApiError` with `status: 0` on network failure
- Returns empty array for an empty disasters list

**getTraffic:**
- Returns raw traffic data from the API
- Includes the correct `bounds` parameter in the URL

---

## Features Covered

| Feature | Coverage |
|---|---|
| Citizen registration (phone + OTP) | ✅ Unit + Integration |
| Citizen login (phone + OTP) | ✅ Unit + Integration |
| Emergency responder login (email + password) | ✅ Integration |
| OTP countdown timer | ✅ Unit |
| Phone number validation (Irish + generic) | ✅ Unit |
| Email validation | ✅ Unit |
| Name validation | ✅ Unit |
| OTP validation | ✅ Unit |
| Phone display formatting & masking | ✅ Unit |
| Time-ago formatting | ✅ Unit |
| Disaster type icons | ✅ Unit |
| Severity labels | ✅ Unit |
| Disaster map data fetching | ✅ Unit + Integration |
| Real-time traffic data | ✅ Unit + Integration |
| Reroute plan fetching | ✅ Unit |
| Live map data | ✅ Unit |
| Pending disasters | ✅ Unit |
| Alerts with severity/distance filtering | ✅ Integration |
| Active missions for responders | ✅ Integration |
| Disaster report creation | ✅ Unit |
| Disaster report history | ✅ Unit + Integration |
| Report detail (status, rejection reason) | ✅ Integration |
| User settings (preferences, profile) | ✅ Integration |
| Logout and session clearing | ✅ Unit + Integration |
| Token persistence via AsyncStorage | ✅ Unit + Integration |
| API error handling (4xx, 5xx, network) | ✅ Unit + Integration |
| Navigation flow (screen transitions) | ✅ Integration |
| Button and Input atoms | ✅ Unit |
| LoginForm and SignupForm organisms | ✅ Unit |

---

