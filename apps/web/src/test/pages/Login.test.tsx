import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Login } from '../../pages/Login'

function renderLogin(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <Login />
    </MemoryRouter>,
  )
}

describe('login page', () => {
  it('renders the page heading', () => {
    renderLogin()
    expect(screen.getByText('OG Image Generator')).toBeInTheDocument()
  })

  it('renders the GitHub sign-in link', () => {
    renderLogin()
    const link = screen.getByTestId('github-login-btn')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/auth/github')
    expect(link).toHaveTextContent('Sign in with GitHub')
  })

  it('does not show error banner when no error param', () => {
    renderLogin()
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })

  it('shows unauthorized error when error=unauthorized query param is present', () => {
    renderLogin('?error=unauthorized')
    expect(screen.getByTestId('login-error')).toBeInTheDocument()
    expect(screen.getByTestId('login-error')).toHaveTextContent('not authorized')
  })

  it('does not show error for unknown error values', () => {
    renderLogin('?error=somethingelse')
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument()
  })
})
