import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { resumeApi } from '../api/client'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, Sparkles, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const Resumes = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const response = await resumeApi.getAll()
      return response.data.data
    },
  })

  // Check if any resumes are still processing
  const hasProcessingResumes = useMemo(() => {
    if (!data?.length) return false
    return data.some((resume: any) => 
      resume.status === 'PENDING' || resume.status === 'PROCESSING'
    )
  }, [data])

  // Auto-refresh list when resumes are processing
  useEffect(() => {
    if (!hasProcessingResumes) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [hasProcessingResumes, queryClient])

  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast.success('Resume uploaded! Processing will begin shortly.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Upload failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resumeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast.success('Resume deleted')
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => resumeApi.reprocess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast.success('Resume queued for reprocessing')
    },
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }

    setUploading(true)
    try {
      await uploadMutation.mutateAsync(file)
    } finally {
      setUploading(false)
    }
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const statusConfig: Record<string, { icon: any; color: string; label: string; bgColor: string }> = {
    PENDING: { icon: Clock, color: 'text-warning-500', label: 'Pending', bgColor: 'bg-warning-50' },
    PROCESSING: { icon: Loader2, color: 'text-primary-500', label: 'Processing', bgColor: 'bg-primary-50' },
    ANALYZED: { icon: CheckCircle, color: 'text-success-500', label: 'Analyzed', bgColor: 'bg-success-50' },
    FAILED: { icon: AlertCircle, color: 'text-danger-500', label: 'Failed', bgColor: 'bg-danger-50' },
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Resumes</h1>
          <p className="text-gray-600">Upload and manage your resumes for AI analysis</p>
        </div>
        {hasProcessingResumes && (
          <div className="flex items-center gap-2 text-primary-600 bg-primary-50 px-4 py-2 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <Upload className={`w-8 h-8 text-primary-600 ${uploading ? 'animate-bounce' : ''}`} />
        </div>
        {uploading ? (
          <p className="text-lg font-medium text-gray-700">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-lg font-medium text-primary-600">Drop your resume here</p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag & drop your resume here, or click to select
            </p>
            <p className="text-sm text-gray-500">PDF only, max 10MB</p>
          </>
        )}
      </div>

      {/* Resume List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : data?.length > 0 ? (
        <div className="grid gap-4">
          {data.map((resume: any) => {
            const status = statusConfig[resume.status] || statusConfig.PENDING
            const StatusIcon = status.icon
            const isProcessing = resume.status === 'PENDING' || resume.status === 'PROCESSING'

            return (
              <div 
                key={resume.id} 
                className={`card hover:shadow-lg transition-all cursor-pointer ${isProcessing ? 'border-l-4 border-l-primary-500' : ''} ${resume.status === 'ANALYZED' ? 'hover:border-primary-300' : ''}`}
                onClick={() => {
                  if (resume.status === 'ANALYZED') {
                    navigate(`/resumes/${resume.id}/report`)
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-7 h-7 text-primary-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold truncate">{resume.fileName}</h3>
                      <div className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${status.color} ${status.bgColor}`}>
                        <StatusIcon className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                        {status.label}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3">
                      Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                    </p>

                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm text-primary-600 mb-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>AI is analyzing your resume...</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full animate-pulse"
                            style={{ width: resume.status === 'PROCESSING' ? '60%' : '20%' }}
                          />
                        </div>
                      </div>
                    )}

                    {resume.analysis && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary-500" />
                          <span className="font-medium">{resume.analysis.atsScore}%</span>
                          <span className="text-gray-500">ATS Score</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Level:</span>{' '}
                          <span className="font-medium">{resume.analysis.experienceLevel}</span>
                        </div>
                        <div className="flex gap-1">
                          {(resume.analysis.skills as string[])?.slice(0, 3).map((skill, i) => (
                            <span key={i} className="badge-primary text-xs">{skill}</span>
                          ))}
                          {(resume.analysis.skills as string[])?.length > 3 && (
                            <span className="badge bg-gray-100 text-gray-600 text-xs">
                              +{(resume.analysis.skills as string[]).length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {resume.status === 'FAILED' && resume.processingError && (
                      <div className="mt-2 p-3 bg-danger-50 rounded-lg text-sm text-danger-700">
                        {resume.processingError}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {resume.status === 'FAILED' && (
                      <button
                        onClick={() => reprocessMutation.mutate(resume.id)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Retry processing"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(resume.id)}
                      className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                      title="Delete resume"
                      disabled={isProcessing}
                    >
                      <Trash2 className={`w-5 h-5 ${isProcessing ? 'opacity-50' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
          <p className="text-gray-500">Upload your first resume to get started with AI analysis</p>
        </div>
      )}
    </div>
  )
}

export default Resumes

