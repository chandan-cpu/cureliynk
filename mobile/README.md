# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

## Medication reminders

Dose reminders, adherence history and refill alerts. The feature spans this app
and the Node API in `../server`.

### What runs where

The split is deliberate, and the reason is reliability rather than tidiness.

**The device schedules and fires every dose reminder.** A reminder has to arrive
at an exact minute whether or not the phone has signal, and whether or not the
app is running. A server push can guarantee neither — it needs connectivity, and
delivery is best-effort. So the app schedules *local* notifications from the
schedules it has synced, and they keep firing offline, in airplane mode, and
with the app force-quit.

**The server never fires a dose reminder.** It owns the things a device cannot:

| Concern | Owner | Why |
| --- | --- | --- |
| Firing a dose reminder | Device (`expo-notifications`) | Must work offline and on time |
| Deciding a dose was missed | Device | Follows directly from the reminder it fired |
| Durable dose history | Server (`DoseLog`) | Survives reinstalls; readable from any device |
| Multi-device sync | Server (`POST /sync`) | A schedule edited on a tablet must reach the phone |
| Low-stock refill flag | Server (`node-cron`, daily 08:00) | Not time-critical, and must work with the app closed |
| Caregiver escalation | Server | Reaches someone other than the patient |

### Key modules

| File | Role |
| --- | --- |
| `lib/notification-scheduler.ts` | All `expo-notifications` interaction: permissions, the Android channel, the dose category and its action buttons, scheduling and cancelling |
| `lib/dose-schedule.ts` | Pure date math — turns a schedule into concrete dose times. No native imports, so it is unit-tested (`lib/__tests__/dose-schedule.test.ts`) |
| `lib/dose-actions.ts` | The `pending -> taken \| missed \| snoozed` state machine, plus the offline outbox |
| `hooks/use-medications.ts` | Pulls data, rebuilds the local reminders, merges slots with server logs |

> The deliverable named this module `notificationScheduler.ts`; it is
> `notification-scheduler.ts` here because every other file in `lib/` is
> kebab-case (`api-config.ts`, `auth-storage.ts`, `theme-context.ts`).

### How each frequency is scheduled

- **`daily`** — one repeating `DAILY` trigger per time of day.
- **`weekly`** — one repeating `WEEKLY` trigger per (weekday, time) pair.
- **`every_n_hours`** — a *single* `DATE` trigger for the next dose only. Each
  firing schedules its successor. A repeating trigger cannot express "every 6
  hours from a fixed anchor", and pre-scheduling a long chain would blow past
  iOS's 64-pending-notification limit.

Repeating triggers carry the payload they were created with, so on their second
and later firings the embedded `scheduledAt` is stale. `resolveOccurrence()` in
`lib/dose-actions.ts` recomputes the real slot from the delivery time.

### Timezones

Schedules store wall-clock strings (`"08:00"`), never instants. Everything in
`lib/dose-schedule.ts` resolves them against the *device's current local time*,
which makes a timezone change self-healing: after the user lands, recomputing
the same `"08:00"` yields 08:00 in the new zone, and the next sync rebuilds
every pending notification. `user.timezone` on the server is written on sync so
history renders in the user's own day boundaries — it is not an input to the
scheduling math.

### Testing notifications: Expo Go vs a development build

**Reminders do not work in Expo Go in this project.** `expo-notifications`
throws at import time inside Expo Go (push-token auto-registration was removed
in SDK 53), so `lib/notification-scheduler.ts` `require`s it lazily and only
outside Expo Go — the same guard `lib/permissions.ts` already uses. In Expo Go
every scheduling call is a no-op and the Today screen shows an explanatory
banner instead of pretending reminders are armed.

To test reminders for real, use a development build:

```bash
npx expo run:android      # or: npx expo run:ios
# or build one via EAS:
npx eas build --profile development --platform android
```

What needs which runtime:

| What you want to test | Expo Go | Dev build |
| --- | --- | --- |
| Screens, schedule builder, history, refills | ✅ | ✅ |
| Dose date math (`npm test`) | ✅ (plain Jest) | ✅ |
| A local notification actually firing | ❌ | ✅ |
| "Mark as taken" / "Snooze" action buttons | ❌ | ✅ |
| Responding from the notification shade | ❌ | ✅ |
| **Remote push** (the caregiver alert, if you wire delivery) | ❌ | ✅ EAS or dev build only |

Tips for exercising it quickly on a dev build:

1. Add a medicine with an `every_n_hours` schedule and an interval of `1`, then
   set the device clock forward — the chain reschedules on each firing, so you
   can watch several hops.
2. A `daily` time two minutes out is the fastest way to see a first firing.
3. Background or fully quit the app before the fire time. Both action buttons
   use `opensAppToForeground: false`, so the interesting path is the one where
   the app is *not* in the foreground. `drainLastResponse()` reconciles the
   response that launched the app; a burst answered while it was killed is
   recovered from the server's dose logs on the next sync.
4. Kill the network to confirm responses queue: `flushDoseOutbox()` replays them
   on the next foreground, and the `POST /dose-logs` upsert is idempotent on
   `(scheduleId, scheduledAt)`, so replays cannot double-count.

### Server setup

`node-cron` is the only new dependency. The daily refill sweep starts with the
API and is configurable:

```bash
REFILL_CHECK_CRON="0 8 * * *"     # default
REFILL_CHECK_TZ="Asia/Kolkata"    # default
```

### Caregiver alerts are recorded, not delivered

`server/src/services/caregiver.service.js` records the escalation on the dose
log and returns `delivered: false`. There is no mail transport or push
infrastructure in this project, so nothing is actually sent — the escalation is
visible through `GET /dose-logs`. To deliver it, add a transport and replace the
marked block in that file; the call site and the `caregiverEmail` field are
already wired.

### Endpoints

All under `/api/v1/medications`, all behind the existing `authenticate`
middleware, all scoped to the token's user.

```
GET    /                    list medications
POST   /                    create medication
PATCH  /:id                 update medication
DELETE /:id                 delete medication + its schedules (history kept)

GET    /schedules           list schedules
POST   /schedules           create schedule
PATCH  /schedules/:id       update schedule
DELETE /schedules/:id       delete schedule

POST   /dose-logs           record a dose response (idempotent)
GET    /dose-logs?from&to   adherence history + summary (default: 30 days)

POST   /sync                pull changes from other devices; reports timezone
GET    /refills             medications the daily job flagged as low
PATCH  /profile             update timezone / caregiverEmail
```
