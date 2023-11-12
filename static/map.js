async function loadGeoJson(gameUuid) {
    return (await fetch(`/game/${gameUuid}/geojson`)).json();
}

async function loadClaimedSubregions(gameUuid) {
    return (await fetch(`/game/${gameUuid}/claimed-subregions`)).json()
}

async function loadMapboxPublicKey() {
    return (await fetch(`/config/mapbox-public-key`)).json()
}

async function loadMap(gameUuid, mapSelector) {
    const [geoJson, claimedSubregions, mapboxPublicKey] = await Promise.all([
        loadGeoJson(gameUuid),
        loadClaimedSubregions(gameUuid),
        loadMapboxPublicKey()
    ]);

    mapboxgl.accessToken = mapboxPublicKey.publicKey;

    const map = new mapboxgl.Map({
        container: mapSelector, // container ID
        // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
        style: 'mapbox://styles/mapbox/light-v11', // style URL
        center: [6.021, 50.754], // starting position
        zoom: 9 // starting zoom
    });

    map.on("load", () => initMap(map, geoJson, claimedSubregions));    
}

async function initMap(map, geoJson, claimedSubregions) {
    // List of colors to highlight claimed subregions
    const colors = [
        "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff",
        "#aa00cc", "#cc5500"
    ];

    // Hide state/region borders because they conflict with the GeoJson data
    var borders = ['admin-0-boundary', 'admin-1-boundary', 'admin-0-boundary-disputed', 'admin-0-boundary-bg'];
    borders.forEach(function (border) {
        map.setLayoutProperty(border, 'visibility', 'none');
    });


    map.addSource("subregions", {
        "type": "geojson",
        "data": geoJson,
        "generateId": true
    });

    map.addLayer({
        "id": "outline",
        "type": "line",
        "source": "subregions",
        "paint": {
            "line-color": "#888",
            "line-opacity": [
                'case', ['boolean', ['feature-state', 'hover'], false], 0.4, 0.8
            ],
            "line-width": [
                'case', ['boolean', ['feature-state', 'hover'], false], 2, 1
            ]
        }
    });

    map.addLayer({
        "id": "defaultFill",
        "type": "fill",
        "source": "subregions",
        "paint": {
            "fill-opacity": 0
        }
    })

    map.addLayer({
        "id": "labels",
        "type": "symbol",
        "source": "subregions",
        "minzoom": 9,
        "layout": {
            "text-field": ["get", "LAU_NAME"],
            "text-size": 10
        },
        "paint": {
            "text-opacity": 0.8
        }
    })

    claimedSubregions.teams.forEach((team, i) => {
        const color = colors[i];
        map.addLayer({
            "id": `team-${team.uuid}`,
            "type": "fill",
            "source": "subregions",
            "paint": {
                "fill-color": color,
                "fill-opacity": 0.5
            },
            "filter": ["in", "LAU_ID", ...team.subregions.map(subregion => subregion.id)]
        });

        const li = document.createElement("li");
        const block = document.createElement("span");
        block.textContent = "█"
        block.style.color = color;
        li.appendChild(block);
        li.appendChild(document.createTextNode(team.name));
        document.querySelector("#legend").appendChild(li);
    });

    let hoveredPolygonId = null;

    // When the user moves their mouse over the state-fill layer, we'll update the
    // feature state for the feature under the mouse.
    map.on('mousemove', 'defaultFill', (e) => {
        if (e.features.length > 0) {
            if (hoveredPolygonId !== null) {
                map.setFeatureState(
                    { source: 'subregions', id: hoveredPolygonId },
                    { hover: false }
                );
            }
            hoveredPolygonId = e.features[0].id;
            map.setFeatureState(
                { source: 'subregions', id: hoveredPolygonId },
                { hover: true }
            );
        }
    });

    // When the mouse leaves the state-fill layer, update the feature state of the
    // previously hovered feature.
    map.on('mouseleave', 'defaultFill', () => {
        if (hoveredPolygonId !== null) {
            map.setFeatureState(
                { source: 'subregions', id: hoveredPolygonId },
                { hover: false }
            );
        }
        hoveredPolygonId = null;
    });
}