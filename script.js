// Wait for the document to be ready before executing JavaScript
$(document).ready(function () {
	// Set the refresh interval for updating stationboard data (milliseconds)
	const refreshInterval = 30000;
	// API URL for retrieving transportation data
	const apiUrl = 'https://transport.opendata.ch/v1/connections';
	// Fields to request from the API
	const fields = ['from/name', 'to/name', 'connections/from/departure', 'connections/from/prognosis/departure', 'connections/from/delay', 'connections/duration'];
	// List of valid stationboard parameters
	const validStationboardParameters = ['name', 'walk', 'from', 'to', 'via[]', 'transportations[]', 'limit', 'direct'];
	// Store stationboard configurations
	const stationboards = [];

	// Initialize the application
	function initialize() {
		setFormSubmitHandler();
		readParameters();
		setUpStationboards();
		refreshStationboards();
		setInterval(refreshStationboards, refreshInterval);
	}
	// Read the parameters from the URL
	function readParameters() {
		const urlFragment = window.location.hash.substring(1);
		for (const fragment of urlFragment.split('#')) {
			const stationboard = {};
			const parameters = new URLSearchParams(fragment);
			for (const validStationboardParameter of validStationboardParameters) {
				if (parameters.has(validStationboardParameter)) {
					if (validStationboardParameter.endsWith('[]')) {
						stationboard[validStationboardParameter] = parameters.getAll(validStationboardParameter);
					} else {
						stationboard[validStationboardParameter] = parameters.get(validStationboardParameter);
					}
				}
			}
			if (stationboard.from && stationboard.to) {
				if (!Object.keys(stationboard).includes('walk')) {
					stationboard.walk = 0;
				}
				stationboards.push(stationboard);
			}
		}
	}

	// Set up stationboard tables and delete button handlers
	function setUpStationboards() {
		$('#stationboards').empty();
		if (stationboards.length === 0) {
			$('#stationboards').append('<p class="empty-stationboard">No stationboard yet.</p>');
		} else {
			for (let i = 0; i < stationboards.length; i++) {
				const stationboard = stationboards[i];
				const stationboardHTML = `
					<table id="stationboard${i}" class="stationboard">
						<thead>
							<tr>
								<th></th>
								<th>
									<div class="stationboard-header">
										<div class="btn-group">
											<button class="delete-button" data-index="${i}">Delete</button>
										</div>
									</div>
								</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>`;
				$('#stationboards').append(stationboardHTML);
			}

			$('.delete-button').click(function () {
				const index = $(this).data('index');
				stationboards.splice(index, 1);
				updateURLParameters();
				setUpStationboards();
				refreshStationboards();
			});
		}
	}

	// Handle form submission for adding a new stationboard
	function setFormSubmitHandler() {
		$('#stationboardForm').submit(function (event) {
			event.preventDefault();

			const name = $('#name').val();
			const from = $('#from').val();
			const to = $('#to').val();
			const viaInput = $('#via').val();
			const via = viaInput ? viaInput.split(',').map(station => station.trim()) : [];
			const walk = parseInt($('#walk').val()) || 0;

			if (from && to) {
				const stationboard = { 
					'name': name,
					'from': from,
					'to': to,
					'via': via,
					'walk': walk
				};
				stationboards.push(stationboard);
				updateURLParameters();
				setUpStationboards();
				refreshStationboards();
			}
		});
	}

	// Update URL parameters based on stationboards
	function updateURLParameters() {
		let urlFragment = '';
		for (const stationboard of stationboards) {
			const stationboardParameters = new URLSearchParams(stationboard);
			urlFragment += '#' + stationboardParameters.toString();
		}
		window.location.hash = urlFragment;
	}

	// Refresh stationboards by fetching data and updating the UI
	function refreshStationboards() {
		for (let i = 0; i < stationboards.length; i++) {
			const stationboard = stationboards[i];
			(function (i) {
				$.get(apiUrl, {
					from: stationboard.from,
					to: stationboard.to,
					via: stationboard.via,
					transportations: stationboard.transportations,
					limit: stationboard.limit,
					direct: stationboard.direct,
					fields: fields,
				})
				.done(function (data) {
					const fromName = data.from.name;
					const toName = data.to.name;
					const headingText = stationboard.name ? stationboard.name : fromName + ' → ' + toName + ' (🚶 ' + stationboard.walk + ' minutes)';
					$('#stationboard' + i + ' tr').children().eq(0).text(headingText);
					$('#stationboard' + i + ' tbody').empty();
					for (const connection of data.connections) {
						const departure = connection.from.departure;
						const prognosisDeparture = connection.from.prognosis.departure;
						const departureToUse = prognosisDeparture || departure;
						const delay = connection.from.delay || 0;
						const duration = connection.duration;

						const whenToGo = moment(departureToUse).subtract(stationboard.walk, 'm').fromNow();
						const delayDisplay = delay > 0 ? '(+' + delay + ' minutes)' : 'On time';
						$('#stationboard' + i + ' tbody').append('<tr><td>' + whenToGo + '</td><td>' + delayDisplay + '</td>');
					}
				})
				.fail(function () {
					setUpStationboards();
					$('#stationboard' + i + ' tbody').html('<tr><td colspan="2">Stationboards cannot be displayed.</td></tr>');
				});
			})(i);
		}
	}

	// Call the initialize function when the document is ready
	initialize();
});
