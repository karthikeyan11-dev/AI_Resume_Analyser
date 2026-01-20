import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import CandidateDashboard from './pages/CandidateDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import Resumes from './pages/Resumes'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Matches from './pages/Matches'
import SkillGaps from './pages/SkillGaps'
import Profile from './pages/Profile'

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

// Public route that redirects authenticated users
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore()
  
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'RECRUITER' ? '/recruiter' : '/dashboard'} replace />
  }
  
  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={isAuthenticated ? <Layout /> : <Landing />}>
        {isAuthenticated && (
          <Route index element={<Navigate to="/dashboard" replace />} />
        )}
      </Route>
      
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Candidate routes */}
        <Route path="dashboard" element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <CandidateDashboard />
          </ProtectedRoute>
        } />
        <Route path="resumes" element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <Resumes />
          </ProtectedRoute>
        } />
        <Route path="matches" element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <Matches />
          </ProtectedRoute>
        } />
        <Route path="skill-gaps" element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <SkillGaps />
          </ProtectedRoute>
        } />
        
        {/* Recruiter routes */}
        <Route path="recruiter" element={
          <ProtectedRoute allowedRoles={['RECRUITER']}>
            <RecruiterDashboard />
          </ProtectedRoute>
        } />
        <Route path="jobs" element={
          <ProtectedRoute allowedRoles={['RECRUITER']}>
            <Jobs />
          </ProtectedRoute>
        } />
        <Route path="jobs/:id" element={
          <ProtectedRoute>
            <JobDetail />
          </ProtectedRoute>
        } />
        
        {/* Shared routes */}
        <Route path="profile" element={<Profile />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
