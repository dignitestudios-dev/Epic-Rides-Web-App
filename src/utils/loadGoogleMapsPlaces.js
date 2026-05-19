const SCRIPT_ID = 'google-maps-places-script';

export const loadGoogleMapsPlaces = (apiKey) =>
  new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('Google Maps API key is missing'));
      return;
    }

    if (window.google?.maps?.places) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(interval);
          resolve(window.google);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        if (!window.google?.maps?.places) {
          reject(new Error('Google Places failed to load'));
        }
      }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.places) {
        resolve(window.google);
      } else {
        reject(new Error('Google Places failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
