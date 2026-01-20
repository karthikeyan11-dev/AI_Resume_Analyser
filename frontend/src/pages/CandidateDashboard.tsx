import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { FileText, Target, TrendingUp, Award, ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const CandidateDashboard = () => {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['candidate-dashboard'],
    queryFn: async () => {
      const response = await dashboardApi.getCandidate()
      return response.data.data
    },
  })

  const stats = [
    { label: 'Total Resumes', value: data?.stats?.totalResumes || 0, icon: FileText, color: 'primary' },
    { label: 'Analyzed', value: data?.stats?.analyzedResumes || 0, icon: Sparkles, color: 'secondary' },
    { label: 'ATS Score', value: `${data?.stats?.averageAtsScore || 0}%`, icon: Award, color: 'success' },
    { label: 'Job Matches', value: data?.stats?.totalJobMatches || 0, icon: Target, color: 'warning' },
  ]

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-600',
    secondary: 'bg-secondary-100 text-secondary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
  }

  // Chart data for ATS score trends
  const chartData = {
    labels: data?.scoreTrends?.map(() => '') || ['', '', '', '', ''],
    datasets: [
      {
        label: 'ATS Score',
        data: data?.scoreTrends?.map((t: any) => t.score) || [65, 70, 75, 80, 85],
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { display: false },
      y: { display: false, min: 0, max: 100 },
    },
  }

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
      <div className="bg-gradient-primary rounded-3xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-white/80 text-lg">
          Here's an overview of your career progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className={`w-12 h-12 rounded-xl ${colorMap[stat.color]} flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latest Resume */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Latest Resume</h2>
            <Link to="/resumes" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {data?.latestResume ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold truncate">{data.latestResume.fileName}</p>
                  <p className="text-sm text-gray-500">{data.latestResume.experienceLevel}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{data.latestResume.atsScore}%</p>
                  <p className="text-xs text-gray-500">ATS Score</p>
                </div>
              </div>
              
              {data.latestResume.topSkills && (
                <div className="flex flex-wrap gap-2">
                  {data.latestResume.topSkills.map((skill: string, i: number) => (
                    <span key={i} className="badge-primary">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No resumes uploaded yet</p>
              <Link to="/resumes" className="btn-primary text-sm">
                Upload Resume
              </Link>
            </div>
          )}
        </div>

        {/* Score Trend */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">ATS Score Trend</h2>
          <div className="h-40">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Top Job Matches */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Top Job Matches</h2>
            <Link to="/matches" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {data?.topJobMatches?.length > 0 ? (
            <div className="space-y-3">
              {data.topJobMatches.map((match: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold">
                    {match.matchScore}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{match.jobTitle}</p>
                    <p className="text-sm text-gray-500 truncate">{match.company}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No job matches yet</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recommendations</h2>
            <Link to="/skill-gaps" className="text-primary-600 text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {data?.recommendations?.length > 0 ? (
            <div className="space-y-3">
              {data.recommendations.map((rec: any, index: number) => (
                <div key={index} className="p-4 rounded-xl bg-warning-50 border border-warning-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-warning-600" />
                    <span className="font-medium text-warning-800">{rec.jobTitle}</span>
                  </div>
                  <p className="text-sm text-warning-700">
                    {rec.missingSkillsCount} skills to improve for {rec.company}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Complete your profile for recommendations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboard
