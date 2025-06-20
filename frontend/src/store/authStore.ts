import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { User, AuthTokens, LoginRequest, RegisterRequest } from '@/types';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearError: () => void;
  checkAuth: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.auth.login(credentials);
          const { user, tokens } = response.data.data;
          
          set({
            user,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          toast.success('Login successful!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.auth.register(userData);
          const { user, tokens } = response.data.data;
          
          set({
            user,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          toast.success('Registration successful!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: () => {
        // Call logout API (fire and forget)
        apiClient.auth.logout().catch(() => {
          // Ignore errors on logout
        });
        
        set({
          ...initialState,
        });
        
        toast.success('Logged out successfully');
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        try {
          const decoded = jwtDecode<JwtPayload>(accessToken);
          
          set({
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
          });
          
          // If we don't have user data, fetch it
          if (!get().user) {
            get().checkAuth();
          }
        } catch (error) {
          console.error('Invalid token:', error);
          get().logout();
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          // Check if token is expired
          const decoded = jwtDecode<JwtPayload>(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expired, try to refresh
            const { refreshToken } = get();
            if (refreshToken) {
              const response = await apiClient.auth.refreshToken(refreshToken);
              const { accessToken } = response.data.data;
              get().setTokens(accessToken, refreshToken);
            } else {
              get().logout();
              return;
            }
          }

          // Fetch user profile if we don't have it
          if (!get().user) {
            const response = await apiClient.users.getProfile();
            set({ user: response.data.data });
          }
          
          set({ isAuthenticated: true });
        } catch (error) {
          console.error('Auth check failed:', error);
          get().logout();
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.users.updateProfile(data);
          const updatedUser = response.data.data;
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
          
          toast.success('Profile updated successfully!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Profile update failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await apiClient.users.changePassword({
            currentPassword,
            newPassword,
          });
          
          set({
            isLoading: false,
            error: null,
          });
          
          toast.success('Password changed successfully!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Password change failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth check on store creation
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}
