import client from './client'
import type { TokenResponse, User } from '../types'

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const response = await client.post<TokenResponse>('/api/auth/login', {
      email,
      password,
    })
    return response.data
  },

  register: async (data: {
    name: string
    email: string
    password: string
    organization?: string
  }): Promise<User> => {
    const response = await client.post<User>('/api/auth/register', data)
    return response.data
  },

  me: async (): Promise<User> => {
    const response = await client.get<User>('/api/auth/me')
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await client.post<TokenResponse>('/api/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await client.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  updateMe: async (data: { name?: string; organization?: string }): Promise<User> => {
    const response = await client.put<User>('/api/auth/me', data)
    return response.data
  },
}
