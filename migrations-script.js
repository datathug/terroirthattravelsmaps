let map;

// const MAPSTYLE_URL_REF = "mapbox://styles/eugenekpgimapping/cm358blab002o01nw5r7v97ri";
// const MAPSTYLE_URL_REF = 'mapbox://styles/mapbox/dark-v11';

const styleUrl = 'mapbox://styles/mapbox/light-v11';
// const pgiLayerId = 'pgi-pdo-nov-5-7166c9';
// const pgiSourceId = "pgi_pdo_Nov_5-7166c9";

const ORIGINS_GEOJSON = "./origins.geojson";
const DESTINATIONS_GEOJSON = "./destinations.geojson";

const appData = {

	origins: null,
	destinations: null,
	mapping: {},

	currentOrigFeature: null,	// Feature
	currentDestinationIndex: null,	// index in mapping array

	hoveredOrigin: null,	// feature id
	hoveredDestination: null,	// feature id
	originPopup: null,

	bottomSymbolLayerId: null
};


const infoWindow = document.getElementById('infoWindow');

// factory function, takes feature properties as input and produces HTML content for info window
function makeMigrationInfoHtml(feature) {
	const desc = descriptions[feature.id] ? descriptions[feature.id] : '<span>No details available</span>';
	return `<h3>${feature.properties['Name']}</h3>` + desc;
}


async function addToMapFromGeoJSON(id, data, color, color_hover) {

	if (!appData.bottomSymbolLayerId) {
		const layers = map.getStyle().layers;
		// Find the index of the first symbol layer in the map style.
		for (const lyr of layers) {
			if (lyr.type === 'symbol') {
				appData.bottomSymbolLayerId = lyr.id;
				break;
			}
		}
	}

	map.addSource(id, {
		'type': 'geojson',
		'data': data,
	});

	// Add a new layer to visualize the polygon.
	map.addLayer({
		'id': id,
		'type': 'fill',
		'source': id, // reference the data source
		'layout': {},
		'paint': {
			'fill-color':  [
				'case',
				['boolean', ['feature-state', 'hover'], false],
				color_hover,
				color
			], // blue color fill
			'fill-opacity':  [
				'case',
				['boolean', ['feature-state', 'hover'], false],
				0.84,
				0.7
			]
		}
	}, appData.bottomSymbolLayerId);

}

async function loadGeoJSONs() {


	await fetch(ORIGINS_GEOJSON)
		.then(response => response.json())
		.then(data => {
			appData.origins = data.features;
			addToMapFromGeoJSON('ORIGINS', data, '#245917', '#38aa38').then( () => {
					console.log(`Loaded ${data.features.length} items to layer "ORIGINS"`)
				}
			);

			appData.origins.forEach((i) => {
				const destinations = i.properties.destinations;
				if (
					Array.isArray(destinations) && destinations.length > 0
					&& destinations.every((e) => Number.isInteger(e) && e > 0)
				) {
					appData.mapping[i.id] = destinations;
				} else {
					console.log(`Skipped bad values for destinations when creating OD mapping. Values: ${destinations}`);
				}
			});
		});

	await fetch(DESTINATIONS_GEOJSON)
		.then(response => response.json())
		.then(data => {
			appData.destinations = data.features;
			addToMapFromGeoJSON('DESTINATIONS', data, '#9a2121', '#e43e3e').then( () => {
				console.log(`Loaded ${data.features.length} items to layer "DESTINATIONS"`)
				}
			);
		});
}

mapboxgl.accessToken = mapboxAccessToken;
map = new mapboxgl.Map({
	container: 'map', // container ID
	style: styleUrl, // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
	center: [10, 46], // starting position
	zoom: 4.01, // starting zoom,
	projection: 'mercator'
});


function flyToLonLat(lonLat) {
	return map.flyTo({
		center: lonLat,
		zoom: 6.3,
		speed: 1.5,
		curve: 1.33,
		duration: 1000
	});
}

