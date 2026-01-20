import { Link } from 'react-router-dom'
import { 
  Sparkles, 
  FileSearch, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Users, 
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react'

const Landing = () => {
  const features = [
    {
      icon: FileSearch,
      title: 'AI Resume Analysis',
      description: 'Get instant ATS scores and detailed feedback on your resume with our advanced AI engine.',
    },
    {
      icon: Target,
      title: 'Smart Job Matching',
      description: 'Our semantic matching algorithm finds the perfect jobs that align with your skills and experience.',
    },
    {
      icon: TrendingUp,
      title: 'Skill Gap Analysis',
      description: 'Identify missing skills and get personalized learning paths to boost your career.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track your progress with beautiful charts and actionable insights.',
    },
    {
      icon: Users,
      title: 'Recruiter Tools',
      description: 'Recruiters get powerful candidate matching and pipeline management features.',
    },
    {
      icon: Sparkles,
      title: 'AI Recommendations',
      description: 'Get personalized suggestions to improve your resume and stand out from the crowd.',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gradient">CareerLens AI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary text-sm py-2">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400 rounded-full filter blur-3xl opacity-20 animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-400 rounded-full filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '-3s' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Powered by GPT-4 AI
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            Your Career,{' '}
            <span className="text-gradient">Supercharged</span>
            <br />by AI
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Get instant resume analysis, discover perfect job matches, and receive 
            AI-powered recommendations to accelerate your career growth.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-4 gap-2">
              Start Free Analysis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register?role=recruiter" className="btn-outline text-lg px-8 py-4">
              I'm a Recruiter
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-8 mt-12 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success-500" />
              Free to start
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success-500" />
              Instant results
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to{' '}
              <span className="text-gradient">Land Your Dream Job</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Our AI-powered platform provides all the tools you need to optimize your resume 
              and find the perfect career opportunities.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="card group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: '50K+', label: 'Resumes Analyzed' },
              { value: '95%', label: 'User Satisfaction' },
              { value: '10K+', label: 'Job Matches Made' },
              { value: '4.9', label: 'Average Rating', icon: Star },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-4xl sm:text-5xl font-bold mb-2 flex items-center justify-center gap-2">
                  {stat.value}
                  {stat.icon && <stat.icon className="w-8 h-8 fill-current" />}
                </div>
                <div className="text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Transform Your Career?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Join thousands of professionals who have accelerated their careers with our AI-powered platform.
          </p>
          <Link to="/register" className="btn-primary text-lg px-10 py-4 gap-2">
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold">CareerLens AI</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 CareerLens AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
