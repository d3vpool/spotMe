import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Upload, Search, Zap, Shield, Users } from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Upload Event Photos',
    description: 'Photographers upload all event photos in bulk to a dedicated gallery.',
  },
  {
    icon: Search,
    title: 'AI Face Search',
    description: 'Guests upload a selfie and our AI instantly finds every photo they appear in.',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    description: 'Event galleries are private by default. Share only with a unique link.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Results in seconds — no manual tagging or scrolling through hundreds of photos.',
  },
  {
    icon: Camera,
    title: 'Any Event Size',
    description: 'Works for birthday parties, weddings, corporate events, and large concerts alike.',
  },
  {
    icon: Users,
    title: 'Public Share Link',
    description: 'Generate a public link so guests can find their photos without needing an account.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create an Event',
    description: 'Sign up, create an event, and get a shareable gallery in seconds.',
  },
  {
    number: '02',
    title: 'Upload Photos',
    description: 'Upload all event photos at once. Our AI processes them automatically.',
  },
  {
    number: '03',
    title: 'Guests Find Their Photos',
    description: 'Guests visit the link, take a selfie, and instantly see every photo of themselves.',
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <span className="text-2xl font-bold text-black tracking-tight">
            Spot<span className="text-[#FFD600]">Me</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-semibold bg-[#FFD600] text-black rounded-lg hover:bg-[#E6C200] transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-20 pb-28 px-4">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] rounded-full bg-[#FFD600]/10 blur-3xl" />
          <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-[#FFD600]/5 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#FFD600]/15 text-[#9A7E00] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Photo Finder
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-black leading-tight tracking-tight mb-6">
            Find Your Photos from{' '}
            <span className="relative">
              <span className="relative z-10">Any Event</span>
              <span className="absolute left-0 bottom-1 w-full h-3 bg-[#FFD600]/40 -z-0 rounded" />
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            SpotMe uses face recognition to instantly find every photo you appear in — no more
            scrolling through hundreds of event photos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-3.5 bg-[#FFD600] text-black font-bold rounded-xl hover:bg-[#E6C200] transition-all shadow-md hover:shadow-lg text-base"
            >
              Start for Free
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition-all text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-black mb-3">How It Works</h2>
            <p className="text-gray-500 text-lg">Three steps, done in minutes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col gap-4">
                <span className="text-5xl font-black text-[#FFD600] leading-none">{step.number}</span>
                <h3 className="text-lg font-bold text-black">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-black mb-3">Everything You Need</h2>
            <p className="text-gray-500 text-lg">Powerful features built for photographers and event organisers.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-[#FFD600]/50 hover:shadow-md transition-all bg-white"
              >
                <div className="w-11 h-11 rounded-xl bg-[#FFD600]/10 flex items-center justify-center mb-4 group-hover:bg-[#FFD600]/20 transition-colors">
                  <f.icon className="w-5 h-5 text-[#9A7E00]" />
                </div>
                <h3 className="font-semibold text-black mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 bg-[#FFD600]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-black mb-4">Ready to find your photos?</h2>
          <p className="text-black/70 text-lg mb-8">
            Create a free account and set up your first event gallery in under a minute.
          </p>
          <Link
            to="/signup"
            className="inline-block px-10 py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-900 transition-colors shadow-lg text-lg"
          >
            Get Started — It's Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 px-4 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} SpotMe. All rights reserved.
      </footer>
    </div>
  );
}