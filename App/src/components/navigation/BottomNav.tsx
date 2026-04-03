'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, BarChart3, MessageCircle, FileText, User, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/mediscan', icon: Pill, label: 'MediScan' },
  { href: '/records', icon: FileText, label: 'Records' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-[#2F3C31] z-50 rounded-t-3xl shadow-lg"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full relative',
                'transition-all duration-300'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gray-700/50 rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative z-10 flex flex-col items-center justify-center"
              >
                <Icon
                  className={cn(
                    'w-6 h-6 transition-all',
                    isActive ? 'text-white' : 'text-gray-400'
                  )}
                />
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-[#83C818] rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
