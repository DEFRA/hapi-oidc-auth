// Mock sign-in identity for `mock` auth mode (no credentials needed).
//
// Mock mode lets a service run for demos and UCD / user research — a local
// case-officer identity is used, so no real Entra credentials are required.
export function buildMockEntraIdentity() {
  return {
    subject: 'urn:entra:case-officer-demo',
    email: 'case.officer@example.gov.uk',
    firstName: 'Casey',
    lastName: 'Officer',
    name: 'Casey Officer',
    roles: ['case_officer'],
    role: 'case_officer',
    sessionId: 'mock-session-entra-case-officer'
  }
}
