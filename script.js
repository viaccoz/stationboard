$(document).ready(function () {
	const refreshInterval = 30000;
	const apiUrl = 'https://transport.opendata.ch/v1/connections';
	const fields = ['from/name', 'to/name', 'connections/from/departure', 'connections/from/prognosis/departure', 'connections/duration'];
	const validStationboardParameters = ['name', 'walk', 'from', 'to', 'via', 'transportations', 'limit', 'direct'];
	const stationboards = [];

	function initialize() {
		readParameters();
		createStationboards();
		setInterval(refreshStationboards, refreshInterval);
		refreshStationboards();
	}

	function readParameters() {
		const hash = window.location.hash.substring(1);
		for (const stationboardsParameters of hash.split('#')) {
			const stationboard = {};
			for (const stationboardParameter of stationboardsParameters.split('&')) {
				const [key, value] = stationboardParameter.split('=');
				if (validStationboardParameters.includes(key)) {
					stationboard[key] = decodeURIComponent(value);
				}
			}
			if (!Object.keys(stationboard).includes('walk')) {
				stationboard.walk = 0;
			}
			stationboards.push(stationboard);
		}
	}

	function createStationboards() {
		$('#stationboards').empty();
		for (var i = 0; i < stationboards.length; i++) {
			$('#stationboards').append('<table id="stationboard' + i + '" class="stationboard"><thead><tr><th></th></tr></thead><tbody></tbody></table>');
		}
	}

	function refreshStationboards() {
		$('#title').text('When Should I Leave?');
		for (var i = 0; i < stationboards.length; i++) {
			const stationboard = stationboards[i];
			(function(i) {
				$.get(apiUrl, {
					from: stationboard.from,
					to: stationboard.to,
					via: stationboard.via,
					transportations: stationboard.transportations,
					limit: stationboard.limit,
					direct: stationboard.direct,
					fields: fields,
				})
				.done(function(data) {
					const fromName = data.from.name;
					const toName = data.to.name;
					const headingText = stationboard.name ? stationboard.name : fromName + ' → ' + toName + ' (🚶 ' + stationboard.walk + ' minutes)';
					$('#stationboard' + i + ' th').text(headingText);
					$('#stationboard' + i + ' tbody').empty();
					for (const connection of data.connections) {
						const departure = connection.from.departure;
						const prognosisDeparture = connection.from.prognosis.departure;
						const departureToUse = prognosisDeparture ? prognosisDeparture : departure;
						const whenToGo = moment(departureToUse).subtract(stationboard.walk, 'm').fromNow();
						$('#stationboard' + i + ' tbody').append('<tr><td>' + whenToGo + '</td></td>');
					}
				})
				.fail(function() {
					$('#title').text('Error fetching data. Please try again later.');
					createStationboards();
				});
			})(i);
		}
	}

	initialize();
});
