import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import anime from 'animejs'
import {
  Dna,
  Upload,
  Brain,
  Download,
  Shield,
  Zap,
  BarChart2,
  GitBranch,
  Target,
  FlaskConical,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart2,
    title: 'Statistical Detection',
    description: 'Z-Score and IQR methods identify values deviating from population norms with configurable thresholds.',
    color: '#3b82f6',
  },
  {
    icon: GitBranch,
    title: 'Isolation Forest',
    description: 'Ensemble ML algorithm isolates anomalies efficiently without assuming normal distribution.',
    color: '#a78bfa',
  },
  {
    icon: Target,
    title: 'Local Outlier Factor',
    description: 'Density-based detection identifies local anomalies relative to their neighborhood.',
    color: '#60a5fa',
  },
  {
    icon: FlaskConical,
    title: 'Clinical Rules Engine',
    description: 'Domain-specific rules validate values against clinical reference ranges and ICH E6 standards.',
    color: '#34d399',
  },
  {
    icon: Brain,
    title: 'Missing Data Analysis',
    description: 'Identifies patterns in missing data: MCAR, MAR, and MNAR with visualizations.',
    color: '#f59e0b',
  },
  {
    icon: Shield,
    title: 'Duplicate Detection',
    description: 'Fuzzy matching identifies exact and near-duplicate records that could skew analysis.',
    color: '#ef4444',
  },
]

const STEPS = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Your Dataset',
    description: 'Drop CSV, Excel, or TSV files. We accept all common clinical data formats.',
    color: '#3b82f6',
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI Detects Anomalies',
    description: 'Six ML algorithms run in parallel, scoring every data point for anomalous behavior.',
    color: '#a78bfa',
  },
  {
    number: '03',
    icon: Download,
    title: 'Review & Export',
    description: 'Review findings with clinical context, mark false positives, and export reports.',
    color: '#10b981',
  },
]

const TRUST = [
  { label: 'ALCOA+ Compliant', icon: Shield },
  { label: 'Phase I–IV Support', icon: FlaskConical },
  { label: 'SOC 2 Ready', icon: CheckCircle },
]

const STATS = [
  { value: 99.2, label: 'Detection Rate', suffix: '%', decimals: 1 },
  { value: 30, label: 'Processing Time', suffix: 's', decimals: 0 },
  { value: 6, label: 'ML Algorithms', suffix: '', decimals: 0 },
]

