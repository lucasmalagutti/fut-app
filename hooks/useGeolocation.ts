import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permissão de localização negada');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {
        setError('Não foi possível obter a localização');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, error, loading };
}
