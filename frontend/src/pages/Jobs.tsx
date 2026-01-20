import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobApi } from '../api/client'
import { Plus, Briefcase, Edit, Trash2, Globe, X, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const Jobs = () => {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    jobType: 'FULL_TIME',
    description: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-jobs'],
    queryFn: async () => {
      const response = await jobApi.getAll()
      return response.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => jobApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      toast.success('Job created successfully')
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create job')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => jobApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      toast.success('Job updated')
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      toast.success('Job deleted')
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => jobApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] })
      toast.success('Job published')
    },
  })

  const openModal = (job?: any) => {
    if (job) {
      setEditingJob(job)
      setFormData({
        title: job.title,
        company: job.company,
        location: job.location || '',
        salary: job.salary || '',
        jobType: job.jobType || 'FULL_TIME',
        description: job.description,
      })
    } else {
      setEditingJob(null)
      setFormData({ title: '', company: '', location: '', salary: '', jobType: 'FULL_TIME', description: '' })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingJob(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'badge-warning',
    ACTIVE: 'badge-success',
    PAUSED: 'badge-primary',
    CLOSED: 'badge-danger',
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Job Postings</h1>
          <p className="text-gray-600">Create and manage your job listings</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary gap-2">
          <Plus className="w-5 h-5" />
          Create Job
        </button>
      </div>

      {/* Job List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-32" />
          ))}
        </div>
      ) : data?.length > 0 ? (
        <div className="grid gap-4">
          {data.map((job: any) => (
            <div key={job.id} className="card hover:shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link to={`/jobs/${job.id}`} className="font-semibold text-lg hover:text-primary-600 truncate">
                      {job.title}
                    </Link>
                    <span className={`badge ${statusColors[job.status]}`}>{job.status}</span>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{job.company}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {job.location && <span>📍 {job.location}</span>}
                    {job.salary && <span>💰 {job.salary}</span>}
                    {job.jobType && <span>🕒 {job.jobType.replace('_', ' ')}</span>}
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {job._count?.matchScores || 0} candidates
                    </span>
                  </div>

                  {job.analysis?.requiredSkills && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(job.analysis.requiredSkills as string[]).slice(0, 5).map((skill, i) => (
                        <span key={i} className="badge-primary text-xs">{skill}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {job.status === 'DRAFT' && (
                    <button
                      onClick={() => publishMutation.mutate(job.id)}
                      className="p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                      title="Publish"
                    >
                      <Globe className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => openModal(job)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(job.id)}
                    className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No job postings yet</h3>
          <p className="text-gray-500 mb-6">Create your first job posting to start finding candidates</p>
          <button onClick={() => openModal()} className="btn-primary">
            Create First Job
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingJob ? 'Edit Job' : 'Create New Job'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Job Title *</label>
                  <input
                    className="input"
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Company *</label>
                  <input
                    className="input"
                    placeholder="e.g. TechCorp Inc."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Location</label>
                  <input
                    className="input"
                    placeholder="e.g. Remote, NYC"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Salary</label>
                  <input
                    className="input"
                    placeholder="e.g. $100k-$150k"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Job Type</label>
                  <select
                    className="input"
                    value={formData.jobType}
                    onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Job Description *</label>
                <textarea
                  className="input min-h-[200px]"
                  placeholder="Describe the role, responsibilities, requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 50 characters. Include skills, experience requirements, and benefits.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingJob ? 'Update Job' : 'Create Job')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Jobs
