import { Link } from 'react-router-dom';
import { Upload, Search, Shield, Zap, Camera, Users } from 'lucide-react';
import { Reticle } from '@components/ui/Reticle';
import { HudTag } from '@components/ui/HudTag';
import { Scanline } from '@components/ui/Scanline';

const features = [
  {
    icon: Search,
    title: 'Selfie search',
    description: 'One photo in, every match out — ranked by confidence, not upload order.',
  },
  {
    icon: Upload,
    title: 'Bulk upload',
    description: 'Drag in hundreds of files at once. Indexing runs in the background while you keep working.',
  },
  {
    icon: Camera,
    title: 'Live camera capture',
    description: 'No selfie handy? Guests can frame their face right in the browser and search instantly.',
  },
  {
    icon: Shield,
    title: 'Public or private events',
    description: 'Share an open link for a wedding, or lock an event down to invited guests only.',
  },
  {
    icon: Zap,
    title: 'Full-size gallery',
    description: 'Every photo opens in a fast, keyboard-navigable viewer — no download required to browse.',
  },
  {
    icon: Users,
    title: 'Private by default',
    description: 'Face data is used only to match within an event, never stored for anything else.',
  },
];

const steps = [
  {
    number: '01',
    label: 'SETUP',
    title: 'Create the event',
    description: 'Name it, add a cover photo, and get a shareable link guests can use without an account.',
  },
  {
    number: '02',
    label: 'UPLOAD',
    title: 'Drop in the photos',
    description: 'Drag in the full camera roll. SpotMe indexes every face in the background as files land.',
  },
  {
    number: '03',
    label: 'MATCH',
    title: 'Guests find themselves',
    description: 'A selfie or a quick camera capture is all it takes to pull every photo they\'re in.',
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-bg-dark text-text-hi font-display overflow-hidden relative z-10">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 glass-nav shadow-lg">
        <div className="max-w-[1240px] mx-auto px-6 flex justify-between items-center h-[72px]">
          <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-text-hi">
            <span className="w-7 h-7 border-[1.5px] border-brand-yellow rounded-[6px] relative inline-block">
              <span className="absolute inset-1.5 bg-brand-yellow rounded-[2px]" />
            </span>
            Spot<span className="text-brand-yellow">Me</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-text-mid hover:text-text-hi transition-colors focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none rounded-xl bg-white/[0.04] border border-border-dark hover:bg-white/[0.08]"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2.5 text-sm font-bold bg-brand-yellow text-bg-dark rounded-xl hover:bg-brand-yellow-hover transition-all shadow-[0_4px_20px_rgba(255,214,0,0.18)] hover:shadow-[0_4px_25px_rgba(255,214,0,0.32)] focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-6">
        <div className="max-w-[1240px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="flex items-center gap-2.5 mb-5 font-mono text-xs font-medium tracking-[0.12em] text-text-low uppercase">
                <span className="w-4 h-px bg-brand-yellow" />
                Face-match photo delivery
              </div>
              <h1 className="text-5xl lg:text-[56px] leading-[1.04] font-extrabold tracking-[-0.03em] mb-6">
                Every photo of you,<br />
                found in <span className="text-brand-yellow">seconds.</span>
              </h1>
              <p className="text-[17px] leading-relaxed text-text-mid font-medium max-w-[480px] mb-8">
                Upload one selfie. SpotMe scans every photo from the event and hands you back only the ones you're actually in — no scrolling, no guessing.
              </p>
              <div className="flex gap-3 mb-10">
                <Link
                  to="/signup"
                  className="px-7 py-3.5 bg-brand-yellow text-bg-dark font-bold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-[0_4px_20px_rgba(255,214,0,0.18)] hover:shadow-[0_4px_25px_rgba(255,214,0,0.32)] active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:outline-none"
                >
                  Find my photos
                </Link>
                <Link
                  to="/login"
                  className="px-7 py-3.5 bg-white/[0.04] border border-border-dark text-text-hi font-semibold rounded-xl hover:bg-white/[0.08] transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
                >
                  Create an event
                </Link>
              </div>
              {/* Proof stats */}
              <div className="flex gap-7 pt-7 border-t border-border-dark max-w-[480px]">
                <div>
                  <div className="font-mono text-[22px] font-semibold text-text-hi">98.2%</div>
                  <div className="text-xs text-text-low mt-0.5">match accuracy</div>
                </div>
                <div>
                  <div className="font-mono text-[22px] font-semibold text-text-hi">&lt;4s</div>
                  <div className="text-xs text-text-low mt-0.5">per-photo scan</div>
                </div>
                <div>
                  <div className="font-mono text-[22px] font-semibold text-text-hi">10K+</div>
                  <div className="text-xs text-text-low mt-0.5">events hosted</div>
                </div>
              </div>
            </div>

            {/* Right: Viewfinder visual */}
            <div className="relative">
              <div className="absolute -top-3.5 right-5 z-10 animate-float">
                <HudTag dot="green">3 matches found</HudTag>
              </div>
              <Reticle className="bg-gradient-to-br from-surface-card to-surface-dark border border-border-dark rounded-[20px] p-[18px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
                <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden relative">
                  <Scanline active />
                  <div className="aspect-square bg-[#1B1F3B] relative outline outline-2 outline-brand-yellow outline-offset-[-2px]">
                    <span className="absolute bottom-1.5 left-1.5 font-mono text-[9px] font-semibold bg-bg-dark/85 text-brand-yellow px-1.5 py-0.5 rounded">MATCH</span>
                  </div>
                  <div className="aspect-square bg-[#20233f]" />
                  <div className="aspect-square bg-[#1B1F3B] relative outline outline-2 outline-brand-yellow outline-offset-[-2px]">
                    <span className="absolute bottom-1.5 left-1.5 font-mono text-[9px] font-semibold bg-bg-dark/85 text-brand-yellow px-1.5 py-0.5 rounded">MATCH</span>
                  </div>
                  <div className="aspect-square bg-[#181b34]" />
                  <div className="aspect-square bg-[#20233f]" />
                  <div className="aspect-square bg-[#1B1F3B] relative outline outline-2 outline-brand-yellow outline-offset-[-2px]">
                    <span className="absolute bottom-1.5 left-1.5 font-mono text-[9px] font-semibold bg-bg-dark/85 text-brand-yellow px-1.5 py-0.5 rounded">MATCH</span>
                  </div>
                </div>
              </Reticle>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-[1240px] mx-auto">
          <div className="max-w-[560px] mb-[52px]">
            <h2 className="text-[34px] font-extrabold tracking-tight mb-3">Three steps, no manual sorting</h2>
            <p className="text-text-mid text-[15.5px] leading-relaxed">The whole flow runs in the order below — each step depends on the last, so there's no need to jump around.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="relative bg-surface-dark/50 backdrop-blur-[10px] border border-border-dark rounded-2xl p-7 transition-all duration-300 hover:border-brand-yellow/30 hover:-translate-y-[3px] group"
              >
                <div className="font-mono text-[13px] text-brand-yellow tracking-[0.05em] mb-4">
                  {step.number} / {step.label}
                </div>
                <h3 className="text-[17px] font-bold mb-2 group-hover:text-brand-yellow transition-colors">{step.title}</h3>
                <p className="text-[14px] text-text-mid leading-[1.55]">{step.description}</p>
                {i < steps.length - 1 && (
                  <span className="hidden md:block absolute top-7 -right-[30px] font-mono text-[18px] text-text-low">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-[1240px] mx-auto">
          <div className="max-w-[560px] mb-[52px]">
            <h2 className="text-[34px] font-extrabold tracking-tight mb-3">Built for the moment after the event</h2>
            <p className="text-text-mid text-[15.5px] leading-relaxed">The features that matter once a thousand photos are sitting in one folder and nobody wants to scroll through them.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-[26px] rounded-2xl border border-border-dark bg-surface-dark/40 backdrop-blur-[10px] transition-all duration-300 hover:-translate-y-[3px] hover:border-brand-yellow/30"
              >
                <div className="w-[38px] h-[38px] rounded-[10px] bg-brand-yellow/[0.08] border border-brand-yellow/20 flex items-center justify-center mb-4 text-brand-yellow">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] font-bold mb-2 group-hover:text-brand-yellow transition-colors">{f.title}</h3>
                <p className="text-[13.5px] text-text-mid leading-[1.55]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <div className="mx-6 my-24 bg-brand-yellow rounded-3xl p-14 flex items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #070913 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>
        <h2 className="relative text-[30px] font-extrabold text-bg-dark tracking-tight max-w-[420px]">
          Stop asking "did anyone get a photo of me?"
        </h2>
        <Link
          to="/signup"
          className="relative px-8 py-4 bg-bg-dark text-brand-yellow font-bold rounded-xl hover:bg-[#171922] transition-all shadow-2xl active:scale-95 text-lg focus-visible:ring-2 focus-visible:ring-bg-dark focus-visible:outline-none flex-shrink-0"
        >
          Create your first event
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-border-dark py-8 px-6 flex justify-between items-center text-[13px] text-text-low max-w-[1240px] mx-auto">
        <div>© {new Date().getFullYear()} SpotMe</div>
        <div className="flex gap-4">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </div>
      </footer>
    </div>
  );
}
