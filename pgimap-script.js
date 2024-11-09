const styleUrl = "mapbox://styles/eugenekpgimapping/cm3ag3zn701kn01qw32rnhf2d";

mapboxgl.accessToken = mapboxAccessToken;
map = new mapboxgl.Map({
	container: 'map', // container ID
	style: styleUrl, // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
	center: [10, 46], // starting position
	zoom: 4.01, // starting zoom,
	projection: 'mercator'
});

map.on('style.load', setupMapFunctionality);

const pgiSourceId = "pgi_pdo_Nov_5-7166c9";
const pgiLayerId = 'PGI-PDO-NoWine';
let hoveredFeatureId;


function setupMapFunctionality() {

	console.log('Finalizing map...');

	map.setPaintProperty(pgiLayerId, 'fill-outline-color', [
		'case',
		['boolean', ['feature-state', 'hover'], false],
		'#6e0707',
		'rgba(255,255,255,0)'
	]);


	map.on('mousemove', pgiLayerId, (e) => {

		map.getCanvas().style.cursor = 'pointer';
		// // Set constants equal to the current feature's magnitude, location, and time
		// const quakeMagnitude = event.features[0].properties.mag;
		// const quakeLocation = event.features[0].properties.place;
		// const quakeDate = new Date(event.features[0].properties.time);

		// Check whether features exist
		if (e.features.length === 0) return;

		if (hoveredFeatureId) map.setFeatureState(
			{
				source: 'composite',
				sourceLayer: pgiSourceId,
				id: hoveredFeatureId
			},
			{
				hover: false
		});

		hoveredFeatureId = e.features[0].id;

		map.setFeatureState(
			{
				source: 'composite',
				sourceLayer: pgiSourceId,
				id: hoveredFeatureId
			},
			{
				hover: true
			}
		);
	});

// define behavior on leave
	map.on('mouseleave', pgiLayerId, () => {
		if (hoveredFeatureId) {
			map.setFeatureState(
				{
					source: 'composite',
					sourceLayer: pgiSourceId,
					id: hoveredFeatureId
				},
				{
					hover: false
				}
			);
			hoveredFeatureId = null;
		}

		// magDisplay.textContent = '';
		// locDisplay.textContent = '';
		// dateDisplay.textContent = '';

		// Reset the cursor style
		map.getCanvas().style.cursor = '';
	});

	console.log('Map ready!');
}