/**
 * Extract city/kabupaten from full address
 * Example: "Jl. Raya No.123, Cikole, Sukabumi, Jawa Barat" → "Sukabumi"
 */
export function extractCity(address: string | null): string {
  if (!address) return '-';

  // Remove postal code first
  const cleanAddress = address.replace(/\b\d{5}\b/g, '').trim();

  // Indonesian provinces for boundary detection
  const provinces = [
    'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'DKI Jakarta', 'DI Yogyakarta',
    'Banten', 'Sumatera Utara', 'Sumatera Barat', 'Sumatera Selatan', 'Riau',
    'Kepulauan Riau', 'Jambi', 'Bengkulu', 'Lampung', 'Bangka Belitung',
    'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
    'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat',
    'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
    'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Tengah', 'Papua Selatan',
    'Aceh'
  ];

  // Pattern 1: Explicit "Kota/Kabupaten X"
  const explicitPattern = /(?:Kota|Kabupaten|Kab\.)\s+([A-Za-z\s]+?)(?:,|$)/i;
  const explicitMatch = cleanAddress.match(explicitPattern);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].trim();
  }

  // Pattern 2: City before province (most reliable)
  // Format: "..., City Name, Province Name"
  for (const province of provinces) {
    const pattern = new RegExp(`,\\s*([A-Za-z\\s]+?)(?:,\\s*${province.replace(/\s+/g, '\\s+')}|\\s+${province.replace(/\s+/g, '\\s+')})`, 'i');
    const match = cleanAddress.match(pattern);
    if (match && match[1]) {
      const cityCandidate = match[1].trim();
      // Exclude if it looks like a district (Kec., too short, or common district words)
      if (!cityCandidate.match(/^Kec\./i) && 
          cityCandidate.length >= 4 && 
          !cityCandidate.match(/^(Kelurahan|Desa|Rt|Rw)\b/i)) {
        return cityCandidate;
      }
    }
  }

  // Pattern 3: Second-to-last segment (often the city)
  // Format: "Street, District, City, Province"
  const segments = cleanAddress.split(',').map(s => s.trim()).filter(s => s.length > 0);
  if (segments.length >= 3) {
    const cityCandidate = segments[segments.length - 2];
    // Check if it's not a province and has reasonable length
    if (cityCandidate && 
        cityCandidate.length >= 4 && 
        cityCandidate.length <= 30 &&
        !provinces.some(p => p.toLowerCase() === cityCandidate.toLowerCase()) &&
        !cityCandidate.match(/^(Kec\.|Kelurahan|Desa|Rt|Rw)\b/i)) {
      return cityCandidate;
    }
  }

  // Fallback: Last segment if it looks like a city
  if (segments.length >= 2) {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && 
        lastSegment.length > 3 && 
        lastSegment.length < 40 && 
        !/^\d+$/.test(lastSegment) &&
        !lastSegment.toLowerCase().includes('indonesia')) {
      return lastSegment;
    }
  }

  // Ultimate fallback
  return cleanAddress.substring(0, 40) + (cleanAddress.length > 40 ? '...' : '');
}

/**
 * Extract domain from URL for display
 * Example: "https://www.example.com/path" → "example.com"
 */
export function extractDomain(url: string | null): string {
  if (!url) return '-';
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
