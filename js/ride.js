/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};

(function rideScopeWrapper($) {
    let authToken;
    const DEFAULT_UNICORN = {
        Name: 'Mystery Unicorn',
        Color: 'Rainbow',
        Gender: 'Unknown'
    };

    // Initialization
    $(() => {
        initializeAuth();
        $('#request').click(handleRequestClick);
        $(WildRydes.map).on('pickupChange', handlePickupChanged);
        
        if (!_config.api.invokeUrl) {
            $('#noApiMessage').show();
        }
    });

    function initializeAuth() {
        WildRydes.authToken
            .then(token => {
                authToken = token;
                updateAuthUI(token);
            })
            .catch(handleAuthError);
    }

    function updateAuthUI(token) {
        displayUpdate('You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.');
        $('.authToken').text(token);
    }

    function handleAuthError(error) {
        console.error('Auth Error:', error);
        alert(error.message || 'Authentication failed. Please sign in again.');
        redirectToSignIn();
    }

    function handleRequestClick(event) {
        event.preventDefault();
        const pickupLocation = WildRydes.map.selectedPoint;
        
        if (validatePickup(pickupLocation)) {
            requestUnicorn(pickupLocation);
        }
    }

    function validatePickup(pickup) {
        const isValid = pickup && 
            typeof pickup.latitude === 'number' && 
            typeof pickup.longitude === 'number';
        
        if (!isValid) {
            alert('Please select a valid location on the map');
            console.warn('Invalid pickup location:', pickup);
        }
        return isValid;
    }

    function requestUnicorn(pickupLocation) {
        showLoadingState();
        
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/ride',
            headers: { Authorization: authToken },
            data: JSON.stringify({
                PickupLocation: {
                    Latitude: pickupLocation.latitude,
                    Longitude: pickupLocation.longitude
                }
            }),
            contentType: 'application/json',
            success: handleApiSuccess,
            error: handleApiError
        });
    }

    function handleApiSuccess(response) {
        try {
            console.debug('API Response:', JSON.stringify(response, null, 2));
            
            if (response.error || response.Error) {
                handleBackendError(response);
                return;
            }

            const unicornData = processUnicornData(response.Unicorn);
            displayUnicornUpdate(unicornData);
            animateArrival(() => finalizeRide(unicornData.Name));

        } catch (error) {
            console.error('Response Handling Error:', { error, response });
            alert(`Error: ${error.message}`);
            resetUIState();
        }
    }

    function processUnicornData(rawData) {
        const unicorn = rawData || {};
        return {
            Name: unicorn.Name || DEFAULT_UNICORN.Name,
            Color: unicorn.Color || DEFAULT_UNICORN.Color,
            Gender: unicorn.Gender || DEFAULT_UNICORN.Gender
        };
    }

    function displayUnicornUpdate(unicorn) {
        const pronoun = getGenderPronoun(unicorn.Gender);
        displayUpdate(`${unicorn.Name}, your ${unicorn.Color} unicorn, is on ${pronoun} way.`);
    }

    function handleApiError(jqXHR) {
        const error = parseErrorResponse(jqXHR);
        console.error('API Error:', error);
        
        if (error.status === 401) {
            alert('Session expired. Please login again.');
            redirectToSignIn();
        } else {
            alert(`Error: ${error.message}`);
            resetUIState();
        }
    }

    function parseErrorResponse(jqXHR) {
        try {
            const response = JSON.parse(jqXHR.responseText);
            return {
                status: jqXHR.status,
                message: response.Error || response.error || 'Unknown error',
                details: response
            };
        } catch {
            return {
                status: jqXHR.status,
                message: jqXHR.responseText || 'Connection error'
            };
        }
    }

    function getGenderPronoun(gender) {
        const normalized = String(gender || '').toLowerCase();
        return {
            male: 'his',
            female: 'her'
        }[normalized] || 'their';
    }

    function finalizeRide(unicornName) {
        displayUpdate(`${unicornName} has arrived. Giddy up!`);
        resetUIState(true);
    }

    function resetUIState(completed = false) {
        WildRydes.map.unsetLocation();
        $('#request')
            .prop('disabled', completed)
            .text(completed ? 'Set Pickup' : 'Request Unicorn');
    }

    function showLoadingState() {
        $('#request')
            .prop('disabled', true)
            .html('<i class="fa fa-spinner fa-spin"></i> Requesting...');
    }

    function handlePickupChanged() {
        $('#request').text('Request Unicorn').prop('disabled', false);
    }

    function animateArrival(callback) {
        const dest = WildRydes.map.selectedPoint;
        const origin = {
            latitude: dest.latitude > WildRydes.map.center.latitude 
                ? WildRydes.map.extent.minLat 
                : WildRydes.map.extent.maxLat,
            longitude: dest.longitude > WildRydes.map.center.longitude 
                ? WildRydes.map.extent.minLng 
                : WildRydes.map.extent.maxLng
        };
        WildRydes.map.animate(origin, dest, callback);
    }

    function displayUpdate(text) {
        $('#updates').append($(`<li>${text}</li>`));
    }

    function redirectToSignIn() {
        window.location.href = '/signin.html';
    }
}(jQuery));
