import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import anime from 'animejs'
import { Mail, Lock, Dna, ArrowRight, AlertCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
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

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await authApi.login(data.email, data.password)
      login(result.user, result.access_token)
      toast.success(`Welcome back, ${result.user.name}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Login failed. Please check your credentials.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-gray-50 text-gray-900"
    >
      {/* Background glow */}
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

        {/* Card */}
        <div className="glass-card p-8 bg-white border border-gray-150 shadow-lg">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@organization.com"
                  className="input-field pl-9 border-gray-200"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Password</label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="input-field pl-9 border-gray-200"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-gray-900 font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
