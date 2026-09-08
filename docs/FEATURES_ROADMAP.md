# CureLiynk — What's Done, What's Missing, and What to Build Next

This document is written in simple English on purpose, so anyone on the team can
read it — not just developers. It answers three questions:

1. What already works in the app today?
2. What is missing or just a placeholder ("Coming Soon")?
3. What should you build next, and in what order, to make CureLiynk a complete,
   successful healthcare app?

This was written by reading through the actual code in `client/` (website),
`mobile/` (the Expo app), and `server/` (the backend), on 2026-08-26.

---

## Part 1: What Already Works Today (the good news)

### Backend (server)
- **Login & Sign-up system** for three kinds of accounts: Patient, Doctor, Admin.
  - Passwords are encrypted. Login uses secure tokens (JWT) that expire and can
    be refreshed.
  - Patients can also sign up / log in with **"Sign in with Google"**.
  - A doctor who signs up cannot log in until an Admin approves them.
- **AI Health Chat** — connects to Google's Gemini AI.
  - Patient describes symptoms → AI replies with a possible condition, how
    urgent it is, and which type of doctor (specialist) to see.
  - Safety rules are already built in: it never gives a final diagnosis, never
    prescribes medicine, and tells the user to immediately call **108**
    (India's emergency number) for serious symptoms like chest pain or
    difficulty breathing.
  - Works in **English and Assamese**, with awareness of diseases common in
    Assam (malaria, dengue, Japanese encephalitis, etc.).
- **Find Doctors Nearby** — takes the specialist type the AI suggested and the
  patient's location, and searches **Google Maps** for real clinics/doctors
  near them (distance, rating, map link).
- **Location tools** — address search-as-you-type, "use my current location",
  and converting an address to map coordinates and back. Uses a free service
  (OpenStreetMap), so no cost here.
- **Admin tools (backend only — no screen yet, see Part 2)** — an admin can
  fetch the list of all patients and doctors, approve or reject a doctor's
  sign-up, turn accounts on/off, and see basic numbers (total users, total
  doctors, how many doctors are waiting for approval).

### Website (for computer/browser use)
- Login page and Sign-up page.
- Main Dashboard page.
- AI Health Assistant chat page — fully working, connected to the backend AI.
- Top menu bar and side menu.
- The address/location search box (with autocomplete).

### Mobile App
- Start-up flow: splash screen, choose language, choose who you're caring for
  (yourself / family / women's health / elderly), allow permissions
  (location, notifications).
- Login and Sign-up, including Google sign-in.
- Home screen: greeting, banners, feature tiles, "Ask AI" button.
- **"Find Doctors Near Me" results screen** — this is fully built and already
  connected to the backend Google Maps search described above.

---

## Part 2: What's Missing or Just a Placeholder

### Mobile App
- **AI Chat screen is not built yet.** Right now it only shows a "Coming
  Soon" message. The code even has a note: *"a teammate is building the real
  AI chat screen separately."* The backend AI already works (the website
  already uses it) — the mobile screen just needs to be built to call the
  same API. **This is very likely your #1 priority**, since AI symptom
  checking is the main reason people would open this app.
- **Medicine Reminder** — "Coming Soon" placeholder only.
- **Labs Near Me** — "Coming Soon" placeholder only.
- **Health Insurance** — "Coming Soon" placeholder only.
- **First Aid Guide** — "Coming Soon" placeholder only.

### Website
- These pages exist as files but are **completely empty** (0 lines of code —
  nothing would show if you opened them): Appointments, Health Records,
  Insurance, Lab Tests, Medical Products (shop), Messages, Prescriptions,
  Settings.
- Almost all the small reusable building blocks are empty too: Button, Card,
  Input, Modal, Loader, and the cards used for appointments/products/health
  records. This is why the pages above can't be built yet — the basic pieces
  aren't there.
- **Doctor Dashboard** and **Admin Dashboard** currently just show a "Coming
  soon" message on the website — even though the backend Admin API
  (approve doctors, manage users, view stats) is already fully built! Someone
  needs a screen to actually *use* that backend work, otherwise nobody can
  approve new doctors through the website.

### Backend (server) — not built at all yet
- **Appointment booking** — there is no database table and no API for this
  yet. Patients can find a doctor, but cannot actually book a visit.
- **Saved chat history** — there's a placeholder file for storing past AI
  conversations, but it's empty/unused. Right now, once a patient closes the
  chat, that conversation is gone.
- **Prescriptions** — nothing built yet.
- **Lab test booking** — nothing built yet.
- **Health records** (uploading/storing past reports and history) — nothing
  built yet.
- **Insurance** info or integration — nothing built yet.
- **Messaging** between patient and doctor — nothing built yet.
- **Medical products / pharmacy ordering** — nothing built yet.
- **Payments** — there is no payment system anywhere in the project yet (no
  Razorpay, Stripe, or similar).
- **Push notifications** — the mobile app has the notification library
  installed, but nothing is set up yet to actually send a reminder.
- **Doctor search only checks Google Maps, not your own database.** Right
  now "Find Doctors Near Me" searches Google Maps only. It does **not** also
  check the doctors who signed up directly on CureLiynk (the ones sitting in
  your own database, waiting for or already given admin approval). So a
  doctor who registers on your platform will not show up in search results —
  only real-world clinics found via Google Maps will. Worth confirming with
  your friend whether merging in your own database is still planned, since
  right now it's Google-only.

---

## Part 3: The Roadmap — What to Build, and in What Order

### Phase 1 — Finish the Half-Built Stuff (do this first)
Nothing new to invent here — just connect screens to work that already
exists, so the app feels "whole" instead of full of dead ends.

1. Build the **mobile AI Chat screen** and connect it to the already-working
   backend endpoint (`/api/v1/chat`) — the website's `AIHealthAssistant` page
   is a good reference for how the conversation flow should work.
2. Make **"Find Doctors Near Me" also check your own database** of approved
   doctors, not just Google Maps, and show both together.
3. **Save AI chat history** so a patient can look back at a past
   conversation instead of losing it.
4. Build the **Doctor Dashboard** and **Admin Dashboard** screens on the
   website. The backend for Admin already exists — right now nobody can
   actually approve a new doctor sign-up without going into the database by
   hand. This blocks your whole doctor-onboarding process.
5. Either build the empty website pages (Appointments, Health Records, etc.)
   or remove their links from the menu for now — a menu item that opens a
   blank page looks broken to a new user, even if it's "just not built yet."

### Phase 2 — Core Features Every Healthcare App Needs
These turn "the AI gave me advice" into "I actually got care" — the natural
next step after your AI + doctor-search flow.

1. **Appointment booking**: pick a doctor → pick a time slot → confirm → see
   it in "My Appointments" → cancel or reschedule. (The Doctor database
   already has fields ready for this: consultation fee, available time
   slots.)
2. **Health records**: let a patient upload and store past prescriptions,
   test reports, and history. A simple "upload a file and see a list" is
   enough for a first version.
3. **Medicine reminders**: notify the patient at the right time to take
   medicine. The mobile app already has the notification library installed
   and this screen already exists as a placeholder — it just needs the real
   logic behind it.
4. **Push notifications** in general: appointment reminders, medicine
   reminders, "your appointment was approved," etc.
5. **Profile & Settings**: edit profile, change password (backend already
   supports this), choose language, turn notifications on/off, log out.
6. **Doctor profile page**: show qualifications, experience, consultation
   fee, and a "Book Appointment" button. Most of this data already exists in
   the Doctor database — it just isn't shown anywhere yet.

### Phase 3 — Features That Make It a Real, Successful Business
1. **Ratings & reviews for doctors** — builds trust, helps patients choose.
2. **In-app messaging with a doctor** — even a simple version (ask one
   follow-up question after an appointment) adds a lot of value.
3. **Payments** — pay for a consultation, lab test, or medicine online.
   Razorpay or a similar Indian payment gateway is a common choice.
4. **Insurance page** — the AI already mentions government schemes
   (Ayushman Bharat, Atal Amrit Abhiyan) in its answers; give this its own
   real page instead of just a chat mention. Later, this could connect to
   real insurance providers.
5. **Lab test booking** — search a test, pick a lab, book home sample
   collection.
6. **Pharmacy / medical product ordering** — order medicine online.
7. **First Aid Guide** — this is a quick win: it's just static content (tips
   and steps), so it doesn't need the AI or any new backend work — just
   good, simple content.
