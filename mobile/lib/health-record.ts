/**
 * Placeholder counts for the profile screen's health record and activity rows.
 *
 * None of these have a backend yet — the design specifies the rows, so they
 * render with representative values rather than empty. Replace this module
 * with the real record once the endpoint exists; the screen reads it as a
 * plain object and needs no other change.
 */
export const healthRecordSummary = {
  conditions: 2,
  /** Shown verbatim — a drug name, so it is not translated. */
  allergies: "Penicillin",
  medications: 3,
  conversations: 12,
  savedDoctors: 4,
  emergencyContacts: 2,
} as const;
