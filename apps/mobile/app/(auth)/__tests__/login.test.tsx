import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import LoginScreen from '../login'
import { ApiError } from '../../../lib/api'

const mockLogin = jest.fn()

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

jest.mock('../../../lib/ThemeContext', () => ({
  useTheme: () => ({
    bg: '#fff',
    surface: '#fff',
    text: '#000',
    textMuted: '#666',
    textSubtle: '#999',
    accent: '#0EA5E9',
    brand: '#0EA5E9',
    border: '#e2e8f0',
    errorBg: '#fef2f2',
    errorText: '#dc2626',
  }),
  AppThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useThemePref: () => ({ mode: 'light' }),
}))

// Mock window dimensions for narrow layout
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  default: () => ({ width: 375, height: 812 }),
}))

describe('LoginScreen', () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  it('shows validation error when fields are empty', () => {
    render(<LoginScreen />)
    fireEvent.press(screen.getByText('Sign in'))
    expect(screen.getByText('Please enter your username/email and password')).toBeTruthy()
  })

  it('calls login with identifier and password', async () => {
    mockLogin.mockResolvedValue(undefined)
    render(<LoginScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('Email or username'), 'alice@example.com')
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123')
    fireEvent.press(screen.getByText('Sign in'))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ identifier: 'alice@example.com', password: 'password123' })
    })
  })

  it('shows error message when login fails', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'Invalid credentials'))
    render(<LoginScreen />)

    fireEvent.changeText(screen.getByPlaceholderText('Email or username'), 'alice@example.com')
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'wrong')
    fireEvent.press(screen.getByText('Sign in'))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy()
    })
  })
})