// performing zoom and ease
function zoomToCurrentDest() {

	console.log(`CURR ORIG FID ${appData.currentOrigFeature.id}`)
	const did = appData.mapping[appData.currentOrigFeature.id].at(appData.currentDestinationIndex);
	console.log("FOUND MAPPING ITEM", `{${appData.currentOrigFeature.id}: ${appData.mapping[appData.currentOrigFeature.id]}}` );


	if (!(0 < did < appData.destinations.length)) {
		console.log(`No destinations present for OID=${appData.currentOrigFeature.id} with DID=${did}`);
	}
	if (!!appData.currentOrigFeature && !!did && appData.currentDestinationIndex !== null) {
		console.log(`Zooming to destination #${appData.currentDestinationIndex}, OID=${appData.currentOrigFeature.id}, DID=${did}`);
		const idx = did - 1;	// adjust for indexing from 0
		if (typeof appData.destinations[idx] === 'undefined') {
			console.log(`No dest index ${idx} present for OID=${appData.currentOrigFeature.id}`);
			return;
		}
		console.log(`Current Dest Index ${idx}`)
		const lonLat = appData.destinations[idx].properties.centroid.split(",").map((i) => parseFloat(i));

		// fly over the map
		flyToLonLat(lonLat);

	} else {
		console.log(
			`Bad data, cannot perform zooming. OID=${appData.currentOrigFeature.id}, Dest #${appData.currentDestinationIndex}, DID=${did}`
		)
	}
}

function zoomToNextDest() {
	if (appData.currentDestinationIndex == null) {
		console.log("No destination index");
		return;
	}
	appData.currentDestinationIndex++;
	if (appData.currentDestinationIndex >= appData.mapping[appData.currentOrigFeature.id].length) {
		// ensure we do not exceed
		appData.currentDestinationIndex = 0;
	}
	zoomToCurrentDest();
}

function zoomToPrevDest() {
	if (appData.currentDestinationIndex == null) {
		console.log("No destination index");
		return;
	}
	appData.currentDestinationIndex--;
	if (appData.currentDestinationIndex < 0) {
		// ensure we do not exceed
		appData.currentDestinationIndex = appData.mapping[appData.currentOrigFeature.id].length - 1;
	}
	zoomToCurrentDest();
}

function zoomToOrigin() {

	if (appData.currentOrigFeature) {
		const lonLat = appData.currentOrigFeature.properties.centroid.split(",").map((i) => parseFloat(i));
		flyToLonLat(lonLat);
		appData.currentDestinationIndex = 0;
	}
}
// map.on('mousemove', pgiLayerId, (e) => {
// 	if (e.features.length > 0) {
// 		console.log('features found')
// 		if (state.hoveredPolygonId !== null) {
// 			map.setFeatureState(
// 				{ source: 'composite', sourceLayer: pgiLayerId, id: state.hoveredPolygonId },
// 				{ hover: false }
// 			);
// 		}
// 		state.hoveredPolygonId = e.features[0].id;
// 		map.setFeatureState(
// 			{ source: 'composite', sourceLayer: pgiLayerId, id: state.hoveredPolygonId },
// 			{ hover: true }
// 		);
// 	}
// });
//
// map.on('mouseleave', pgiLayerId, () => {
// 	if (state.hoveredPolygonId !== null) {
// 		map.setFeatureState(
// 			{ source: 'composite', sourceLayer: pgiLayerId, id: state.hoveredPolygonId },
// 			{ hover: false }
// 		);
// 	}
// 	state.hoveredPolygonId = null;
// });

function onOriginUnitClicked(id_or_feature) {
	if (typeof id_or_feature !== 'object') {
		appData.currentOrigFeature = appData.origins[parseInt(id_or_feature) - 1]
	} else {
		appData.currentOrigFeature = id_or_feature;
	}

	// update menu state
	for (const e of document.getElementById('menu').children) {
		if (e.tagName !== 'A') {
			continue;
		}
		e.className = (e.id == appData.currentOrigFeature.id) ? 'selected':  '';
	}

	// update info window text
	infoWindow.innerHTML = makeMigrationInfoHtml(appData.currentOrigFeature);

	// find destinations in mapping or throw error
	if (!appData.mapping.hasOwnProperty(appData.currentOrigFeature.id)) {
		// break if no values
		const msg = `Failed to switch focus for origin ID=${appData.currentOrigFeature.id}, no destinations mapped.`;
		appData.currentOrigFeature = null;
		throw new Error(msg);
	} else {
		// proceed if destinations available
		appData.currentDestinationIndex = 0;
		zoomToCurrentDest();	// fly over the map

}
	}

// set triggers for clicking origins layer
map.on('click', 'ORIGINS', (e) => {

	// new mapboxgl.Popup()
	// 	.setLngLat(e.lngLat)
	// 	.setHTML(e.features[0].properties.unit_id)
	// 	.addTo(map);

	// set new state

	if (e.features[0]) {
		onOriginUnitClicked(e.features[0].id);	// only updates current focus feature ID data
		if (appData.currentOrigFeature) {
			document.getElementById(appData.currentOrigFeature.id).click()
		} else {
			console.error(`Failed to switch focus to Origin ID=${e.features[0].id} ${e.features[0].properties['Name']}`);
		}
	} else {
		console.error("Click on feature detected but no feature received.");
	}

	// e.stopPropagation();
});

// reverse fly-to back to origin
map.on('click', 'DESTINATIONS', (e) => {
	zoomToOrigin(e.features[0].id);
});

map.getCanvas().onkeydown = (e) => {
	// only let if there has been an origin PDO-PGI chosen
	if (appData.currentOrigFeature !== null && appData.currentDestinationIndex !== null) {
		if (e.key === 'Enter') {
			e.stopPropagation();
			console.log(`Canvas event detected: ${e.key}`);
			zoomToOrigin();
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.stopPropagation();
			console.log(`Canvas event detected: ${e.key}`);
			zoomToPrevDest();
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.stopPropagation();
			console.log(`Canvas event detected: ${e.key}`);
			zoomToNextDest();
		}
	}
}

function makeMenu() {

	console.log('Creating menu...');
	const units = document.getElementById('menu');

	if (appData.origins.length < 1) {
		console.error('Failed to create menu entries becaues no origin PDO-PGIs were loaded');
		return;
	}

	const menuHeader = document.createElement('h2');
	menuHeader.textContent = 'PROTECTED AREAS';
	units.appendChild(menuHeader);


	for (const f of appData.origins) {

		// Create a link.
		const link = document.createElement('a');
		link.id = f.id;
		link.href = '#';
		link.textContent = f.properties['Name'] + ` (${f.properties.unit_id.slice(0, 3)})`;

		// Show or hide layer when the toggle is clicked.
		link.onclick = function (e) {
			const clickedUnitId = this.id;
			// link.className = 'active';

			console.log(`Detected click on menu item ID=${clickedUnitId}, focus item change....`)
			e.preventDefault();
			e.stopPropagation();

			// for (const e of units.children) {
			// 	e.className = (e.id === this.id) ? 'active':  '';
			// }

			onOriginUnitClicked(clickedUnitId);	// only updates current focus feature ID

			// console.log('Changed focus PGI/PDO');
			};
		// console.log(link);
		units.appendChild(link);
	}
}

map.on('load', () => {
	loadGeoJSONs().then(makeMenu);
	//
	// map.addSource('arcs', {
	// 	'type': 'geojson',
	// 	'data': data,
	// });
	// map.addLayer('arcs',
	// 	)

});

