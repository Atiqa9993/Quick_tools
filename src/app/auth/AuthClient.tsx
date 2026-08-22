'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [isForgot, setIsForgot] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('error')
  const [successScreen, setSuccessScreen] = useState<'verify' | 'reset' | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  // Surface server-side OAuth errors forwarded via query string
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      const desc = searchParams.get('desc')
      showError(desc ? `Google sign-in error: ${desc}` : 'Google sign-in failed or was cancelled. Please try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const showError = (msg: string) => {
    setMessage(msg)
    setMessageType('error')
  }

  /* ── Email / Password Auth ── */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isForgot) {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth`,
      })
      if (error) {
        showError(error.message)
      } else {
        setEmail('')
        setSuccessScreen('reset')
      }
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        showError(error.message)
      } else {
        const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/'
        router.push(redirectTo)
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        showError(error.message)
      } else {
        setEmail('')
        setPassword('')
        setSuccessScreen('verify')
      }
    }
    setLoading(false)
  }

  /* ── Google OAuth only ── */
  const handleGoogleOAuth = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })
    if (error) showError(error.message)
  }

  /* ── Title & Subtitle ── */
  const title = isForgot
    ? 'Reset Password'
    : isLogin
      ? 'Welcome to QuickTools'
      : 'Create Your Account'

  const subtitle = isForgot
    ? "Enter your email and we'll send you a reset link."
    : isLogin
      ? 'Access advanced features, cloud storage, and API keys.'
      : 'Start for free — no credit card required.'

  /* ── Success Screen ── */
  if (successScreen) {
    const isVerify = successScreen === 'verify'
    return (
      <main className="min-h-screen bg-surface-container-low flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/50 p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-sm ${isVerify ? 'bg-emerald-100' : 'bg-blue-100'}`}>
              <span
                className={`material-symbols-outlined ${isVerify ? 'text-emerald-600' : 'text-blue-600'}`}
                style={{ fontSize: 42 }}
              >
                {isVerify ? 'mark_email_read' : 'lock_reset'}
              </span>
            </div>
          </div>

          <h2 className="text-headline-sm text-on-surface font-bold mb-2">
            {isVerify ? 'Check your inbox!' : 'Reset link sent!'}
          </h2>
          <p className="text-body-md text-on-surface-variant mb-2">
            {isVerify
              ? 'We sent a confirmation link to your email address. Click it to activate your account.'
              : 'A password reset link has been sent to your email. Click it to set a new password.'}
          </p>
          <p className="text-body-sm text-outline mb-8">
            Don&apos;t see it? Check your <strong>spam or junk folder</strong>.
          </p>

          <button
            onClick={() => {
              setSuccessScreen(null)
              setIsLogin(true)
              setIsForgot(false)
              setMessage('')
            }}
            className="w-full border border-outline-variant text-on-surface font-bold py-3 px-6 rounded-lg text-label-md hover:bg-surface-container-low transition-colors"
          >
            ← Back to Sign In
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface-container-low flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/50 backdrop-blur-md p-6 sm:p-8">

        {/* ── Back to Home ── */}
        <div className="mb-6">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant hover:text-primary transition-colors font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Home
          </a>
        </div>

        {/* ── Logo & Header ── */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-11 h-11 bg-primary-container rounded-lg flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>bolt</span>
            </div>
          </div>
          <h1 className="text-headline-lg text-on-surface tracking-tight leading-tight mb-1">
            {title}
          </h1>
          <p className="text-body-md text-on-surface-variant">{subtitle}</p>
        </div>

        {/* ── Google OAuth Button (hidden on forgot password) ── */}
        {!isForgot && (
          <>
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleOAuth}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-low transition-all duration-200 font-semibold"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center mb-6">
              <div className="flex-grow border-t border-outline-variant" />
              <span className="px-3 text-on-surface-variant text-label-md bg-surface-container-lowest whitespace-nowrap">
                or continue with email
              </span>
              <div className="flex-grow border-t border-outline-variant" />
            </div>
          </>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label htmlFor="auth-email" className="block text-label-md text-on-surface mb-1.5 font-semibold">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-outline-variant/40 rounded-lg text-body-md text-on-surface bg-surface-variant/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
            />
          </div>

          {/* Password (hidden on forgot password screen) */}
          {!isForgot && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="auth-password" className="block text-label-md text-on-surface font-semibold">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setMessage('') }}
                    className="text-label-md text-primary hover:text-secondary transition-colors font-semibold"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-20 border border-outline-variant/40 rounded-lg text-body-md text-on-surface bg-surface-variant/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
                {/* Show / Hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black tracking-widest text-outline hover:text-primary transition-colors px-1 py-0.5 rounded select-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
          )}

          {/* ── Error Message ── */}
          {message && messageType === 'error' && (
            <div className="flex items-center gap-2.5 text-body-sm px-4 py-3 rounded-lg border bg-error-container text-on-error-container border-error/20">
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18 }}>error</span>
              {message}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary py-3.5 px-6 rounded-lg text-label-md font-bold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading
              ? 'Please wait...'
              : isForgot
                ? 'Send Reset Link'
                : isLogin
                  ? 'Sign In'
                  : 'Create Account'}
          </button>
        </form>

        {/* ── Toggle Sign In / Sign Up / Back ── */}
        <div className="mt-6 text-center">
          {isForgot ? (
            <button
              type="button"
              onClick={() => { setIsForgot(false); setMessage('') }}
              className="text-primary hover:text-secondary text-label-md font-semibold transition-colors"
            >
              ← Back to Sign In
            </button>
          ) : (
            <p className="text-body-sm text-on-surface-variant">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setMessage('') }}
                className="text-primary hover:text-secondary text-label-md font-semibold transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>

        {/* ── Trust Badges ── */}
        <div className="mt-8 pt-5 border-t border-outline-variant/30 flex justify-center gap-6 opacity-70">
          <div className="flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span className="text-[10px] font-semibold tracking-wide">Client-side security</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">visibility_off</span>
            <span className="text-[10px] font-semibold tracking-wide">Privacy focused</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span className="text-[10px] font-semibold tracking-wide">100k+ users</span>
          </div>
        </div>
      </div>
    </main>
  )
}