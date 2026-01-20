import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { matchApi, resumeApi } from '../api/client'
import { Target, Briefcase, ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const Matches = () => {
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)

  const { data: resumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const response = await resumeApi.getAll({ status: 'ANALYZED' })
      return response.data.data
    },
  })

  const { data: matches, isLoading } = useQuery({
    queryKey: ['job-matches', selectedResumeId],
    queryFn: async () => {
      const response = await matchApi.getMatchingJobs(selectedResumeId!)
      return response.data.data
    },
    enabled: !!selectedResumeId,
  })

  // Auto-select first resume
  if (resumes?.length > 0 && !selectedResumeId) {
    setSelectedResumeId(resumes[0].id)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600 bg-success-50'
    if (score >= 60) return 'text-warning-600 bg-warning-50'
    return 'text-danger-600 bg-danger-50'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Job Matches</h1>
        <p className="text-gray-600">Find the best jobs matching your skills</p>
      </div>

      {/* Resume Selector */}
      {resumes && resumes.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Select Resume</h3>
          <div className="flex flex-wrap gap-3">
            {resumes.map((resume: any) => (
              <button
                key={resume.id}
                onClick={() => setSelectedResumeId(resume.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedResumeId === resume.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Sparkles className={`w-5 h-5 ${
                  selectedResumeId === resume.id ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <div className="text-left">
                  <p className="font-medium truncate max-w-[200px]">{resume.fileName}</p>
                  <p className="text-sm text-gray-500">ATS: {resume.analysis?.atsScore || 0}%</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matches List */}
      {!selectedResumeId ? (
        <div className="card text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Upload a Resume First</h3>
          <p className="text-gray-500 mb-6">You need an analyzed resume to find job matches</p>
          <Link to="/resumes" className="btn-primary">
            Upload Resume
          </Link>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-32" />
          ))}
        </div>
      ) : matches?.length > 0 ? (
        <div className="grid gap-4">
          {matches.map((match: any) => (
            <div key={match.id} className="card hover:shadow-lg">
              <div className="flex items-start gap-6">
                {/* Match Score */}
                <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${getScoreColor(match.overallScore)}`}>
                  <span className="text-2xl font-bold">{match.overallScore}%</span>
                  <span className="text-xs">Match</span>
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold mb-1">{match.job.title}</h3>
                  <p className="text-gray-600 mb-3">{match.job.company}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    {match.job.location && <span>📍 {match.job.location}</span>}
                    {match.job.jobType && <span>🕒 {match.job.jobType.replace('_', ' ')}</span>}
                  </div>

                  {/* Matched Skills */}
                  {match.matchedSkills?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Matched Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {(match.matchedSkills as string[]).slice(0, 5).map((skill, i) => (
                          <span key={i} className="badge-success text-xs">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {match.missingSkills?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Missing Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {(match.missingSkills as string[]).slice(0, 5).map((skill, i) => (
                          <span key={i} className="badge-warning text-xs">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link 
                    to={`/jobs/${match.job.id}`}
                    className="btn-primary text-sm py-2 px-4 gap-1"
                  >
                    View Job <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/skill-gaps?resumeId=${selectedResumeId}&jobId=${match.job.id}`}
                    className="btn-outline text-sm py-2 px-4"
                  >
                    Skill Gap
                  </Link>
                </div>
              </div>

              {/* Match Explanation */}
              {match.matchExplanation && (
                <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                  {match.matchExplanation}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Matches Found</h3>
          <p className="text-gray-500">We couldn't find any jobs matching your resume</p>
        </div>
      )}
    </div>
  )
}

export default Matches
