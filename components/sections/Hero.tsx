"use client";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative isolate text-center py-24 md:py-32 lg:py-40">
      <div className="container-page">
        {/* Large JobPing branding with graduation cap */}
        <motion.div 
          className="inline-flex items-center justify-center gap-4 md:gap-6 mb-8"
          animate={{ 
            scale: [1, 1.12, 1],
            y: [0, -12, 0]
          }}
          transition={{ 
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 2,
            ease: [0.34, 1.56, 0.64, 1]
          }}
        >
          {/* BIG Graduation Cap Icon */}
          <svg
            className="w-20 h-20 md:w-32 md:h-32 lg:w-40 lg:h-40 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3l10 5-10 5L2 8l10-5z" />
            <path d="M22 10v4" />
            <path d="M6 12v4c0 1.6 3 3.2 6 3.2s6-1.6 6-3.2v-4" />
          </svg>
          
          {/* Large JobPing Text */}
          <div className="text-8xl md:text-9xl lg:text-[10rem] font-bold tracking-tight leading-none">
            <span className="bg-gradient-to-b from-white via-white to-zinc-300 bg-clip-text text-transparent">
              JobPing
            </span>
          </div>
        </motion.div>
        
        <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] max-w-[20ch] mx-auto">
          Graduate jobs in your inbox. Just apply.
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-zinc-300 max-w-[62ch] mx-auto leading-relaxed">
          Five per week, straight to your inbox.
        </p>
        <p className="mt-4 text-base md:text-lg text-zinc-400 max-w-[58ch] mx-auto">
          Set up takes 2 minutes. No CV upload. No endless scrolling.
        </p>
        
        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10"
        >
          <a
            href="https://tally.so/r/mJEqx4"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-2xl hover:shadow-brand-500/30"
          >
            Get Started — It's Free
          </a>
          <p className="mt-4 text-sm text-zinc-500">
            Join 200+ graduates finding better opportunities
          </p>
        </motion.div>
      </div>

      {/* Big background orbs — dramatic motion */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          rotate: [0, 1, -1, 0]
        }}
        transition={{ 
          duration: 2, 
          ease: [0.23, 1, 0.32, 1],
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="pointer-events-none absolute inset-0 -z-10 enhanced-grid"
      />
      
      {/* Floating orbs for extra drama */}
      <motion.div
        aria-hidden
        animate={{ 
          y: [0, -10, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="pointer-events-none absolute top-20 right-20 w-32 h-32 bg-brand-500/20 rounded-full blur-xl"
      />
      <motion.div
        aria-hidden
        animate={{ 
          y: [0, 15, 0],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ 
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="pointer-events-none absolute bottom-20 left-20 w-24 h-24 bg-purple-500/20 rounded-full blur-lg"
      />
    </section>
  );
}
