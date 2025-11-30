# Google Calendar MCP - Tool Design

## Server Instructions

```
Use these tools to manage Google Calendar events.

Quick start
- Call 'list_calendars' first to discover available calendars and their IDs.
- Use 'search_events' to find events by time range, text query, or event type.
- Use 'create_event' to add events (natural language or structured).
- Use 'update_event' to modify or move events.
- Use 'check_availability' before scheduling to find free slots.

Default behavior
- All tools default to 'primary' calendar if calendarId is omitted.
- 'sendUpdates' defaults to 'none' to avoid spamming attendees during agent operations.
- Date/time values use ISO 8601 format with timezone offset (e.g., 2024-12-01T14:00:00+01:00).
- For all-day events, use date format: 2024-12-01.

Recurring events
- 'search_events' expands recurring events into instances by default (singleEvents: true).
- Each instance has 'recurringEventId' pointing to the parent event.
- To modify a single instance, use its instance 'id'. To modify all, use the parent 'recurringEventId'.

Event types
- 'default': Regular calendar event (can be created, updated, moved, deleted).
- 'birthday', 'focusTime', 'outOfOffice', 'workingLocation': Special types with restrictions.
- 'fromGmail': Auto-created from emails (read-only).
- Only 'default' events can be moved between calendars.

How to chain safely
- calendarId: Get from 'list_calendars', pass to all other tools.
- eventId: Get from 'search_events', pass to 'update_event'/'delete_event'.
- Always verify writes with 'search_events' after modifications.
```

---

## Tool Metadata

### list_calendars

```
name: list_calendars
title: List Calendars
description: List all calendars accessible to the user with their details. Use this FIRST to discover calendar IDs. Inputs: none.
Returns: { items: Array<{ id, summary, primary?, backgroundColor?, accessRole, timeZone, description? }> }.
Next: Use calendarId from items in 'search_events', 'create_event', etc. The 'primary' calendar is the user's main calendar.
```

---

### search_events

```
name: search_events
title: Search Events
description: Search and filter events with powerful options. Use for both discovery and precise lookups. Inputs: calendarId? (default: 'primary'), timeMin?, timeMax? (ISO 8601), query? (searches title, description, location, attendees), maxResults? (default: 50), eventTypes? (default|birthday|focusTime|outOfOffice|workingLocation), orderBy? (startTime|updated), fields? (array of fields to return).

FILTERING BY TIME (important!):
- Today's events: timeMin=start of day, timeMax=end of day in user's timezone.
- This week: timeMin=Monday 00:00, timeMax=Sunday 23:59:59.
- Upcoming: timeMin=now, no timeMax.

FILTERING BY TYPE:
- Regular events only: eventTypes: ['default']
- Focus time: eventTypes: ['focusTime']
- Out of office: eventTypes: ['outOfOffice']

Text search: pass query: "meeting with John" to match title, description, location, or attendee names/emails.

Returns: { items: Array<{ id, summary, start, end, location?, htmlLink, status, ... }>, nextPageToken? }.
Default fields: id, summary, start, end, location, htmlLink, status.
All fields: id, summary, description, start, end, location, attendees, organizer, creator, htmlLink, hangoutLink, conferenceData, status, eventType, visibility, colorId, recurringEventId, recurrence.

Next: Use eventId with 'update_event' or 'delete_event'. Pass nextPageToken as pageToken to fetch more results.
```

---

### check_availability

```
name: check_availability
title: Check Availability
description: Check free/busy status for time slots across one or more calendars. Use BEFORE scheduling to find available times. Inputs: timeMin, timeMax (ISO 8601, required), calendarIds? (default: ['primary']).
Returns: { calendars: { [calendarId]: { busy: Array<{ start, end }> } } }.
Behavior: Returns only busy time blocks. Free time = gaps between busy blocks.
Next: Use free slots to suggest meeting times, then 'create_event' to book.
```

---

### create_event

```
name: create_event
title: Create Event
description: Create a calendar event using natural language OR structured input. Inputs vary by mode.

MODE A - Natural language (uses Google quickAdd):
- text: string (e.g., "Lunch with Anna tomorrow at noon for 1 hour", "Team standup every Monday 9am")
- calendarId?: string (default: 'primary')
- sendUpdates?: 'all'|'externalOnly'|'none' (default: 'none')
Detection: If only 'text' is provided, uses quickAdd.

MODE B - Structured:
- summary: string (required, event title)
- start: { dateTime: string } or { date: string } (required)
- end: { dateTime: string } or { date: string } (required)
- calendarId?: string (default: 'primary')
- description?: string
- location?: string
- attendees?: string[] (array of email addresses)
- addGoogleMeet?: boolean (default: false, auto-creates Meet link)
- recurrence?: string[] (RRULE array, e.g., ["RRULE:FREQ=WEEKLY;COUNT=10"])
- reminders?: { useDefault: boolean, overrides?: Array<{ method: 'popup'|'email', minutes: number }> }
- visibility?: 'default'|'public'|'private'|'confidential'
- colorId?: string (1-11)
- sendUpdates?: 'all'|'externalOnly'|'none' (default: 'none')

Returns: Created event object with id, htmlLink, and all fields.
Next: Share htmlLink with user. Use 'search_events' to verify creation.
```

