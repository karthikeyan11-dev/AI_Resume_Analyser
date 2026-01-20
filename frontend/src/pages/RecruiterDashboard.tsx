import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Briefcase, Users, CheckCircle, Star, ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

const RecruiterDashboard = () => {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-dashboard'],
    queryFn: async () => {
      const response = await dashboardApi.getRecruiter()
      return response.data.data
    },
  })

  const stats = [
    { label: 'Total Jobs', value: data?.stats?.totalJobs || 0, icon: Briefcase, color: 'bg-primary-100 text-primary-600' },
    { label: 'Active Jobs', value: data?.stats?.activeJobs || 0, icon: CheckCircle, color: 'bg-success-50 text-success-600' },
    { label: 'Candidates', value: data?.stats?.totalCandidates || 0, icon: Users, color: 'bg-secondary-100 text-secondary-600' },
    { label: 'Shortlisted', value: data?.stats?.shortlistedCandidates || 0, icon: Star, color: 'bg-warning-50 text-warning-600' },
  ]

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-3xl p-8 text-white flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-white/80 text-lg">
            Manage your job postings and find the best candidates
          </p>
        </div>
        <Link to="/jobs" className="btn bg-white text-primary-600 hover:bg-white/90 gap-2">
          <Plus className="w-5 h-5" />
          Post New Job
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Job Postings</h2>
            <Link to="/jobs" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {data?.recentJobs?.length > 0 ? (
            <div className="space-y-3">
              {data.recentJobs.map((job: any, index: number) => (
                <Link 
                  key={index} 
                  to={`/jobs/${job.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.company}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${
                      job.status === 'ACTIVE' ? 'badge-success' : 
                      job.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {job.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{job.candidateCount} candidates</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No job postings yet</p>
              <Link to="/jobs" className="btn-primary text-sm">
                Create First Job
              </Link>
            </div>
          )}
        </div>

        {/* Top Candidates */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Top Candidates</h2>
          
          {data?.topCandidates?.length > 0 ? (
            <div className="space-y-3">
              {data.topCandidates.slice(0, 5).map((candidate: any, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center text-white font-bold">
                    {candidate.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{candidate.name}</p>
                    <p className="text-sm text-gray-500">{candidate.experienceLevel} • {candidate.jobTitle}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-600">{candidate.matchScore}%</div>
                    <span className={`badge text-xs ${
                      candidate.status === 'SHORTLISTED' ? 'badge-success' :
                      candidate.status === 'REJECTED' ? 'badge-danger' : 'badge-primary'
                    }`}>
                      {candidate.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No candidates yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Average Match Score */}
      <div className="card bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 mb-1">Average Match Score</p>
            <p className="text-4xl font-bold">{data?.stats?.avgMatchScore || 0}%</p>
          </div>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <Star className="w-10 h-10" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecruiterDashboard
