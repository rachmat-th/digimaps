"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, X, Check } from "lucide-react";
import { MapPinIcon } from "@heroicons/react/24/solid";
import { indonesiaCities, type Province } from "@/lib/indonesia-cities";
import { useScrapingContext } from "@/contexts/scraping-context";
import { useRouter } from "next/navigation";

export default function SearchForm() {
  const router = useRouter();
  const globalScraping = useScrapingContext();
  
  const [keyword, setKeyword] = useState("");
  const [province, setProvince] = useState<Province | "">("");
  const [city, setCity] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [step, setStep] = useState<"province" | "city">("province");
  const [commandKey, setCommandKey] = useState(0); // For tracking, not controlling
  const [showLocationHint, setShowLocationHint] = useState(false);

  const cities = province ? indonesiaCities[province] : [];
  const hasLocation = province && city;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword || !city || globalScraping.isLoading) return;

    // Check if scraping already running
    try {
      const statusRes = await fetch('/api/scrape/status');
      const statusData = await statusRes.json();
      
      if (statusData.isRunning) {
        alert(`Scraping is already in progress: "${statusData.keyword}" in ${statusData.city}.\n\nPlease wait until it completes.`);
        return;
      }
    } catch (error) {
      console.error('Failed to check scraping status:', error);
    }

    globalScraping.setIsLoading(true);
    globalScraping.setProgress(0);
    globalScraping.setSearchInfo(keyword, city);
    
    try {
      // Call scraping API with Server-Sent Events
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          city,
          province,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start scraping');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.status === 'scraping' || data.status === 'starting') {
              globalScraping.setStatusText(data.message);
              globalScraping.setProgress((prev) => Math.min(prev + 5, 95));
            } else if (data.status === 'complete') {
              globalScraping.setStatusText('Complete!');
              globalScraping.setProgress(100);
              setTimeout(() => {
                globalScraping.reset();
                router.push('/database');
              }, 1000);
            } else if (data.status === 'error') {
              globalScraping.setStatusText('Error: ' + data.message);
              setTimeout(() => {
                globalScraping.reset();
              }, 3000);
            }
          }
        }
      }
    } catch (error) {
      console.error('Scraping error:', error);
      globalScraping.setStatusText('Error occurred');
      setTimeout(() => {
        globalScraping.reset();
      }, 3000);
    }
  };

  const clearLocation = () => {
    setProvince("");
    setCity("");
    setStep("province");
  };

  const handleProvinceSelect = (selectedProvince: Province) => {
    setProvince(selectedProvince);
    setCity("");
    setStep("city");
    setCommandKey(prev => prev + 1); // Force remount untuk clear search
  };

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setIsLocationOpen(false);
    setStep("province");
    setShowLocationHint(false); // Hide hint after location is selected
    setCommandKey(prev => prev + 1); // Force remount untuk clear search
  };

  return (
    <div className="w-full max-w-3xl">
      {/* Logo - responsive */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8 md:mb-12 text-center"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-zinc-900 dark:text-zinc-100">
          Digimaps
        </h1>
      </motion.div>

      {/* Search Form - responsive */}
      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-0"
      >
        {/* Search Bar with Location Badge/Icon Toggle - responsive */}
        <div className="relative mb-4 sm:mb-5">
          <div className="flex h-12 sm:h-14 items-center gap-2 sm:gap-3 rounded-full border border-zinc-300 bg-white px-3 sm:px-5 shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md dark:border-zinc-600 dark:bg-white">
            {/* Search Icon */}
            <Search className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-zinc-400 dark:text-zinc-500" />

            {/* Search Input - responsive placeholder */}
            <input
              type="text"
              placeholder="Cari (Restaurant, Cafe, Hospital)"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                // Show location hint when user starts typing but hasn't selected location
                if (e.target.value.length > 2 && !hasLocation) {
                  setShowLocationHint(true);
                } else if (e.target.value.length <= 2) {
                  // Hide hint when user deletes text
                  setShowLocationHint(false);
                }
              }}
              disabled={globalScraping.isLoading}
              className="flex-1 bg-transparent text-sm sm:text-base outline-none placeholder:text-zinc-400 dark:text-zinc-900 dark:placeholder:text-zinc-500"
            />

            {/* Location Badge OR MapPin Icon (Toggle) - responsive */}
            {hasLocation ? (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 sm:gap-1.5 rounded-full bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-100 dark:text-blue-900 dark:hover:bg-blue-200"
              >
                <MapPinIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="max-w-[80px] sm:max-w-[150px] truncate">{city}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLocation();
                  }}
                  className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-950"
                >
                  <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
              </Badge>
            ) : (
              <div className="relative">
                {/* Animated pulse ring when hint is shown */}
                {showLocationHint && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-rose-400"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.6, 0, 0.6]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
                <Popover open={isLocationOpen} onOpenChange={(open) => {
                  setIsLocationOpen(open);
                  if (open) {
                    setShowLocationHint(false); // Hide hint when popover opens
                    setCommandKey(prev => prev + 1); // Clear search saat popover dibuka
                  }
                }}>
                  <PopoverTrigger 
                    className="relative rounded-full p-1.5 sm:p-2 text-rose-600 transition-colors hover:bg-zinc-100 dark:text-rose-600 dark:hover:bg-zinc-200" 
                    title="Pilih lokasi"
                  >
                    <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] sm:w-[320px] p-0" align="end">
                  <Command key={commandKey} className="rounded-lg border-0">
                    <CommandInput 
                      placeholder={step === "province" ? "Cari provinsi..." : "Cari kota..."}
                    />
                    <CommandList className="max-h-[280px]">
                      <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                      
                      {step === "province" ? (
                        <CommandGroup heading="Provinsi Indonesia">
                          {Object.keys(indonesiaCities).map((prov) => (
                            <CommandItem
                              key={prov}
                              value={prov}
                              onSelect={() => handleProvinceSelect(prov as Province)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  province === prov ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {prov}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : (
                        <>
                          <div className="flex items-center justify-between border-b px-3 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setStep("province");
                                setCity("");
                                setCommandKey(prev => prev + 1); // Clear search saat back
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              ← Ganti Provinsi
                            </button>
                            <span className="text-xs text-zinc-500">{province}</span>
                          </div>
                          <CommandGroup heading="Kota/Kabupaten">
                            {cities.map((c) => (
                              <CommandItem
                                key={c}
                                value={c}
                                onSelect={() => handleCitySelect(c)}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    city === c ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {c}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              </div>
            )}
          </div>
          
          {/* Helper text - shows when user has typed but no location selected */}
          {keyword.length > 2 && !hasLocation && showLocationHint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center justify-center gap-2 px-4"
            >
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <MapPinIcon className="h-4 w-4 text-rose-500" />
              </motion.div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Klik icon lokasi untuk memilih kota
              </p>
            </motion.div>
          )}
        </div>

        {/* Submit Button with Animated Border - responsive */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="relative">
            {/* Animated Progress Ring with Gradient - Ultra Vibrant */}
            {globalScraping.isLoading && (
              <motion.div
                className="absolute -inset-[2px] rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, #1B4EF5 0%, #F62477 ${globalScraping.progress / 2}%, #F62477 ${globalScraping.progress}%, transparent ${globalScraping.progress}%)`,
                  padding: '2px',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="h-full w-full rounded-full bg-white dark:bg-zinc-900/95" />
              </motion.div>
            )}
            
            <Button
              type="submit"
              disabled={globalScraping.isLoading || !keyword || !city}
              className={`relative h-10 w-32 sm:h-11 sm:w-36 rounded-full text-xs sm:text-sm font-medium transition-all ${
                globalScraping.isLoading || !keyword || !city
                  ? 'cursor-not-allowed opacity-100' 
                  : 'cursor-pointer'
              } ${
                globalScraping.isLoading 
                  ? 'bg-blue-600 hover:bg-blue-600 dark:bg-zinc-800/90' 
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500'
              }`}
            >
              {/* Button Text - Force white with high specificity */}
              <span className="relative z-50 font-semibold text-white" style={{ color: '#ffffff !important' }}>
                {globalScraping.isLoading ? `${Math.round(globalScraping.progress)}%` : "Cari"}
              </span>
            </Button>
          </div>

          {/* Status Text with Pulse Animation - responsive */}
          {globalScraping.isLoading && globalScraping.statusText && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-[#F62477] dark:bg-bg-[#F62477]"
              />
              <span className="text-xs sm:text-sm text-zinc-600 dark:text-white text-center px-4">
                {globalScraping.statusText}
              </span>
            </motion.div>
          )}
        </div>
      </motion.form>
    </div>
  );
}
