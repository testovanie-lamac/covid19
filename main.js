function initMap() {
    window.map = L.map('mapDiv', {
        //maxBounds: L.latLngBounds(L.latLng(48.2167, 17.0140), L.latLng(48.1765, 17.0687))
    }).setView([48.1983, 17.0487], 15)
    const mapBoxToken = 'pk.eyJ1IjoidGVzdG92YW5pZS1sYW1hYyIsImEiOiJja2d5Mm5wZXgwcHJlMnNwZnNvamI0MGIyIn0.Zba11JtDpUTtIpdKhzI5fw'
    const tomtomToken = 'Y3bNLcAv2JuxjysGML4KX2aro6xLnqj7'
    //L.tileLayer('https://api.tomtom.com/map/1/tile/basic/{style}/{z}/{x}/{y}.{format}?key={accessToken}&tileSize={tileSize}', {
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: '© <a href="https://www.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        minZoom: 13,
        maxZoom: 17,
        id: 'mapbox/streets-v11',
        style: 'main', // night
        format: 'png',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: mapBoxToken
    }).addTo(window.map)

    const reload = L.control({position: 'topright'})
    reload.onAdd = function () {
        const div = L.DomUtil.create('div', 'refresh legend')
        div.innerHTML = '<button onclick="window.location.reload()">Znovu načítať</button>'
        return div
    }
    reload.addTo(window.map);
    const legend = L.control({position: 'bottomleft'})
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend')
        let labels = ['<strong>Počet čakajúcich</strong>']
        labels.push('<i style="background:#2AAD27">Do 10</i>')
        labels.push('<i style="background:#FFD326">Do 20</i>')
        labels.push('<i style="background:#CAC428">Do 40</i>')
        labels.push('<i style="background:#CB8427">Do 60</i>')
        labels.push('<i style="background:#CB2B3E">Nad 60</i>')
        div.innerHTML = labels.join('<br/>')
        return div
    };
    legend.addTo(window.map);
    fetchData()
}

window.onload = initMap

function coloredIcon(color) {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
}

function createMarker(lat, lng, color, title, tooltip) {
    console.log(`Adding N ${lat} E ${lng}, color ${color}, tooltip ${tooltip}`)
    const urlRegexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
    return L.marker([lat, lng], {
        title: title,
        icon: coloredIcon(color)
    })
        .bindPopup(tooltip.replace('\n', '<br/>').replace(urlRegexp, "<a href='$1' target='_blank'>$1</a>"))
}

function markerColor(value) {
    return (value < 0) ? 'grey' :
        (value <= 10) ? 'green' :
            (value <= 20) ? 'gold' :
                (value <= 40) ? 'yellow' :
                    (value <= 60) ? 'orange' : 'red';
}

function waitingTimeColor(waitingTime) {
    return (waitingTime < 0) ? '#7B7B7B' :
        (waitingTime <= 10) ? '#2AAD27' :
            (waitingTime <= 20) ? '#FFD326' :
                (waitingTime <= 40) ? '#CAC428' :
                    (waitingTime <= 60) ? '#CB8427' : '#CB2B3E';
}

function waitingCountColor(waitingCount) {
    return (waitingCount < 0) ? '#7B7B7B' :
        (waitingCount <= 10) ? '#2AAD27' :
            (waitingCount <= 20) ? '#FFD326' :
                (waitingCount <= 40) ? '#CAC428' :
                    (waitingCount <= 60) ? '#CB8427' : '#CB2B3E';
}


function formatDate(date) {
    return `${appendLeadingZeroes(date.getHours())}:${appendLeadingZeroes(date.getMinutes())} ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}

function appendLeadingZeroes(n) {
    return n <= 9 ? "0" + n : n;
}

function fetchData() {
    fetchLamac()
}

function fetchLamac() {
    fetch('data.json', {
        cache: 'no-store'
    })
        .then(response => response.json())
        .then(json => {
                const allMarkers = []
                json.locations.forEach(location => {
                    const avgWaitingCount = location.places.map(place => place.waitingCount.count).reduce((a, c) => a + c) / location.places.length
                    const markerClr = markerColor(avgWaitingCount)
                    const markers = L.markerClusterGroup({
                        iconCreateFunction: function (cluster) {
                            return new L.DivIcon({
                                html: `<div><span>${cluster.getChildCount()}</span></div>`,
                                className: `marker-cluster marker-cluster-small ${markerClr}`, iconSize: new L.Point(40, 40)
                            });
                        }
                    });

                    location.places.forEach(place => {
                        const [lat, lon] = [location.lat, location.lon]
                        const waitingTime = place.waitingTime.time
                        const waitingCount = place.waitingCount.count;
                        console.log(`Adding ${place.name} - N ${lat} E ${lon} waiting time ${waitingTime}`)
                        const waitingTimeString = (waitingTime < 0) ? 'Neznámy' : `${waitingTime} minút`

                        const markerClr = markerColor(waitingCount)
                        const waitingTimeClr = waitingTimeColor(waitingTime)
                        const waitingCountClr = waitingCountColor(waitingCount)

                        const tooltip = `<b>${place.name}: ${location.name}</b><br>` +
                            `Počet čakajúcich: <b style="color: ${waitingCountClr}">${waitingCount}</b><br>` +// [Aktualizované: ${formatDate(new Date(place.waitingCount.update))}]
                            `Počet otestovaných: <b>${place.testedCount.count}</b><br>` +// [Aktualizované: ${formatDate(new Date(place.testedCount.update))}]
                            `Odhadovaný čas čakania: <b style="color: ${waitingTimeClr}">${waitingTimeString}</b>` +//[Aktualizované: ${formatDate(new Date(place.waitingTime.update))}]
                            `<br><br>[Aktualizované: ${formatDate(new Date(json.update))}]`//[Aktualizované: ${formatDate(new Date(place.waitingTime.update))}]

                        markers.addLayer(createMarker(lat, lon, markerClr, place.name, tooltip));

                    })
                    allMarkers.push(markers)
                    window.map.addLayer(markers);
                })

                //window.map.fitBounds(new L.featureGroup(allMarkers).getBounds());
            }
        )
}