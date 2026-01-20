import { useQuery } from '@tanstack/react-query'
import { matchApi } from '../api/client'
import { TrendingUp, BookOpen, Target, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react'

const SkillGaps = () => {
  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const response = await matchApi.getRecommendations()
      return response.data.data
    },
  })

  const { data: skillGaps, isLoading: loadingGaps } = useQuery({
    queryKey: ['skill-gaps'],
    queryFn: async () => {
      const response = await matchApi.getUserSkillGaps()
      return response.data.data
    },
  })

  const isLoading = loadingRecs || loadingGaps

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-200 rounded-2xl" />)}
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

      {/* Top Missing Skills */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Top Missing Skills</h2>
            <p className="text-gray-500 text-sm">Skills most requested across your job matches</p>
          </div>
        </div>
        
        {recommendations?.topMissingSkills?.length > 0 ? (
          <div className="flex flex-wrap gap-3">
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
            Upload resumes and match with jobs to see skill gaps
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Course Recommendations */}
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
          
          {recommendations?.recommendedCourses?.length > 0 ? (
            <div className="space-y-3">
              {recommendations.recommendedCourses.slice(0, 5).map((course: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium mb-1">{course.courseName}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{course.provider}</span>
                    <span className="badge-primary">{course.skill}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No course recommendations yet</p>
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

      {/* Detailed Skill Gaps by Job */}
      {skillGaps && skillGaps.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-secondary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Skill Gaps by Job</h2>
              <p className="text-gray-500 text-sm">Detailed analysis for each job match</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {skillGaps.slice(0, 5).map((gap: any) => (
              <div key={gap.id} className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{gap.job.title}</p>
                    <p className="text-sm text-gray-500">{gap.job.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Estimated time</p>
                    <p className="font-medium">{gap.estimatedTime || 'N/A'}</p>
                  </div>
                </div>
                
                {(gap.missingSkills as any[])?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(gap.missingSkills as any[]).map((skill, i) => (
                      <span 
                        key={i} 
                        className={`badge ${
                          skill.importance === 'high' ? 'badge-danger' :
                          skill.importance === 'medium' ? 'badge-warning' : 'badge-primary'
                        }`}
                      >
                        {skill.skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!recommendations?.topMissingSkills?.length && !skillGaps?.length) && (
        <div className="card text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Skill Gap Data</h3>
          <p className="text-gray-500">
            Upload a resume and explore job matches to get personalized skill gap analysis
          </p>
        </div>
      )}
    </div>
  )
}

export default SkillGaps
