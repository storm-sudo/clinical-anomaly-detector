import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import anime from 'animejs'
import { Mail, Lock, User, Building2, Dna, ArrowRight, AlertCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  organization: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (cardRef.current) {
      anime({
        targets: cardRef.current,
        opacity: [0, 1],
        scale: [0.95, 1],
        translateY: [20, 0],
        duration: 600,
        easing: 'easeOutCubic',
      })
    }
  }, [])

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        organization: data.organization,
      })
      toast.success('Account created! Please log in.')
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Registration failed. Please try again.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 text-gray-900"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 40%, rgba(17,24,39,0.01) 0%, transparent 70%)',
        }}
      />

      <div ref={cardRef} className="w-full max-w-sm relative opacity-0">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-black text-white shadow-sm"
          >
            <Dna size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">ClinicalAD</div>
            <div className="text-xs text-gray-500">Anomaly Detector</div>
          </div>
        </div>

        <div className="glass-card p-8 bg-white border border-gray-150 shadow-lg">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
            <p className="text-sm text-gray-500">Start detecting anomalies today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('name')}
                  type="text"
                  placeholder="Dr. Jane Smith"
                  className="input-field pl-9 border-gray-200"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@organization.com"
                  className="input-field pl-9 border-gray-200"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Organization <span className="text-gray-400">(optional)</span></label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('organization')}
                  type="text"
                  placeholder="Pharma Corp"
                  className="input-field pl-9 border-gray-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Min. 8 characters"
                  className="input-field pl-9 border-gray-200"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="Repeat password"
                  className="input-field pl-9 border-gray-200"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