8. **Emergency / SOS button** — one tap to call 108 or alert an emergency
   contact with your location. The AI chat already tells users to call 108
   during an emergency — turn that into an actual button, not just text.

### Phase 4 — Scale & Polish
1. **Video/voice consultation** with a doctor (telemedicine call).
2. **Doctor availability calendar** — the database field for this
   (`availableSlots`) already exists; it just needs a real screen.
3. **Analytics for Admin** — most common symptoms searched, busiest doctors,
   revenue, etc.
4. **More languages** — the AI prompt is already written in a way that makes
   adding a new language straightforward (it currently supports English and
   Assamese).
5. **Privacy Policy & Terms of Service pages** — none exist yet. Since this
   app handles medical/health information, this matters both legally (India's
   data protection law, the DPDP Act) and for user trust.
6. **Offline support** — for patchy network areas, things like medicine
   reminders should still work without internet.
7. **Automated tests** — the mobile app already has some tests written; the
   website and backend currently have none. Tests help catch bugs before
   they reach real patients, especially as more people work on the code.

---

## Part 4: Small But Important Things to Fix
These aren't "features," but they'll save you time and confusion later.

- **No `.env.example` file on the server.** Right now, if a new developer
  (or a future you, on a new computer) sets up the project, there's no list
  of which secret keys/settings are needed (Gemini API key, Google Maps key,
  database URL, etc.) without opening the real `.env` file. Add an example
  file with the key *names* but no real values.
- **No automated tests on the server or website** — only the mobile app has
  some.
- On the website, `routes/AppRoutes.jsx` is an empty, unused file — the
  actual page routing is written directly inside `App.jsx` instead. Not a
  bug, but good to know so you don't accidentally edit the wrong file.

---

## Quick Priority Cheat-Sheet

| Priority | Feature | Why it matters |
|---|---|---|
| 🔴 Now | Mobile AI Chat screen | Main reason people would use this app |
| 🔴 Now | Admin & Doctor dashboard screens | Nobody can approve doctors otherwise |
| 🔴 Now | Merge local doctor DB into search results | Your own registered doctors are currently invisible |
| 🟠 Next | Appointment booking | Turns advice into actual care |
| 🟠 Next | Health records + medicine reminders | Daily-use value, keeps users coming back |
| 🟠 Next | Save AI chat history | Basic expected feature, currently lost on close |
| 🟡 Later | Payments, ratings, messaging, lab booking, pharmacy | Business growth features |
| 🟢 Eventually | Video calls, analytics, more languages, offline mode | Scale & polish |

---

*Note: the AI model and the "search Google, then check our database" doctor
suggestion logic mentioned as your friend's part is confirmed working for the
Google Maps half. The "then check our local database" half does not appear
to be wired up yet in the code — worth a quick check-in with your friend to
see if that's still in progress or was deprioritized.*
