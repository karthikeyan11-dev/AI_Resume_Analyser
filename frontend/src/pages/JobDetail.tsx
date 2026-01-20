import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobApi, matchApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Briefcase, MapPin, DollarSign, Clock, X, Star } from 'lucide-react'
import toast from 'react-hot-toast'

const JobDetail = () => {
  const { id } = useParams()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isRecruiter = user?.role === 'RECRUITER'

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await jobApi.getById(id!)
      return response.data.data
    },
    enabled: !!id,
  })

  const { data: candidates } = useQuery({
    queryKey: ['job-candidates', id],
    queryFn: async () => {
      const response = await matchApi.getMatchingCandidates(id!)
      return response.data.data
    },
    enabled: !!id && isRecruiter,
  })

  const statusMutation = useMutation({
    mutationFn: ({ matchId, status }: { matchId: string; status: 'SHORTLISTED' | 'REJECTED' }) =>
      matchApi.updateStatus(matchId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-candidates', id] })
      toast.success('Status updated')
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  if (!job) {
    return <div className="text-center py-12 text-gray-500">Job not found</div>
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Job Header */}
      <div className="card bg-gradient-primary text-white">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-10 h-10" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            <p className="text-xl text-white/90 mb-4">{job.company}</p>
            <div className="flex flex-wrap gap-4 text-white/80">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {job.location}
                </span>
              )}
              {job.salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> {job.salary}
                </span>
              )}
              {job.jobType && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {job.jobType.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Job Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Job Description</h2>
            <div className="prose max-w-none text-gray-600 whitespace-pre-wrap">
              {job.description}
            </div>
          </div>

          {/* Required Skills */}
          {job.analysis?.requiredSkills && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {(job.analysis.requiredSkills as string[]).map((skill, i) => (
                  <span key={i} className="badge-primary">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Skills */}
          {job.analysis?.preferredSkills && (job.analysis.preferredSkills as string[]).length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Preferred Skills</h2>
              <div className="flex flex-wrap gap-2">
                {(job.analysis.preferredSkills as string[]).map((skill, i) => (
                  <span key={i} className="badge bg-gray-100 text-gray-700">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Details */}
          <div className="card">
            <h3 className="font-semibold mb-4">Job Details</h3>
            <div className="space-y-3 text-sm">
              {job.analysis?.experienceLevel && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Experience</span>
                  <span className="font-medium">{job.analysis.experienceLevel}</span>
                </div>
              )}
              {job.analysis?.requiredEducation && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Education</span>
                  <span className="font-medium">{job.analysis.requiredEducation}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`badge ${
                  job.status === 'ACTIVE' ? 'badge-success' :
                  job.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                }`}>
                  {job.status}
                </span>
              </div>
              {job.publishedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Published</span>
                  <span className="font-medium">{new Date(job.publishedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recruiter Info */}
          {job.recruiter && (
            <div className="card">
              <h3 className="font-semibold mb-4">Posted By</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-secondary text-white flex items-center justify-center font-semibold">
                  {job.recruiter.firstName[0]}{job.recruiter.lastName[0]}
                </div>
                <div>
                  <p className="font-medium">{job.recruiter.firstName} {job.recruiter.lastName}</p>
                  <p className="text-sm text-gray-500">{job.recruiter.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candidates Section (Recruiter Only) */}
      {isRecruiter && candidates?.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Matching Candidates ({candidates.length})</h2>
          <div className="space-y-4">
            {candidates.map((match: any) => (
              <div key={match.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                <div className="w-12 h-12 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold">
                  {match.candidate.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{match.candidate.name}</p>
                  <p className="text-sm text-gray-500">{match.candidate.experienceLevel}</p>
                  <div className="flex gap-1 mt-1">
                    {match.candidate.skills?.slice(0, 3).map((s: string, i: number) => (
                      <span key={i} className="badge-primary text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">{match.overallScore}%</div>
                  <span className={`badge text-xs ${
                    match.status === 'SHORTLISTED' ? 'badge-success' :
                    match.status === 'REJECTED' ? 'badge-danger' : 'badge-primary'
                  }`}>
                    {match.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => statusMutation.mutate({ matchId: match.id, status: 'SHORTLISTED' })}
                    className="p-2 text-success-600 hover:bg-success-50 rounded-lg"
                    title="Shortlist"
                  >
                    <Star className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => statusMutation.mutate({ matchId: match.id, status: 'REJECTED' })}
                    className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                    title="Reject"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default JobDetail
