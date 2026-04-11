# Google Contacts Integration Design

> Spec for adding Google Contacts (read-only, real-time) to the para-app note editor.

## Goal

Users connect their Google account in Settings. Inside any note, typing `@` opens a real-time contact search popover that queries Google Contacts. The selected contact is inserted as an inline styled chip in the editor body. All contacts mentioned in a note are extracted on save and shown in the note inspector sidebar.

---

## Architecture

### Data Model

Two additions to `prisma/schema.prisma`:

```prisma
model User {
  // ...existing fields unchanged...
  googleAccessToken  String?
  googleRefreshToken String?
  googleTokenExpiry  DateTime?
}

model Note {
  // ...existing fields unchanged...
  contacts Json @default("[]")
  // stored as: [{ googleId: string, name: string, email: string, photoUrl?: string }]
}
```

### OAuth Flow

1. Settings page has a "Google Contacts" section. If not connected, shows "Connect Google" button. If connected, shows "Connected" state and "Disconnect" button.
2. "Connect Google" → `GET /api/auth/google` → redirects to Google OAuth consent screen (scope: `contacts.readonly`, access_type: `offline`, prompt: `consent`).
3. Google redirects to `GET /api/auth/google/callback?code=...` → exchanges code for tokens → saves `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry` on the `User` record → redirects to `/settings?google=connected`.
4. "Disconnect" → `contacts.disconnect` tRPC mutation → sets all three token fields to `null`.

### Contact Search

tRPC procedure `contacts.search({ query: string })`:
- Reads `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry` from the User record.
- If no token, returns `[]`.
- Auto-refreshes token if `googleTokenExpiry < now` using the `googleapis` OAuth2 client, then saves the new token to the DB.
- Calls Google People API `people.people.searchContacts({ query, readMask: "names,emailAddresses,photos", pageSize: 10 })`.
- Returns `{ googleId: string, name: string, email: string, photoUrl?: string }[]`, filtered to contacts that have at least one email address.
- Returns `[]` on any error (network, API quota, revoked token).

### BlockNote @Mention

- Custom inline content type `mention` defined via `createReactInlineContentSpec`. Props: `{ googleId: string, name: string, email: string, photoUrl: string }`. Content: `"none"`.
- The `NoteEditor` component uses a custom `BlockNoteSchema` that extends default inline content specs with `mention`.
- `SuggestionMenuController` triggers on `@`. `getItems(query)` calls `utils.contacts.search.fetch({ query })` via tRPC. Returns menu items with avatar, name, and email. On select: inserts `{ type: "mention", props: { googleId, name, email, photoUrl } }` followed by a space.
- Mention renders as: `@Name` in a styled inline span (purple tint, matching dark theme).

### Contact Extraction & Storage

`extractContactsFromBody(bodyJson: string)` in `src/lib/utils.ts`:
- Parses the BlockNote JSON array.
- Recursively walks all blocks and their `content` arrays.
- Collects all `{ type: "mention" }` nodes, deduplicates by `googleId`.
- Returns `{ googleId, name, email }[]`.

In `NoteEditorPage.save()`:
- Calls `extractContactsFromBody(body)` to derive the contacts array.
- Passes it as `contacts` to `note.update`.

### Inspector Sidebar — Contacts Section

In `src/app/note/[id]/page.tsx`:
- `note.contacts` (loaded from DB) is initialized into local state `contacts`.
- Inspector renders a "Contacts" section showing each contact as: small avatar (28px) + name + email. Read-only — to remove a contact, the user removes the `@mention` from the editor body and saves.
- Section is hidden if `contacts.length === 0`.

### Settings — Google Section

New section in `src/app/(app)/settings/page.tsx`:
- Reads `isGoogleConnected` from `trpc.user.me` (added to the select).
- Not connected: Google icon + "Connect Google Contacts" button → navigates to `/api/auth/google`.
- Connected: Google icon + "Connected" label + "Disconnect" button → calls `contacts.disconnect` mutation, invalidates `user.me`.

---

## Required Env Vars

Add to `.env.local` (dev) and `.env.prod` (production):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourapp.com/api/auth/google/callback
```

These must match the credentials created in Google Cloud Console (OAuth 2.0 Client ID, authorized redirect URI).

---

## Dependencies

- `googleapis` npm package (Google APIs Node.js client)

---

## Out of Scope (v1)

- Writing back to Google Contacts
- Removing contacts from the sidebar (manage via @mention in editor)
- Caching contacts locally
- Displaying contacts in search results / command palette