export default function Landing() {
  const particlesRef = useRef<SVGSVGElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const statValuesRef = useRef<HTMLSpanElement[]>([])

  useEffect(() => {
    // Particle animation
    if (particlesRef.current) {
      const particles = particlesRef.current.querySelectorAll('.particle')
      anime({
        targets: particles,
        translateX: () => anime.random(-250, 250),
        translateY: () => anime.random(-200, 200),
        opacity: [
          { value: 0.1 },
          { value: () => anime.random(3, 7) / 10 },
          { value: 0.1 },
        ],
        scale: () => anime.random(5, 15) / 10,
        duration: () => anime.random(6000, 12000),
        delay: () => anime.random(0, 4000),
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine',
      })
    }

    // Hero text reveal
    if (heroRef.current) {
      anime({
        targets: heroRef.current.querySelectorAll('.hero-item'),
        opacity: [0, 1],
        translateY: [24, 0],
        delay: anime.stagger(120, { start: 200 }),
        duration: 700,
        easing: 'easeOutCubic',
      })
    }
  }, [])

  useEffect(() => {
    // Stats counter on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            STATS.forEach((stat, i) => {
              const el = statValuesRef.current[i]
              if (!el) return
              const obj = { val: 0 }
              anime({
                targets: obj,
                val: stat.value,
                duration: 1800,
                easing: 'easeOutExpo',
                update: () => {
                  el.textContent =
                    stat.decimals > 0
                      ? obj.val.toFixed(stat.decimals) + stat.suffix
                      : Math.round(obj.val) + stat.suffix
                },
              })
            })
            observer.disconnect()
          }
        })
      },
      { threshold: 0.3 }
    )

    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // Feature cards stagger reveal
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({
              targets: featuresRef.current?.querySelectorAll('.feature-card'),
              opacity: [0, 1],
              translateY: [30, 0],
              delay: anime.stagger(80),
              duration: 600,
              easing: 'easeOutCubic',
            })
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 }
    )
    if (featuresRef.current) observer.observe(featuresRef.current)
    return () => observer.disconnect()
  }, [])

  // Generate particle positions
  const particles = Array.from({ length: 60 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    r: Math.random() * 3 + 1,
    isAnomaly: i < 8,
  }))

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-black text-white shadow-sm"
          >
            <Dna size={18} />
          </div>
          <span className="text-sm font-bold text-gray-900">ClinicalAD</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500 font-medium">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it Works</a>
          <a href="#trust" className="hover:text-gray-900 transition-colors">Compliance</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary text-sm py-2 px-4">
            Log In
          </Link>
          <Link to="/register" className="btn-primary text-sm py-2 px-4">
            Get Started
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated particle background */}
        <svg
          ref={particlesRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.8 }}
        >
          {particles.map((p, i) => (
            <circle
              key={i}
              className="particle"
              cx={`${p.x}%`}
              cy={`${p.y}%`}
              r={p.r}
              fill={p.isAnomaly ? '#ef4444' : '#9C9284'}
              opacity={0.3}
            />
          ))}
        </svg>

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(17,17,17,0.02) 0%, transparent 70%)',
          }}
        />

        {/* Hero content */}
        <div ref={heroRef} className="relative text-center max-w-4xl mx-auto px-6">
          <div className="hero-item inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 bg-white border border-gray-200 text-gray-800 shadow-sm">
            <Zap size={12} className="text-amber-500" />
            ML-Powered Clinical Data Quality
          </div>

          <h1 className="hero-item text-5xl md:text-6xl font-extrabold leading-tight mb-6 text-gray-900">
            <span className="gradient-text">Clinical Data Quality,</span>
            <br />
            <span>Powered by ML</span>
          </h1>

          <p className="hero-item text-base text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Detect anomalies in clinical trial data using 6 ML algorithms simultaneously.
            ALCOA+ compliant, FDA-ready reports. From upload to insight in under 30 seconds.
          </p>

          <div className="hero-item flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/register" className="btn-primary text-base px-8 py-3 rounded-xl gap-2">
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3 rounded-xl">
              View Demo
            </Link>
          </div>

          {/* Mock UI preview */}
          <div
            className="hero-item relative mx-auto max-w-3xl rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-xl"
          >
            {/* Fake title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="flex-1 flex justify-center">
                <div className="text-xs text-gray-400 px-3 py-0.5 rounded border border-gray-100 bg-white font-mono">
                  clinicalad.app/analyses/demo
                </div>
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="p-5">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Quality Score', value: '87.4', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Anomalies', value: '143', color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'Rows', value: '12,450', color: 'text-sky-600', bg: 'bg-sky-50' },
                  { label: 'Algorithms', value: '6 / 6', color: 'text-violet-600', bg: 'bg-violet-50' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl p-3 text-center border border-gray-100 ${item.bg}`}
                  >
                    <div className={`text-xl font-bold mb-0.5 ${item.color}`}>{item.value}</div>
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Fake anomaly rows */}
              <div className="rounded-xl overflow-hidden border border-gray-100">
                {[
                  { row: 23, col: 'systolic_bp', val: '220', sev: 'CRITICAL' },
                  { row: 87, col: 'glucose', val: '45.2', sev: 'HIGH' },
                  { row: 134, col: 'heart_rate', val: '142', sev: 'HIGH' },
                  { row: 201, col: 'age', val: '127', sev: 'CRITICAL' },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs border-b border-gray-100 last:border-0"
                    style={{ background: i % 2 === 0 ? '#FAF7F2' : '#ffffff' }}
                  >
                    <span className="text-gray-400 font-mono w-8">#{row.row}</span>
                    <span className="text-gray-900 font-medium w-28 text-left">{row.col}</span>
                    <span className="text-gray-700 font-mono w-12 text-left">{row.val}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ml-auto severity-${row.sev.toLowerCase()}`}
                    >
                      {row.sev}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 px-6" id="trust">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl p-10 grid grid-cols-3 gap-8 bg-white border border-gray-150 shadow-md"
          >
            {STATS.map((stat, i) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-extrabold mb-2 text-gray-900">
                  <span ref={(el) => { if (el) statValuesRef.current[i] = el }}>
                    {stat.value}{stat.suffix}
                  </span>
                </div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="flex justify-center gap-8 mt-8">
            {TRUST.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <Icon size={16} className="text-emerald-600" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">Process</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From raw CSV to actionable anomaly report in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 relative">
            {/* Connector lines */}
            <div
              className="absolute top-12 left-1/3 right-1/3 h-px bg-gray-200 hidden md:block"
            />

            {STEPS.map((step, i) => (
              <div
                key={i}
                className="glass-card p-6 text-center relative"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <div className="text-5xl font-black mb-4 text-gray-100">
                  {step.number}
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-gray-50 border border-gray-100 text-gray-800"
                >
                  <step.icon size={22} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" ref={featuresRef} className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">Algorithms</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Six Detection Methods</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every algorithm runs in parallel for comprehensive anomaly detection
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="feature-card glass-card glass-card-hover p-5 opacity-0"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gray-50 border border-gray-100 text-gray-800"
                >
                  <feature.icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-6">
        <div
          className="max-w-2xl mx-auto text-center rounded-3xl p-12 bg-white border border-gray-200 shadow-xl"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to detect anomalies?
          </h2>
          <p className="text-gray-500 mb-8">
            Start free. No credit card required. Full access to all 6 algorithms.
          </p>
          <Link to="/register" className="btn-primary text-base px-10 py-3.5 rounded-xl">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 text-center">
        <p className="text-gray-400 text-xs">
          © 2026 ClinicalAD — ML-Powered Clinical Data Anomaly Detection
        </p>
      </footer>
    </div>
  )
}