// Generate arc from start point to the end point.
// The segments parameter tell us how many
// new point should we generate.
function generateArc(start, end, segments) {
	// Get the mid point between start and end
	let midPoint = turf.midpoint(start, end);

	// Get the bearing
	let bearing = turf.bearing(end, start);

	// Get half of the distance, because we
	// start from the midpoint.
	let distance = turf.distance(start, end) / 2;

	// Add the start coordinate
	let arc = [start.geometry.coordinates];

	// We devide 180 angle by segments, and for each angle
	// we transform the mid point by distance and an angle.
	for (let angle = 0; angle < 180; angle += (180/ (segments))) {
		let rotatedPoint = turf.transformTranslate(midPoint,
			distance,
			bearing - angle);
		arc.push(rotatedPoint.geometry.coordinates);
	}

	// Add the last coordinate
	arc.push(end.geometry.coordinates);

	return arc
}


// hover effects
map.on('mousemove', 'ORIGINS', (e) => {

	// avoid running when no feature or same feature
	if (e.features.length === 0 || appData.hoveredOrigin === e.features[0].id) return;

	if (appData.hoveredOrigin !== null) {
			map.setFeatureState(
				{ source: 'ORIGINS', id: appData.hoveredOrigin },
				{ hover: false }
			);
		}

		const f = e.features[0]
		const props = f.properties;
		appData.hoveredOrigin = f.id;
		map.setFeatureState(
			{ source: 'ORIGINS', id: appData.hoveredOrigin },
			{ hover: true }
		);

		const popupHtml =
			`<h1>${props['Name']}</h1>
			<p></p>${props['Product category (obsolete)']}</p>
			<p>Code ${props['unit_id']} <b>${props['Country']}</b></p>`;

		if (appData.originPopup === null) {
			appData.originPopup = new mapboxgl.Popup({closeOnClick: false})
				.setLngLat(e.lngLat)
				.setHTML(popupHtml)
				.addTo(map);
		} else {
			appData.originPopup.setLngLat(e.lngLat)
				.setHTML(popupHtml).addTo(map);
		}
		map.getCanvas().style.cursor = 'pointer';
});


map.on('mouseleave', 'ORIGINS', () => {
	if (appData.hoveredOrigin !== null) {
		map.setFeatureState(
			{ source: 'ORIGINS', id: appData.hoveredOrigin },
			{ hover: false }
		);
	}
	map.getCanvas().style.cursor = '';
	appData.hoveredOrigin = null;
	if (appData.originPopup) {
		appData.originPopup.remove();
	}
});

// hover effects
map.on('mousemove', 'DESTINATIONS', (e) => {
	if (e.features.length > 0) {
		if (appData.hoveredDestination !== null) {
			map.setFeatureState(
				{ source: 'DESTINATIONS', id: appData.hoveredDestination },
				{ hover: false }
			);
		}
		const f = e.features[0]
		appData.hoveredDestination = f.id;
		map.setFeatureState(
			{ source: 'DESTINATIONS', id: appData.hoveredDestination },
			{ hover: true }
		);

		map.getCanvas().style.cursor = 'pointer';

	}
});


map.on('mouseleave', 'DESTINATIONS', () => {
	if (appData.hoveredDestination !== null) {
		map.setFeatureState(
			{ source: 'DESTINATIONS', id: appData.hoveredDestination },
			{ hover: false }
		);
	}
	appData.hoveredDestination = null;
	map.getCanvas().style.cursor = '';
});

// put callbacks on buttons: Left
document.getElementById('arrow-left').onclick = () => {
	if (appData.currentOrigFeature !== null && appData.currentDestinationIndex !== null) {
		console.log(`Button left clicked`);
		zoomToPrevDest();
	} else {
		console.log(`Button left clicked, no action possible`);
	}
}

// put callbacks on buttons: Right
document.getElementById('arrow-right').onclick = () => {
	if (appData.currentOrigFeature !== null && appData.currentDestinationIndex !== null) {
		console.log(`Button right clicked`);
		zoomToNextDest();
	} else {
		console.log(`Button right clicked, no action possible`);
	}
}

document.getElementById('origin-button').onclick = () => {
	if (appData.currentOrigFeature !== null && appData.currentDestinationIndex !== null) {
		console.log(`Origin button clicked`);
		zoomToOrigin();
	} else {
		console.log(`Origin button clicked, no action possible`);
	}
}