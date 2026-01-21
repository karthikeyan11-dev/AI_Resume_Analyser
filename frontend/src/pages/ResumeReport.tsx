import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { resumeApi } from '../api/client'
import { 
  ArrowLeft, 
  Sparkles, 
  Briefcase, 
  Target, 
  TrendingUp, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Award,
  MapPin,
  RefreshCw,
  FileText
} from 'lucide-react'

const ResumeReport = () => {
  const { id } = useParams<{ id: string }>()

  const { data: report, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['resume-report', id],
    queryFn: async () => {
      const response = await resumeApi.getFullReport(id!, { skillGaps: true })
      return response.data.data
    },
    enabled: !!id,
    retry: 1,
  })

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600 bg-success-50 border-success-200'
    if (score >= 60) return 'text-warning-600 bg-warning-50 border-warning-200'
    return 'text-danger-600 bg-danger-50 border-danger-200'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: 'Excellent Match', color: 'badge-success' }
    if (score >= 60) return { text: 'Good Match', color: 'badge-warning' }
    return { text: 'Partial Match', color: 'badge-danger' }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'badge-danger'
      case 'medium': return 'badge-warning'
      default: return 'badge-primary'
    }
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/resumes" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/resumes" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Resume Report</h1>
        </div>
        <div className="card text-center py-12">
          <AlertTriangle className="w-16 h-16 text-warning-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Unable to load report</h3>
          <p className="text-gray-500 mb-4">
            {(error as any)?.response?.data?.error?.message || 'Please try again later'}
          </p>
          <button onClick={() => refetch()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { resume, analysis, matches, recommendations, marketFit } = report

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/resumes" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1">Resume Analysis Report</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {resume?.fileName}
            </p>
          </div>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          className="btn-outline gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-primary-600 mb-1">{analysis?.atsScore || 0}%</p>
          <p className="text-sm text-gray-500">ATS Score</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 rounded-2xl bg-success-50 flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6 text-success-600" />
          </div>
          <p className="text-3xl font-bold text-success-600 mb-1">{matches?.length || 0}</p>
          <p className="text-sm text-gray-500">Job Matches</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-secondary-600" />
          </div>
          <p className="text-3xl font-bold text-secondary-600 mb-1">{analysis?.experienceLevel || 'N/A'}</p>
          <p className="text-sm text-gray-500">Experience Level</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 rounded-2xl bg-warning-50 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-warning-600" />
          </div>
          <p className="text-3xl font-bold text-warning-600 mb-1">{analysis?.skills?.length || 0}</p>
          <p className="text-sm text-gray-500">Skills Detected</p>
        </div>
      </div>

      {/* Skills Section */}
      {analysis?.skills?.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success-600" />
            Your Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {(analysis.skills as string[]).map((skill, i) => (
              <span key={i} className="badge-primary">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* All Matched Jobs */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-600" />
            All Matched Jobs ({matches?.length || 0})
          </h2>
        </div>

        {matches?.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match: any, index: number) => (
              <div 
                key={match.id || index} 
                className={`p-5 border rounded-xl hover:shadow-md transition-all ${
                  index === 0 ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Rank & Score */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                    <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center border ${getScoreColor(match.overallScore)}`}>
                      <span className="text-xl font-bold">{match.overallScore}%</span>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{match.job?.title}</h3>
                        <p className="text-gray-600">{match.job?.company}</p>
                      </div>
                      <span className={getScoreBadge(match.overallScore).color}>
                        {getScoreBadge(match.overallScore).text}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                      {match.job?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {match.job.location}
                        </span>
                      )}
                      {match.job?.jobType && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {match.job.jobType.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Matched Skills */}
                    {match.matchedSkills?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-success-500" /> Matched Skills:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(match.matchedSkills as string[]).slice(0, 8).map((skill, i) => (
                            <span key={i} className="badge-success text-xs">{skill}</span>
                          ))}
                          {match.matchedSkills.length > 8 && (
                            <span className="badge bg-gray-100 text-gray-600 text-xs">
                              +{match.matchedSkills.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills */}
                    {match.missingSkills?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-warning-500" /> Missing Skills:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(match.missingSkills as string[]).slice(0, 8).map((skill, i) => (
                            <span key={i} className="badge-warning text-xs">{skill}</span>
                          ))}
                          {match.missingSkills.length > 8 && (
                            <span className="badge bg-gray-100 text-gray-600 text-xs">
                              +{match.missingSkills.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Match Explanation */}
                    {match.matchExplanation && (
                      <p className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3 mt-3">
                        {match.matchExplanation}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link 
                      to={`/jobs/${match.job?.id}`}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      View Job
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No job matches found yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Jobs will appear here when recruiters post positions matching your skills.
            </p>
          </div>
        )}
      </div>

      {/* AI Recommendations */}
      {recommendations && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Course Recommendations */}
          {recommendations.courseRecommendations?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Recommended Courses</h2>
                  <p className="text-gray-500 text-sm">Based on skill gaps</p>
                </div>
              </div>
              <div className="space-y-3">
                {recommendations.courseRecommendations.slice(0, 5).map((course: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-medium mb-1">{course.courseName}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{course.provider}</span>
                      <span className="badge-primary">{course.skill}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Path */}
          {recommendations.learningPath?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Learning Path</h2>
                  <p className="text-gray-500 text-sm">Prioritized skills to learn</p>
                </div>
              </div>
              <div className="space-y-3">
                {recommendations.learningPath.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.skill}</span>
                      <span className={getPriorityColor(item.priority <= 2 ? 'high' : item.priority <= 4 ? 'medium' : 'low')}>
                        Priority {item.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">Est. time: {item.estimatedTime}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Market Fit Section */}
      {marketFit && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Market Fit Analysis</h2>
              <p className="text-gray-500 text-sm">How your profile aligns with market demand</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-primary-600 mb-1">{marketFit.overallScore || 0}%</p>
              <p className="text-sm text-gray-500">Market Fit Score</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-success-600 mb-1">{marketFit.demandLevel || 'N/A'}</p>
              <p className="text-sm text-gray-500">Skills Demand</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-secondary-600 mb-1">{marketFit.competitionLevel || 'N/A'}</p>
              <p className="text-sm text-gray-500">Competition</p>
            </div>
          </div>
        </div>
      )}

      {/* ATS Issues & Suggestions */}
      {(analysis?.atsIssues?.length > 0 || analysis?.atsSuggestions?.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {analysis?.atsIssues?.length > 0 && (
            <div className="card border-l-4 border-l-warning-500">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning-500" />
                ATS Issues ({analysis.atsIssues.length})
              </h3>
              <ul className="space-y-2">
                {(analysis.atsIssues as string[]).map((issue, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-warning-500 mt-1">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis?.atsSuggestions?.length > 0 && (
            <div className="card border-l-4 border-l-success-500">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success-500" />
                Suggestions ({analysis.atsSuggestions.length})
              </h3>
              <ul className="space-y-2">
                {(analysis.atsSuggestions as string[]).map((suggestion, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-success-500 mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResumeReport
