async function tryGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'pt-BR,pt;q=0.9', 'User-Agent': 'PorceliOS/1.0' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address?.trim()) return null;
  try {
    // 1. Tenta endereço completo
    let result = await tryGeocode(address);
    if (result) return result;

    // 2. Tenta rua + cidade + estado (remove número, sala, CEP, complemento)
    const cityStateMatch = address.match(/([A-Za-zÀ-ú\s]+)\s*[-–,]\s*([A-Z]{2})/);
    if (cityStateMatch) {
      const street = address.split(',')[0]?.trim();
      const cityState = cityStateMatch[0].trim();
      if (street && cityState && street !== cityState) {
        result = await tryGeocode(`${street}, ${cityState}`);
        if (result) return result;
      }
      // 3. Só cidade + estado
      result = await tryGeocode(cityState);
      if (result) return result;
    }

    // 4. Tenta pelo CEP (último recurso — pode apontar CEP em outra cidade com nome igual)
    const cep = address.match(/\d{5}-?\d{3}/)?.[0];
    if (cep && cityStateMatch) {
      // Tenta CEP + cidade/estado juntos para evitar falso positivo
      result = await tryGeocode(`${cep} ${cityStateMatch[0]}`);
      if (result) return result;
    }

    return null;
  } catch {
    return null;
  }
}
