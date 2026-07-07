import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Button from './Button';
import { useContent } from '../../context/ContentContext';

const BASE_NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll, { passive: true });
  }, []);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const { company } = useContent();
  const pricingVisible = company.pricingVisible !== false;
  const navLinks = BASE_NAV_LINKS.filter((link) => pricingVisible || link.to !== '/pricing');

  const linkClass = ({ isActive }) =>
    `relative inline-flex items-center justify-center rounded-full px-4 py-2.5 text-center text-base font-semibold tracking-wide transition-all duration-300 ${
      isActive ? 'text-white' : 'text-white/75 hover:text-white'
    }`;

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 sm:h-16">
        <Link to="/" className="group shrink-0" aria-label="iFeX International home">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_18px_35px_rgba(6,182,212,0.14)] backdrop-blur-2xl transition-transform duration-300 group-hover:scale-105 sm:h-16 sm:w-16">
            <img
              src="/logo.png"
              alt="iFeX International logo"
              className="h-8 w-8 object-contain sm:h-10 sm:w-10"
            />
          </span>
        </Link>

        <nav
          className={`liquid-glass-navbar flex h-14 flex-1 items-center justify-between rounded-full px-3 transition-all duration-300 sm:h-16 sm:px-6 ${
            scrolled ? 'shadow-[0_18px_45px_rgba(2,6,23,0.35)]' : 'shadow-[0_14px_35px_rgba(2,6,23,0.25)]'
          }`}
        >
          <div className="flex flex-1 items-center justify-center">
            <ul className="hidden items-center justify-center gap-2 md:flex">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} className={linkClass}>
                    {({ isActive }) => (
                      <span className="relative pb-1">
                        {link.label}
                        {isActive && (
                          <motion.span
                            layoutId="nav-underline"
                            className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-electric to-cyan"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <Button Component={Link} to="/contact" className="px-5 py-2.5 text-sm">
                Get in Touch
              </Button>
            </div>

            <button
              className="premium-glass-pill rounded-full p-2 text-white md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden fixed left-0 right-0 top-16 bottom-0 z-50 overflow-auto border-t border-white/10 bg-slate-950/90 backdrop-blur-2xl"
          >
            <ul className="section-container flex flex-col gap-1 py-6">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isActive ? 'bg-white/[0.06] text-white' : 'text-white/60 hover:text-white'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              <li className="pt-3">
                <Button
                  Component={Link}
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="w-full"
                >
                  Get in Touch
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
