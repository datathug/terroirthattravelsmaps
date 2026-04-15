import { useRef, useState, useCallback } from 'react';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import InfoWindow from './InfoWindow.jsx';
import SearchBox from './SearchBox.jsx';
import CategoryFilter from './CategoryFilter.jsx';
import '../styles/map.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = 'mapbox://styles/eugenekpgimapping/cm3ag3zn701kn01qw32rnhf2d';
const PGI_LAYER_ID = 'PGI-PDO-NoWine';
const PGI_SOURCE_LAYER = 'pgi_pdo_Nov_5-7166c9';

const UNITS_OF_INTEREST = ['PDO-PT-0233', 'PGI-FR-0193', 'PGI-NL-0215'];

// Compute a bounding box [[minLng, minLat], [maxLng, maxLat]] from any GeoJSON geometry
function getFeatureBounds(feature) {
  const coords = [];
  const extract = (item) => {
    if (typeof item[0] === 'number') {
      coords.push(item);
    } else {
      item.forEach(extract);
    }
  };
  try {
    extract(feature.geometry.coordinates);
  } catch {
    return null;
  }
  if (!coords.length) return null;
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export default function PGIMap() {
  const mapRef = useRef(null);
  const hoveredIdRef = useRef(null);
  const [hoveredProps, setHoveredProps] = useState(null);
  const [cursor, setCursor] = useState('auto');
  const [searchFeatures, setSearchFeatures] = useState([]);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current.getMap();

    // Highlight hovered feature outline in dark red
    map.setPaintProperty(PGI_LAYER_ID, 'fill-outline-color', [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#6e0707',
      'rgba(255,255,255,0)',
    ]);

    // Render units of interest on top of overlapping polygons
    map.setLayoutProperty(PGI_LAYER_ID, 'fill-sort-key', [
      'to-number',
      ['in', ['get', 'unit_id'], ['literal', UNITS_OF_INTEREST]],
      0,
    ]);

    // Build the search index once all initial tiles are rendered.
    // querySourceFeatures returns features from loaded vector tiles;
    // we deduplicate by unit_id and unsubscribe after the first
    // successful batch so the listener doesn't run on every idle.
    const buildSearchIndex = () => {
      const raw = map.querySourceFeatures('composite', {
        sourceLayer: PGI_SOURCE_LAYER,
      });
      const seen = new Set();
      const unique = [];
      for (const f of raw) {
        const uid = f.properties?.unit_id;
        if (uid && !seen.has(uid)) {
          seen.add(uid);
          unique.push(f);
        }
      }
      if (unique.length > 0) {
        setSearchFeatures(unique);
        map.off('idle', buildSearchIndex);
      }
    };

    map.on('idle', buildSearchIndex);
  }, []);

  // Called when the user picks a result from the search dropdown
  const handleFeatureSelect = useCallback((feature) => {
    const map = mapRef.current.getMap();

    // Show details in the info window
    setHoveredProps(feature.properties);

    // Fly to the feature's bounding box
    const bounds = getFeatureBounds(feature);
    if (bounds) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 1000 });
    }
  }, []);

  const onMouseMove = useCallback((event) => {
    const map = mapRef.current.getMap();
    const features = event.features;

    if (features && features.length > 0) {
      const feature = features[0];

      if (hoveredIdRef.current === feature.id) return;

      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: 'composite', sourceLayer: PGI_SOURCE_LAYER, id: hoveredIdRef.current },
          { hover: false }
        );
      }

      hoveredIdRef.current = feature.id;
      map.setFeatureState(
        { source: 'composite', sourceLayer: PGI_SOURCE_LAYER, id: feature.id },
        { hover: true }
      );

      setHoveredProps(feature.properties);
      setCursor('pointer');
    } else if (hoveredIdRef.current !== null) {
      map.setFeatureState(
        { source: 'composite', sourceLayer: PGI_SOURCE_LAYER, id: hoveredIdRef.current },
        { hover: false }
      );
      hoveredIdRef.current = null;
      setCursor('auto');
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    const map = mapRef.current.getMap();

    if (hoveredIdRef.current !== null) {
      map.setFeatureState(
        { source: 'composite', sourceLayer: PGI_SOURCE_LAYER, id: hoveredIdRef.current },
        { hover: false }
      );
      hoveredIdRef.current = null;
    }
    setCursor('auto');
  }, []);

  return (
    <>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 10,
          latitude: 46,
          zoom: 4.01,
        }}
        style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }}
        mapStyle={MAP_STYLE}
        projection="mercator"
        interactiveLayerIds={[PGI_LAYER_ID]}
        cursor={cursor}
        onLoad={onMapLoad}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      />
      <div className="map-controls">
        <SearchBox features={searchFeatures} onSelect={handleFeatureSelect} />
        <CategoryFilter features={searchFeatures} />
      </div>
      <InfoWindow properties={hoveredProps} />
    </>
  );
}
