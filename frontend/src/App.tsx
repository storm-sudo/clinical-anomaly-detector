import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { PageShell } from './components/layout/PageShell'

// Import Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import DatasetDetail from './pages/DatasetDetail'
import NewAnalysis from './pages/NewAnalysis'
import AnalysisDetail from './pages/AnalysisDetail'
import AnomalyExplorer from './pages/AnomalyExplorer'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

// Protected Route Guard Component
interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <PageShell>{children}</PageShell>
}

// Redirect if already authenticated Component
interface PublicRouteProps {
  children: React.ReactNode
}

function PublicRoute({ children }: PublicRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen text-gray-900 selection:bg-gray-200 selection:text-gray-900" style={{ backgroundColor: '#FAF7F2' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />

          {/* Protected Dashboard Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/datasets" 
            element={
              <ProtectedRoute>
                <Datasets />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/datasets/:id" 
            element={
              <ProtectedRoute>
                <DatasetDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analyses/new" 
            element={
              <ProtectedRoute>
                <NewAnalysis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analyses/:id" 
            element={
              <ProtectedRoute>
                <AnalysisDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/anomalies" 
            element={
              <ProtectedRoute>
                <AnomalyExplorer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* React Hot Toast */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#111111',
              border: '1px solid #E6E1DA',
              borderRadius: '12px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </div>
    </BrowserRouter>
  )
}
