// Downstream permissions / enrolment resolution.
//
// The IdP authenticates the person but NOT their permission set — in a real
// service that lives in the line-of-business enrolment record, resolved
// downstream. Here it is simulated so a consuming service can exercise
// role + scope-based access without a backend.

const DEFAULT_SCOPE = 'user'

// Human-readable label per internal role (shown on the account page / header).
const ROLE_LABELS = {
  case_officer: 'Case officer'
}

export async function getPermissions(profile) {
  // Key strictly off a recognised role. A blank/unknown role (e.g. an Entra user
  // whose token carries none of the configured role values) gets no role
  // privileges — it must NOT be granted case-officer access.
  const roleKey = ROLE_LABELS[profile?.role] ? profile.role : ''

  if (!roleKey) {
    return { role: '', scope: [DEFAULT_SCOPE] }
  }

  return {
    role: ROLE_LABELS[roleKey],
    scope: [DEFAULT_SCOPE, roleKey]
  }
}
