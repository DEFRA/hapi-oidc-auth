// Mock sign-in identities for `mock` auth mode (no credentials needed).
//
// Mock mode lets a service run for demos and UCD / user research. The applicant
// carries two organisations to exercise the org/relationship-selection journey.

// Defra Identity is the applicant IdP only (case officers use Entra), so there is
// a single mock applicant identity here.
export function buildMockDefraIdIdentity() {
  return {
    subject: 'urn:fcp:defra-id:applicant-demo',
    email: 'applicant@example.com',
    firstName: 'Alex',
    lastName: 'Applicant',
    name: 'Alex Applicant',
    organisationId: '5566778',
    organisations: [
      {
        relationshipId: '5566778',
        organisationId: '5566778',
        organisationName: 'Grower Farms Ltd'
      },
      {
        relationshipId: '9988776',
        organisationId: '9988776',
        organisationName: 'Upland Estates'
      }
    ],
    roles: ['applicant'],
    role: 'applicant',
    sessionId: 'mock-session-applicant'
  }
}

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