---

### update_event

```
name: update_event
title: Update Event
description: Update or move an existing event. Uses PATCH semantics (only provided fields are changed). Inputs: eventId (required), calendarId? (default: 'primary'), targetCalendarId? (moves event if different from calendarId), sendUpdates? ('all'|'externalOnly'|'none', default: 'none'), plus any field to update: summary?, start?, end?, description?, location?, attendees?, addGoogleMeet?, recurrence?, reminders?, visibility?, colorId?.

MOVE BEHAVIOR:
- If targetCalendarId differs from calendarId, performs Move operation first.
- Only 'default' events can be moved (not birthday, focusTime, outOfOffice, workingLocation).

PATCH BEHAVIOR:
- Only sends fields you provide; omitted fields remain unchanged.
- To clear a field, set it to null or empty string where applicable.

Returns: Updated event object.
Next: Use 'search_events' to verify changes. Share updated htmlLink if needed.
```

---

### delete_event

```
name: delete_event
title: Delete Event
description: Delete an event from a calendar. Inputs: eventId (required), calendarId? (default: 'primary'), sendUpdates? ('all'|'externalOnly'|'none', default: 'none').
Behavior: Permanently removes the event. If it's a recurring event instance, only that instance is deleted. To delete all instances, delete the parent event (use recurringEventId).
Returns: { success: true }.
Next: Use 'search_events' to verify deletion.
```

---

## Design Principles

1. **Minimize tool count** - 6 tools cover all calendar operations
2. **Agent controls verbosity** - `fields` param in search_events lets agent request only what it needs
3. **Smart input detection** - create_event auto-detects natural language vs structured
4. **Merge related operations** - update handles both modification and move
5. **Expand recurring by default** - search_events returns instances, not abstract patterns
6. **Safe defaults** - sendUpdates: 'none' prevents notification spam

---

## Field Reference

### Event Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Event identifier (use for update/delete) |
| `summary` | string | Event title |
| `description` | string | Event description (may contain HTML) |
| `start` | object | `{ dateTime: string }` or `{ date: string }` for all-day |
| `end` | object | `{ dateTime: string }` or `{ date: string }` for all-day |
| `location` | string | Location as free-form text |
| `attendees` | array | `[{ email, displayName?, responseStatus?, optional? }]` |
| `organizer` | object | `{ email, displayName?, self? }` |
| `creator` | object | `{ email, displayName? }` |
| `htmlLink` | string | Link to event in Google Calendar UI |
| `hangoutLink` | string | Google Meet link (if any) |
| `conferenceData` | object | Full conference info (Meet, phone dial-in, etc.) |
| `status` | string | `confirmed`, `tentative`, `cancelled` |
| `eventType` | string | `default`, `birthday`, `focusTime`, `outOfOffice`, `workingLocation` |
| `visibility` | string | `default`, `public`, `private`, `confidential` |
| `colorId` | string | Color ID (1-11) |
| `recurringEventId` | string | Parent recurring event ID (if this is an instance) |
| `recurrence` | array | RRULE array (only on parent recurring events) |

### Calendar Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Calendar identifier (use in calendarId params) |
| `summary` | string | Calendar name |
| `primary` | boolean | True if this is the user's primary calendar |
| `backgroundColor` | string | Hex color code |
| `accessRole` | string | `owner`, `writer`, `reader`, `freeBusyReader` |
| `timeZone` | string | IANA timezone (e.g., "Europe/Warsaw") |
| `description` | string | Calendar description |

### Event Types

| Type | Description | Can Create | Can Move |
|------|-------------|------------|----------|
| `default` | Regular calendar event | ✓ | ✓ |
| `birthday` | Annual birthday/anniversary | ✓ | ✗ |
| `focusTime` | Focus time block (auto-declines meetings) | ✓ | ✗ |
| `outOfOffice` | Out of office (auto-declines meetings) | ✓ | ✗ |
| `workingLocation` | Working location indicator | ✓ | ✗ |
| `fromGmail` | Auto-created from Gmail | ✗ | ✗ |
