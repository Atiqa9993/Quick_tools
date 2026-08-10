'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AuthClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [isForgot, setIsForgot] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('error')
  const [loading, setLoading] = useState(false)

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg)
    setMessageType(type)
  }

  /* ── Email / Password Auth ── */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      })
      if (error) showMessage(error.message, 'error')
      else showMessage('Password reset link sent! Check your email.', 'success')
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        showMessage(error.message, 'error')
      } else {
        // Store session in Chrome extension storage if available
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          try {
            // @ts-ignore — chrome API only available in extension context
            await chrome.storage.local.set({
              user_id: session.user.id,
              is_pro: false,
            })
          } catch {
            // Not in extension context — safe to ignore
          }
        }
        const redirectTo =
          new URLSearchParams(window.location.search).get('redirect') || '/'
        router.push(redirectTo)
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) showMessage(error.message, 'error')
      else showMessage('Account created! Check your email to confirm.', 'success')
    }
    setLoading(false)
  }

  /* ── OAuth ── */
  const handleOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) showMessage(error.message, 'error')
  }

  /* ── Title & Subtitle ── */
  const title = isForgot
    ? 'Reset Password'
    : isLogin
      ? 'Welcome to QuickTools'
      : 'Create Your Account'

  const subtitle = isForgot
    ? 'Enter your email and we\'ll send you a reset link.'
    : isLogin
      ? 'Access advanced features, cloud storage, and API keys.'
      : 'Start for free — no credit card required.'

  return (
    <main className="min-h-screen bg-surface-container-low flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/50 backdrop-blur-md p-6 sm:p-8">

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

        {/* ── OAuth Buttons (hidden on forgot password) ── */}
        {!isForgot && (
          <>
            <div className="flex flex-col gap-2.5 mb-6">
              <button
                onClick={() => handleOAuth('google')}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-low transition-all duration-200 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
              <button
                onClick={() => handleOAuth('github')}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-low transition-all duration-200 font-semibold"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" fillRule="evenodd" />
                </svg>
                Continue with GitHub
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

          {/* Password (hidden for forgot) */}
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
                  className="w-full px-4 py-3 pr-12 border border-outline-variant/40 rounded-lg text-body-md text-on-surface bg-surface-variant/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Message ── */}
          {message && (
            <div
              className={`flex items-center gap-2.5 text-body-sm px-4 py-3 rounded-lg border ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-error-container text-on-error-container border-error/20'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {messageType === 'success' ? 'check_circle' : 'error'}
              </span>
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
            <p className="text-body-sm text-on-surface-variant">
              <button
                onClick={() => { setIsForgot(false); setMessage('') }}
                className="text-primary hover:text-secondary text-label-md font-semibold transition-colors"
              >
                ← Back to Sign In
              </button>
            </p>
          ) : (
            <p className="text-body-sm text-on-surface-variant">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
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