import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, Play, TrendingUp, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { isSupabaseConfigured } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, loginWithMagicLink, loginDemo, isAuthenticated, initialize } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
    requestAnimationFrame(() => setMounted(true));
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdprConsent) {
      setError('Veuillez accepter la politique de confidentialité pour continuer.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'magic') {
        await loginWithMagicLink(email);
        setMagicLinkSent(true);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-primary-950">
      {/* Decorative background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-950 to-accent-900/30" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-accent-500/8 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-emerald-500/5 to-transparent" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative z-10">
        <div
          className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-400" />
            </div>
            <span className="font-display text-xl font-bold text-white">Cashflow</span>
          </div>
        </div>

        <div
          className={`max-w-lg transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h1 className="font-display text-display-xl text-white mb-6">
            Pilotez votre trésorerie en
            <span className="text-gradient"> temps réel</span>
          </h1>
          <p className="text-body-lg text-primary-300 mb-10 leading-relaxed">
            Synchronisation automatique avec Pennylane, projections intelligentes
            et alertes proactives pour vos clients.
          </p>

          <div className="space-y-4">
            {[
              { icon: Zap, text: 'Synchronisation Pennylane en un clic' },
              { icon: TrendingUp, text: 'Projections à 3, 6 et 12 mois' },
              { icon: Shield, text: 'Conformité RGPD intégrée' },
            ].map(({ icon: Icon, text }, i) => (
              <div
                key={text}
                className={`flex items-center gap-3 transition-all duration-500`}
                style={{ transitionDelay: `${400 + i * 100}ms`, opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-12px)' }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-accent-400" />
                </div>
                <span className="text-body-md text-primary-200">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p
          className={`text-body-sm text-primary-500 transition-all duration-500 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          Conçu pour les cabinets d'expertise comptable
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-xl flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div
          className={`w-full max-w-md transition-all duration-600 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.98]'}`}
          style={{ transitionDelay: '150ms' }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-400" />
            </div>
            <span className="font-display text-xl font-bold text-white">Cashflow</span>
          </div>

          <div className="bg-white dark:bg-surface-dark-50 rounded-3xl shadow-elevated p-8 lg:p-10 border border-white/10">
            <div className="mb-8">
              <h2 className="font-display text-display-md text-primary-900 dark:text-white">
                Connexion
              </h2>
              <p className="text-body-sm text-primary-500 dark:text-primary-400 mt-1">
                Accédez à votre espace de gestion
              </p>
            </div>

            {magicLinkSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-7 h-7 text-accent-500" />
                </div>
                <h3 className="font-display text-display-sm text-primary-900 dark:text-white mb-2">
                  Vérifiez votre boîte mail
                </h3>
                <p className="text-body-sm text-primary-500 dark:text-primary-400">
                  Un lien de connexion a été envoyé à <strong className="text-primary-900 dark:text-white">{email}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Auth mode toggle */}
                <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-dark-100 rounded-xl">
                  {(['password', 'magic'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2.5 text-body-sm font-medium rounded-lg transition-all duration-200 ${
                        mode === m
                          ? 'bg-white dark:bg-surface-dark-200 text-primary-900 dark:text-white shadow-card'
                          : 'text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
                      }`}
                    >
                      {m === 'password' ? 'Mot de passe' : 'Lien magique'}
                    </button>
                  ))}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-label uppercase text-primary-500 dark:text-primary-400">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 rounded-xl border border-surface-300 dark:border-surface-dark-200 bg-white dark:bg-surface-dark-100 text-primary-900 dark:text-white text-body-md placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all"
                      placeholder="nom@cabinet.fr"
                    />
                  </div>
                </div>

                {/* Password */}
                {mode === 'password' && (
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-label uppercase text-primary-500 dark:text-primary-400">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 rounded-xl border border-surface-300 dark:border-surface-dark-200 bg-white dark:bg-surface-dark-100 text-primary-900 dark:text-white text-body-md placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {/* GDPR consent */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={gdprConsent}
                    onChange={(e) => setGdprConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-surface-300 dark:border-surface-dark-200 text-accent-500 focus:ring-accent-500/30 transition-colors"
                  />
                  <span className="text-body-sm text-primary-500 dark:text-primary-400 leading-relaxed">
                    J'accepte la{' '}
                    <a href="/privacy-policy.html" target="_blank" className="text-accent-500 hover:text-accent-600 underline underline-offset-2 decoration-accent-500/30 hover:decoration-accent-500">
                      politique de confidentialité
                    </a>{' '}
                    et les{' '}
                    <a href="/terms-of-service.html" target="_blank" className="text-accent-500 hover:text-accent-600 underline underline-offset-2 decoration-accent-500/30 hover:decoration-accent-500">
                      CGU
                    </a>
                  </span>
                </label>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-coral-50 dark:bg-coral-900/20 border border-coral-200 dark:border-coral-800/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-coral-500 flex-shrink-0" />
                    <p className="text-body-sm text-coral-700 dark:text-coral-300">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white rounded-xl font-display font-semibold text-body-md shadow-glow-accent hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'password' ? 'Se connecter' : 'Envoyer le lien'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Demo mode — always visible */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-200 dark:border-surface-dark-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-label uppercase text-primary-400 dark:text-primary-500 bg-white dark:bg-surface-dark-50">
                      ou
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loginDemo}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-display font-semibold text-body-md shadow-glow-emerald hover:shadow-lg transition-all duration-200"
                >
                  <Play className="w-4 h-4" />
                  Accéder à la démo
                </button>
                <p className="text-center text-label text-primary-400 dark:text-primary-500 uppercase">
                  Données fictives — Boulangerie Martin SARL
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
