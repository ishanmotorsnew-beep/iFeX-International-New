import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Workflow, ShieldCheck, UserCheck } from 'lucide-react';
import Button from '../Common/Button';
import GlobeCanvas from './GlobeCanvas';

// Framer motion variants for left-hand content fade-in
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Hero() {
  const [settled, setSettled] = useState(false);

  const handleSettle = useCallback(() => {
    setSettled((prev) => (prev ? prev : true));
  }, []);

  return (
    <section className="home-hero relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0f1d] pt-20 pb-16">
      
      {/* 1. Cinematic Cityscape Background */}
      {/* Starting fade-in exactly during the globe drift phase (around 3.5s) */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.0, delay: 3.2, ease: 'easeOut' }}
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('/cityscape_bg.png')`,
        }}
      />

      {/* 2. Premium Gradients and Vignette Overlays */}
      {/* Top overlay to blend under the fixed navbar */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a0f1d] to-transparent -z-10 pointer-events-none" />
      
      {/* Bottom overlay to fade cityscape into footer and other sections */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/40 to-transparent -z-10 pointer-events-none" />
      
      {/* Left-side overlay to keep text highly legible */}
      <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-[#0a0f1d] via-[#0a0f1d]/75 to-transparent -z-10 pointer-events-none" />

      {/* Glowing spotlight behind the globe's settled position */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, delay: 3.8 }}
        className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-[130px] -z-15 pointer-events-none hidden md:block" 
      />

      {/* Side shine to brighten the hero and add atmosphere */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
        className="absolute top-1/2 right-0 -translate-y-1/2 h-[420px] w-[280px] rounded-full bg-gradient-to-l from-cyan-300/25 via-transparent to-transparent blur-3xl opacity-90 pointer-events-none hidden lg:block"
      />

      {/* 3. Interactive Anti-gravity 3D Particle Globe */}
      <GlobeCanvas onSettle={handleSettle} />

      {/* 4. DOM Layout Wrapper */}
      <div className="section-container w-full relative z-20 flex flex-col md:grid md:grid-cols-12 gap-8 items-center min-h-[calc(100vh-144px)]">
        
        {/* Mobile Spacer to leave room for the centered globe during intro */}
        <div className="h-[280px] md:hidden w-full shrink-0" aria-hidden="true" />

        {/* Left Side Content Column (takes 7 cols on desktop) */}
        <div className="col-span-12 md:col-span-7 flex flex-col justify-center text-left">
          <AnimatePresence>
            {settled && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-6 sm:gap-8"
              >
                {/* Headline */}
                <motion.h1
                  variants={itemVariants}
                  className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
                >
                  Engineering{' '}
                  <span className="glow-text bg-gradient-to-r from-[#7dd3fc] via-[#60a5fa] to-[#3b82f6] bg-clip-text text-transparent font-extrabold tracking-tight">
                    Intelligent Solutions
                  </span>{' '}
                  for Modern Businesses
                </motion.h1>

                {/* Grid of Three Badges */}
                <motion.div
                  variants={itemVariants}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 w-full mt-2"
                >
                  {/* Badge 1: Innovative Solutions */}
                  <div className="glass-card p-4 flex items-center gap-3.5 border border-white/15 hover:border-cyan/40 transition-all duration-300 bg-white/[0.12]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan/30 bg-cyan/15 shadow-[0_0_18px_rgba(6,182,212,0.24)]">
                      <Workflow className="h-5 w-5 text-cyan" />
                    </div>
                    <div className="text-sm font-bold text-white/90 leading-tight">
                      <div>Innovative</div>
                      <div className="font-normal text-white/60">Solutions</div>
                    </div>
                  </div>

                  {/* Badge 2: Quality & Reliability */}
                  <div className="glass-card p-4 flex items-center gap-3.5 border border-white/15 hover:border-cyan/40 transition-all duration-300 bg-white/[0.12]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan/30 bg-cyan/15 shadow-[0_0_18px_rgba(6,182,212,0.24)]">
                      <ShieldCheck className="h-5 w-5 text-cyan" />
                    </div>
                    <div className="text-sm font-bold text-white/90 leading-tight">
                      <div>Quality &</div>
                      <div className="font-normal text-white/60">Reliability</div>
                    </div>
                  </div>

                  {/* Badge 3: Client Satisfaction */}
                  <div className="glass-card p-4 flex items-center gap-3.5 border border-white/15 hover:border-cyan/40 transition-all duration-300 bg-white/[0.12]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan/30 bg-cyan/15 shadow-[0_0_18px_rgba(6,182,212,0.24)]">
                      <UserCheck className="h-5 w-5 text-cyan" />
                    </div>
                    <div className="text-sm font-bold text-white/90 leading-tight">
                      <div>Client</div>
                      <div className="font-normal text-white/60">Satisfaction</div>
                    </div>
                  </div>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  variants={itemVariants}
                  className="flex flex-wrap gap-4 items-center mt-3"
                >
                  <Button Component={Link} to="/contact" className="px-7 py-3.5 text-sm font-bold">
                    Start a Project
                  </Button>
                  <Button
                    Component={Link}
                    to="/portfolio"
                    variant="ghost"
                    icon={false}
                    className="px-7 py-3.5 text-sm font-bold flex items-center gap-2"
                  >
                    <Play className="h-4 w-4 fill-white text-white" />
                    View Our Work
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side Spacer Column (takes 5 cols on desktop to frame the settled globe) */}
        <div className="hidden md:block md:col-span-5 h-[400px] w-full shrink-0" aria-hidden="true" />
      </div>
    </section>
  );
}
