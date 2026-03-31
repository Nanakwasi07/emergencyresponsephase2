import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { HiMapPin, HiMagnifyingGlass } from 'react-icons/hi2';

// Fix Leaflet default icon in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored icons for institution types
const createColoredIcon = (color) => {
  const colorMap = {
    fire: '#ef4444',      // Red for fire
    police: '#3b82f6',    // Blue for police
    hospital: '#22c55e',  // Green for hospital
  };

  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${colorMap[color] || '#ef4444'}" stroke="#fff" stroke-width="1"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5" fill="#fff"/>
    </svg>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Map click handler component
function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  onLocationSelect,
  initialLat = 5.6037,
  initialLng = -0.187,
  markerColor = 'fire',
  height = '400px'
}) {
  const [marker, setMarker] = useState(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  // Handle map click
  const handleMapSelect = useCallback((lat, lng) => {
    setMarker([lat, lng]);
    setSearchQuery('');
    setSearchResults([]);
    onLocationSelect(lat, lng);
  }, [onLocationSelect]);

  // Handle address search using Nominatim (OpenStreetMap)
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addresstype=settlement`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Handle search result selection
  const handleSelectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    handleMapSelect(lat, lng);
    setSearchQuery(result.display_name);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Box */}
      <div className="relative mb-3">
        <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search location or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9 w-full"
        />

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 border-b border-slate-700/50 last:border-0 transition-colors"
              >
                <div className="font-medium text-slate-200 truncate">
                  {result.name || result.display_name.split(',')[0]}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400">
            Searching...
          </div>
        )}
      </div>

      {/* Map */}
      <div
        className="flex-1 rounded-lg overflow-hidden border border-slate-700"
        style={{ height, minHeight: '300px' }}
      >
        <MapContainer
          center={[initialLat, initialLng]}
          zoom={11}
          style={{ height: '100%', width: '100%', background: '#1e293b' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onSelect={handleMapSelect} />
          {marker && (
            <Marker position={marker} icon={createColoredIcon(markerColor)}>
              <Popup>
                <div className="text-slate-900 text-sm">
                  <strong>Selected Location</strong>
                  <br />
                  Lat: {marker[0].toFixed(4)}, Lon: {marker[1].toFixed(4)}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Coordinate Display */}
      {marker && (
        <div className="mt-3 p-2 bg-slate-700/40 rounded text-xs text-slate-300">
          <div className="flex items-center gap-1 mb-1">
            <HiMapPin className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Selected Coordinates:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-400">
            <div>Latitude: <span className="text-slate-200">{marker[0].toFixed(6)}</span></div>
            <div>Longitude: <span className="text-slate-200">{marker[1].toFixed(6)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
