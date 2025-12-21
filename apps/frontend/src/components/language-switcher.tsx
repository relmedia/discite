"use client";

import { useRouter, usePathname } from 'next/navigation';
import { Globe, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'en', name: 'English', shortName: 'ENG', flag: '🇬🇧' },
  { code: 'sv', name: 'Svenska', shortName: 'SWE', flag: '🇸🇪' },
];

function useLocaleFromPath(): string {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && (segments[0] === 'en' || segments[0] === 'sv')) {
    return segments[0];
  }
  return 'sv'; // Default to Swedish
}

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'compact' | 'icon' }) {
  const locale = useLocaleFromPath();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    // Update cookie
    if (typeof window !== 'undefined') {
      document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    
    // Get current path without locale
    const segments = pathname.split('/').filter(Boolean);
    
    // Remove current locale if present
    if (segments[0] === 'en' || segments[0] === 'sv') {
      segments.shift();
    }
    
    // Build new path with new locale (only if not default Swedish)
    let newPath: string;
    if (newLocale === 'sv') {
      // Default locale - no prefix
      newPath = '/' + segments.join('/');
    } else {
      // Non-default locale - add prefix
      newPath = `/${newLocale}/` + segments.join('/');
    }
    
    router.push(newPath);
    router.refresh();
  };

  const currentLanguage = languages.find(l => l.code === locale) || languages[1]; // Default to Swedish

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="icon">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Change language</span>
          </Button>
        ) : variant === 'compact' ? (
          <button className="flex items-center gap-1 text-sm hover:text-foreground transition-colors cursor-pointer">
            <Globe className="text-muted-foreground size-4" />
            <span>{currentLanguage.shortName}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <span className="text-base">{currentLanguage.flag}</span>
            <span>{currentLanguage.name}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[160px]">
        {languages.map((lang) => {
          const isSelected = locale === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                "cursor-pointer",
                isSelected && "bg-muted"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

