"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScrapingContextType {
  isLoading: boolean;
  progress: number;
  statusText: string;
  keyword: string;
  city: string;
  setIsLoading: (loading: boolean) => void;
  setProgress: (progress: number | ((prev: number) => number)) => void;
  setStatusText: (text: string) => void;
  setSearchInfo: (keyword: string, city: string) => void;
  reset: () => void;
}

const ScrapingContext = createContext<ScrapingContextType | undefined>(undefined);

export function ScrapingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');

  const setSearchInfo = (kw: string, c: string) => {
    setKeyword(kw);
    setCity(c);
  };

  const reset = () => {
    setIsLoading(false);
    setProgress(0);
    setStatusText('');
    setKeyword('');
    setCity('');
  };

  return (
    <ScrapingContext.Provider
      value={{
        isLoading,
        progress,
        statusText,
        keyword,
        city,
        setIsLoading,
        setProgress,
        setStatusText,
        setSearchInfo,
        reset,
      }}
    >
      {children}
    </ScrapingContext.Provider>
  );
}

export function useScrapingContext() {
  const context = useContext(ScrapingContext);
  if (context === undefined) {
    throw new Error('useScrapingContext must be used within ScrapingProvider');
  }
  return context;
}
