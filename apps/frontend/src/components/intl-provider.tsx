"use client";

import { createContext, useContext, ReactNode } from 'react';

type Messages = Record<string, any>;
type InterpolationValues = Record<string, string | number>;

interface IntlContextType {
  locale: string;
  messages: Messages;
  t: (key: string, values?: InterpolationValues) => string;
}

const IntlContext = createContext<IntlContextType | null>(null);

export function IntlProvider({ 
  children, 
  locale, 
  messages 
}: { 
  children: ReactNode; 
  locale: string; 
  messages: Messages;
}) {
  const t = (key: string, values?: InterpolationValues): string => {
    const keys = key.split('.');
    let value: any = messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    let result = typeof value === 'string' ? value : key;
    
    // Interpolate values like {name}, {count}, etc.
    if (values) {
      for (const [varName, varValue] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{${varName}\\}`, 'g'), String(varValue));
      }
    }
    
    return result;
  };

  return (
    <IntlContext.Provider value={{ locale, messages, t }}>
      {children}
    </IntlContext.Provider>
  );
}

export function useTranslations(namespace?: string) {
  const context = useContext(IntlContext);
  
  if (!context) {
    throw new Error('useTranslations must be used within an IntlProvider');
  }
  
  return (key: string, values?: InterpolationValues): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return context.t(fullKey, values);
  };
}

export function useLocale(): string {
  const context = useContext(IntlContext);
  
  if (!context) {
    return 'sv'; // Default
  }
  
  return context.locale;
}

