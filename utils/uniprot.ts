// Utility to fetch protein data from UniProt API with caching

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const fetchUniProtInfo = async (uniprotId: string) => {
  if (!uniprotId || uniprotId === 'N/A') return null;
  
  const cacheKey = `uniprot_${uniprotId}`;
  
  // Check session storage if available (browser env)
  if (typeof sessionStorage !== 'undefined') {
    const cachedString = sessionStorage.getItem(cacheKey);
    if (cachedString) {
      try {
        const cachedEntry = JSON.parse(cachedString);
        // Check if data is fresh
        if (cachedEntry.timestamp && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
          return cachedEntry.data;
        } else {
          // Clean up expired cache
          sessionStorage.removeItem(cacheKey);
        }
      } catch (e) {
        // Corrupt cache data
        sessionStorage.removeItem(cacheKey);
      }
    }
  }

  try {
    const response = await fetch(`https://rest.uniprot.org/uniprotkb/${uniprotId}.json`);
    
    if (!response.ok) {
       // Return null for 404s, throw for other errors
       if (response.status === 404) return null;
       throw new Error(`UniProt API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (typeof sessionStorage !== 'undefined') {
      try {
        const cacheEntry = {
          timestamp: Date.now(),
          data: data
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch (e) {
        console.warn('Failed to save to sessionStorage', e);
      }
    }
    
    return data;
  } catch (error) {
    console.error("UniProt Fetch Error", error);
    throw error;
  }
};