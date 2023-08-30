$(document).ready(function () {
	const refreshInterval = 30000;
	const apiUrl = 'https://transport.opendata.ch/v1/connections';
	const fields = ['from/name', 'to/name', 'connections/from/departure', 'connections/from/prognosis/departure', 'connections/from/delay', 'connections/duration'];
	const validStationboardParameters = ['name', 'walk', 'from', 'to', 'via[]', 'transportations[]', 'limit', 'direct'];
	const stationboards = [];

	function initialize() {
		createHint();
		readParameters();
		createStationboards();
		setInterval(refreshStationboards, refreshInterval);
		refreshStationboards();
	}

	function createHint() {
		const element1 = new URLSearchParams();
		element1.append('name', 'From Zurich to Bern');
		element1.append('from', 'Zurich');
		element1.append('to', 'Bern');
		element1.append('via[]', 'Lugano');
		element1.append('via[]', 'Olten');

		const element2 = new URLSearchParams();
		element2.append('walk', 5);
		element2.append('from', 'Lausanne');
		element2.append('to', 'Geneva');

		$('#hint').attr('href', '#' + element1.toString() + '#' + element2.toString());
	}

	function readParameters() {
		const urlFragment = window.location.hash.substring(1);
		for (const stationboardsParameters of urlFragment.split('#')) {
			const stationboard = {};
			const stationboardParameters = new URLSearchParams(stationboardsParameters);
			for (const validStationboardParameter of validStationboardParameters) {
				if (stationboardParameters.has(validStationboardParameter)) {
					if (validStationboardParameter.endsWith('[]')) {
						stationboard[validStationboardParameter] = stationboardParameters.getAll(validStationboardParameter);
					} else {
						stationboard[validStationboardParameter] = stationboardParameters.get(validStationboardParameter);
					}
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
						const delay = connection.from.delay;
						const duration = connection.duration;
						const whenToGo = moment(departureToUse).subtract(stationboard.walk, 'm').fromNow();
						$('#stationboard' + i + ' tbody').append('<tr><td>' + whenToGo + ' (+' + delay + ', ~' + duration + ')</td></td>');
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
