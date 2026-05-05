'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun, LogOut } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const APPROVED_KEY = 'pod-studio-approved-designs';

function getApprovedCount() {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(APPROVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    const update = () => setApprovedCount(getApprovedCount());
    update();
    window.addEventListener('storage', update);
    window.addEventListener('pod-studio-approved-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('pod-studio-approved-updated', update);
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              POD Studio
            </div>
            <div className="hidden text-sm text-muted-foreground border-l pl-2 sm:block">
              Bold Prints Fit Co.
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Dashboard
            </Link>
            <Link href="/generate" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Generate
            </Link>
            <Link href="/queue" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Queue
            </Link>
            <Link href="/scores" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Scores
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {approvedCount} approved
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
