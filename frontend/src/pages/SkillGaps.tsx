import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { matchApi, resumeApi, jobApi } from '../api/client'
import { 
  TrendingUp, 
  BookOpen, 
  Target, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle,
  ChevronDown,
  Briefcase,
  FileText,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'

const SkillGaps = () => {
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Get user's analyzed resumes
  const { data: resumes, isLoading: loadingResumes } = useQuery({
    queryKey: ['resumes-analyzed'],
    queryFn: async () => {
      const response = await resumeApi.getAll({ status: 'ANALYZED' })
      return response.data.data
    },
  })

  // Get active jobs for selection
  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['active-jobs'],
    queryFn: async () => {
      const response = await jobApi.getActive({ limit: 50 })
      return response.data.data
    },
  })

  // Auto-select first resume if available
  useMemo(() => {
    if (resumes?.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id)
    }
  }, [resumes, selectedResumeId])

  // Get skill gap for selected resume and job
  const { data: skillGapData, isLoading: loadingSkillGap } = useQuery({
    queryKey: ['skill-gap', selectedResumeId, selectedJobId],
    queryFn: async () => {
      if (!selectedResumeId || !selectedJobId) return null
      const response = await matchApi.getSkillGap(selectedResumeId, selectedJobId)
      return response.data.data
    },
    enabled: !!selectedResumeId && !!selectedJobId,
  })

  // Get general recommendations
  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const response = await matchApi.getRecommendations()
      return response.data.data
    },
  })

  // Get all skill gaps for user
  const { data: allSkillGaps, isLoading: loadingGaps } = useQuery({
    queryKey: ['skill-gaps'],
    queryFn: async () => {
      const response = await matchApi.getUserSkillGaps()
      return response.data.data
    },
  })

  const isLoading = loadingResumes || loadingRecs || loadingGaps

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'badge-danger'
      case 'medium': return 'badge-warning'
      default: return 'badge-primary'
    }
  }

  const getPriorityBg = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-danger-50 border-danger-200 text-danger-700'
      case 'medium': return 'bg-warning-50 border-warning-200 text-warning-700'
      default: return 'bg-primary-50 border-primary-200 text-primary-700'
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  // No resumes state
  if (!resumes?.length) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Skill Gap Analysis</h1>
          <p className="text-gray-600">Identify skills to develop and boost your career</p>
        </div>
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Analyzed Resumes</h3>
          <p className="text-gray-500 mb-6">
            Upload and analyze a resume first to get personalized skill gap insights
          </p>
          <Link to="/resumes" className="btn-primary">
            Upload Resume
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Skill Gap Analysis</h1>
        <p className="text-gray-600">Identify skills to develop and boost your career</p>
      </div>

      {/* Selection Controls */}
      <div className="card">
        <h3 className="font-semibold mb-4">Select Resume & Target Job</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Resume Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Resume
            </label>
            <div className="relative">
              <select
                value={selectedResumeId || ''}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white appearance-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
              >
                {resumes?.map((resume: any) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.fileName} ({resume.analysis?.atsScore || 0}% ATS)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Job Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Job Role
            </label>
            <div className="relative">
              <select
                value={selectedJobId || ''}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white appearance-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                disabled={loadingJobs}
              >
                <option value="">Select a job role...</option>
                {jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {!jobs?.length && !loadingJobs && (
              <p className="mt-2 text-sm text-gray-500">
                No job listings available. Skill gaps will be based on general recommendations.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Targeted Skill Gap Analysis */}
      {selectedJobId && (
        <div className="card border-l-4 border-l-primary-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Targeted Skill Gap</h2>
              <p className="text-gray-500 text-sm">For your selected job role</p>
            </div>
          </div>

          {loadingSkillGap ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              <span className="ml-2 text-gray-500">Analyzing skills...</span>
            </div>
          ) : skillGapData ? (
            <div className="space-y-6">
              {/* Missing Skills */}
              {skillGapData.missingSkills?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-500" />
                    Missing Skills ({skillGapData.missingSkills.length})
                  </h4>
                  <div className="grid gap-2">
                    {skillGapData.missingSkills.map((skill: any, i: number) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg border ${getPriorityBg(skill.importance)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{skill.skill}</span>
                          <span className={getPriorityColor(skill.importance)}>
                            {skill.importance} priority
                          </span>
                        </div>
                        {skill.description && (
                          <p className="text-sm opacity-80">{skill.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Path */}
              {skillGapData.learningPath?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-secondary-500" />
                    Learning Path
                  </h4>
                  <div className="space-y-2">
                    {skillGapData.learningPath.slice(0, 5).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-600 font-bold text-sm">
                          {item.priority}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{item.skill}</p>
                          <p className="text-sm text-gray-500">Est. time: {item.estimatedTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estimated Time */}
              {skillGapData.estimatedTime && (
                <div className="p-4 bg-success-50 rounded-lg text-center">
                  <p className="text-sm text-success-600 mb-1">Estimated time to become a strong candidate</p>
                  <p className="text-2xl font-bold text-success-700">{skillGapData.estimatedTime}</p>
                </div>
              )}

              {/* Course Recommendations */}
              {skillGapData.courseRecommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-500" />
                    Recommended Courses
                  </h4>
                  <div className="grid gap-2">
                    {skillGapData.courseRecommendations.slice(0, 5).map((course: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{course.courseName}</p>
                          <p className="text-sm text-gray-500">{course.provider}</p>
                        </div>
                        <span className="badge-primary">{course.skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Select a job role to see targeted skill gap analysis
            </p>
          )}
        </div>
      )}

      {/* General Recommendations */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Missing Skills */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Top Missing Skills</h2>
              <p className="text-gray-500 text-sm">Skills most requested across job matches</p>
            </div>
          </div>
          
          {recommendations?.topMissingSkills?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recommendations.topMissingSkills.map((skill: string, i: number) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 bg-warning-50 text-warning-700 rounded-xl"
                >
                  <Target className="w-4 h-4" />
                  <span className="font-medium">{skill}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Match with job listings to see missing skills
            </p>
          )}
        </div>

        {/* Resume Improvements */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Resume Improvements</h2>
              <p className="text-gray-500 text-sm">Suggestions to enhance your resume</p>
            </div>
          </div>
          
          {recommendations?.resumeImprovements?.length > 0 ? (
            <div className="space-y-3">
              {recommendations.resumeImprovements.map((tip: string, i: number) => (
                <div key={i} className="flex gap-3 p-4 bg-success-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                  <p className="text-success-800 text-sm">{tip}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No suggestions yet</p>
          )}
        </div>
      </div>

      {/* Course Recommendations */}
      {recommendations?.recommendedCourses?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Recommended Courses</h2>
              <p className="text-gray-500 text-sm">Curated learning resources</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.recommendedCourses.slice(0, 6).map((course: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
                <p className="font-medium mb-2">{course.courseName}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{course.provider}</span>
                  <span className="badge-primary">{course.skill}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Gaps by Job */}
      {allSkillGaps && allSkillGaps.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-secondary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Skill Gaps by Job</h2>
              <p className="text-gray-500 text-sm">Detailed analysis for each job match</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {allSkillGaps.slice(0, 5).map((gap: any) => (
              <div key={gap.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{gap.job?.title}</p>
                    <p className="text-sm text-gray-500">{gap.job?.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Est. time</p>
                    <p className="font-medium">{gap.estimatedTime || 'N/A'}</p>
                  </div>
                </div>
                
                {(gap.missingSkills as any[])?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(gap.missingSkills as any[]).map((skill: any, i: number) => (
                      <span 
                        key={i} 
                        className={`badge ${getPriorityColor(skill.importance)}`}
                      >
                        {skill.skill}
                      </span>
                    ))}
                  </div>
                )}

                <Link 
                  to={`/jobs/${gap.job?.id}`}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  View Job <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!recommendations?.topMissingSkills?.length && !allSkillGaps?.length && !selectedJobId) && (
        <div className="card text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Skill Gap Data Yet</h3>
          <p className="text-gray-500 mb-4">
            Select a target job role above, or explore job matches to get personalized skill gap analysis
          </p>
          <Link to="/matches" className="btn-primary">
            View Job Matches
          </Link>
        </div>
      )}
    </div>
  )
}

export default SkillGaps
