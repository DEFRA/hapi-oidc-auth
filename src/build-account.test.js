import { buildAccount } from './build-account.js'

function fakeRequest(session) {
  return { yar: { get: () => session } }
}

describe('#buildAccount', () => {
  test('returns null when the request has no session store', () => {
    expect(buildAccount({})).toBeNull()
    expect(buildAccount(undefined)).toBeNull()
  })

  test('returns null when the user is signed out', () => {
    expect(buildAccount(fakeRequest({ isAuthenticated: false }))).toBeNull()
  })

  test('returns the name, role label and auth links when signed in', () => {
    const account = buildAccount(
      fakeRequest({
        isAuthenticated: true,
        name: 'Alex Applicant',
        role: 'applicant',
        roleLabel: 'Farmer'
      })
    )

    expect(account).toEqual({
      name: 'Alex Applicant',
      roleLabel: 'Farmer',
      accountUrl: '/auth/account',
      signOutUrl: '/auth/sign-out'
    })
  })

  test('falls back to the raw role when there is no role label', () => {
    const account = buildAccount(
      fakeRequest({
        isAuthenticated: true,
        name: 'Casey',
        role: 'case_officer'
      })
    )
    expect(account.roleLabel).toBe('case_officer')
  })
})
