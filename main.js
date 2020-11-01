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
        const div = L.DomUtil.create('div', 'refresh')
        div.innerHTML = '<button onclick="window.location.reload()">Znovu načítať</button>'
        return div
    }
    reload.addTo(window.map)
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
    }
    legend.addTo(window.map)
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
    return L.marker([lat, lng], {
        title: title,
        icon: coloredIcon(color)
    })
        .bindPopup(tooltip, {minWidth: 500})
}

function markerColor(value) {
    return (value < 0) ? 'grey' :
        (value <= 10) ? 'green' :
            (value <= 20) ? 'gold' :
                (value <= 40) ? 'yellow' :
                    (value <= 60) ? 'orange' : 'red'
}

function waitingTimeColor(waitingTime) {
    return (waitingTime < 0) ? '#7B7B7B' :
        (waitingTime <= 10) ? '#2AAD27' :
            (waitingTime <= 20) ? '#FFD326' :
                (waitingTime <= 40) ? '#CAC428' :
                    (waitingTime <= 60) ? '#CB8427' : '#CB2B3E'
}

function waitingCountColor(waitingCount) {
    return (waitingCount < 0) ? '#7B7B7B' :
        (waitingCount <= 10) ? '#2AAD27' :
            (waitingCount <= 20) ? '#FFD326' :
                (waitingCount <= 40) ? '#CAC428' :
                    (waitingCount <= 60) ? '#CB8427' : '#CB2B3E'
}


function formatDate(date) {
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}

function formatTime(date) {
    return `${appendLeadingZeroes(date.getHours())}:${appendLeadingZeroes(date.getMinutes())}`
}

function formatTimeAndDate(date) {
    return `${formatTime(date)} ${formatDate(date)}`
}

function formatDateAndTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`
}

function appendLeadingZeroes(n) {
    return n <= 9 ? "0" + n : n
}

function printDate(date) {
    return date === undefined ? "" : `k ${formatDate(new Date(date))}`
}

function printDateAndTime(date) {
    return date === undefined ? "" : `k ${formatDateAndTime(new Date(date))}`
}

function fetchData() {
    fetchLamac()
}

function proportionOfPositiveTest(positiveCount, testedCount) {
    return (positiveCount * 100 / testedCount).toFixed(2)
}

function fetchLamac() {
    fetch('data.json', {
        cache: 'no-store'
    })
        .then(response => response.json())
        .then(json => {
                const update = new Date(json.update);
                const updateString = formatTime(update)
                let places = 0
                let allWaitingTime = 0
                let allWaitingCount = 0
                let allTestedCount = 0
                let allTestedCountToday = 0
                let allPositiveCount = 0
                let allPositiveCountToday = 0

                json.locations.forEach(location => {
                    const avgWaitingCount = location.places.map(place => place.waitingCount.count).reduce((a, c) => a + c) / location.places.length
                    const markerClr = markerColor(avgWaitingCount)
                    const markers = L.markerClusterGroup({
                        iconCreateFunction: function (cluster) {
                            return new L.DivIcon({
                                html: `<div><span>${cluster.getChildCount()}</span></div>`,
                                className: `marker-cluster marker-cluster-small ${markerClr}`, iconSize: new L.Point(40, 40)
                            })
                        }
                    })

                    location.places.forEach(place => {
                        const [lat, lon] = [location.lat, location.lon]
                        const waitingTime = place.waitingTime.time
                        const waitingCount = place.waitingCount.count
                        const waitingCountString = (waitingCount < 0) ? '-' : `~ ${waitingCount}`
                        const waitingTimeString = (waitingTime < 0) ? 'Neznámy' : `~ ${waitingTime} minút`

                        const markerClr = markerColor(waitingCount)
                        const waitingTimeClr = waitingTimeColor(waitingTime)
                        const waitingCountClr = waitingCountColor(waitingCount)

                        const tooltip = `<b>${place.name}: ${location.name}</b><br/>` +
                            // `Aktualizované: <b>${updateString}</b><br/><br/>` +
                            //
                            // `Počet čakajúcich: <b style="color: ${waitingCountClr}">${waitingCountString}</b><br/>` +
                            // `Čas čakania: <b style="color: ${waitingTimeClr}">${waitingTimeString}</b><br/><br/>` +

                            /*`<b>Predbežné výsledky testov</b><br/>` +*/
                            `Počet otestovaných: <b>${place.testedCount.count + place.testedCount.today}</b><br/>` +
                            `Počet pozitívnych výsledkov: <b>${place.positive.count + place.positive.today}</b><br/>` +
                            `Podiel pozitívnych výsledkov: <b>${proportionOfPositiveTest(place.positive.count + place.positive.today, place.testedCount.count + place.testedCount.today)}%</b><br/><br/>` +

                            `<b>Priebežné výsledky testov za ${formatDate(update)}</b><br/>` +
                            `Počet otestovaných: <b>${place.testedCount.today}</b><br/>` +
                            `Počet pozitívnych výsledkov: <b>${place.positive.today}</b><br/>` +
                            `Podiel pozitívnych výsledkov: <b>${proportionOfPositiveTest(place.positive.today, place.testedCount.today)}%</b><br/><br/>` +

                            `<b>Výsledky testov za 31.10.2020</b><br/>` +
                            `Počet otestovaných: <b>${place.testedCount.count}</b><br/>` +
                            `Počet pozitívnych výsledkov: <b>${place.positive.count}</b><br/>` +
                            `Podiel pozitívnych výsledkov: <b>${proportionOfPositiveTest(place.positive.count, place.testedCount.count)}%</b>`

                        markers.addLayer(createMarker(lat, lon, markerClr, place.name, tooltip))

                        places++
                        if (waitingTime > 0) {
                            allWaitingTime += waitingTime
                        }
                        if (waitingCount > 0) {
                            allWaitingCount += waitingCount
                        }
                        allTestedCount += place.testedCount.count
                        allTestedCountToday += place.testedCount.today
                        allPositiveCount += place.positive.count
                        allPositiveCountToday += place.positive.today

                    })
                    window.map.addLayer(markers)
                })

                const stats = L.control({position: "bottomright"})

                const avgWaitingCount = (allWaitingCount / places).toFixed(0);
                const avgWaitingCountString = (avgWaitingCount < 0) ? '-' : `~ ${avgWaitingCount}`
                const avgWaitingCountClr = waitingCountColor(avgWaitingCount)

                const avgWaitingTimeString = (allWaitingTime < 0) ? 'Neznámy' : `~ ${allWaitingTime} minút`
                const avgWaitingTime = (allWaitingTime / places).toFixed(2);
                const avgWaitingTimeClr = waitingTimeColor(avgWaitingTime)

                stats.onAdd = function () {
                    const div = L.DomUtil.create('div', 'info stats')

                    div.innerHTML = `<b>Lamač</b><br/>` +
                        // `Aktualizované: <b>${updateString}</b><br/><br/>` +
                        //
                        // `Priemerný počet čakajúcich: <b style="color: ${avgWaitingCountClr}">${avgWaitingCountString}</b><br/>` +
                        // `Priemerný čas čakania: <b style="color: ${avgWaitingTimeClr}">${avgWaitingTimeString}</b><br/><br/>` +

                        `Počet otestovaných: <b>${allTestedCount + allTestedCountToday}</b><br/>` +
                        `Počet pozitívnych výsledkov: <b>${allPositiveCount + allPositiveCountToday}</b><br/>` +
                        `Podiel pozitívnych výsledkov: <b>${proportionOfPositiveTest(allPositiveCount + allPositiveCountToday, allTestedCount + allTestedCountToday)}%</b><br/><br/>` +

                        `<b>Výsledky testov za ${formatDate(update)}</b><br/>` +
                        `Počet otestovaných: <b>${allTestedCountToday}</b><br/>` +
                        `Počet pozitívnych výsledkov: <b>${allPositiveCountToday}</b><br/>` +
                        `Podiel pozitívnych výsledkov: <b>${proportionOfPositiveTest(allPositiveCountToday, allTestedCountToday)}%</b><br/><br/>` +

                        `<b>Výsledky testov za 31.10.2020</b><br/>` +
                        `Počet otestovaných: <b>${allTestedCount}</b><br/>` +
                        `Počet pozitívnych výsledkov: <b>${allPositiveCount}</b><br/>` +
                        `Podiel pozitívnych výsledkov: <b>${proportionOfPositiveTest(allPositiveCount, allTestedCount)}%</b>`
                    return div
                }
                stats.addTo(window.map)
            }
        )
}