import { getConfig } from './config.js'

// Mock sign-in identity for `mock` auth mode (no credentials needed).
//
// Mock mode lets a service run for demos and UCD / user research — a local
// staff identity is used, so no real Entra credentials are required. The mock
// identity carries the app's configured `roleValues` so the mock user satisfies
// whatever role a consuming project guards on.
export function buildMockEntraIdentity() {
  return {
    subject: 'urn:entra:staff-demo',
    email: 'staff.user@example.gov.uk',
    firstName: 'Sam',
    lastName: 'Taylor',
    name: 'Sam Taylor',
    roles: getConfig().entra.roleValues || [],
    sessionId: 'mock-session-entra-staff'
  }
}
