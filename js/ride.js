/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};

(function rideScopeWrapper($) {
    let authToken;

    // Enhanced auth handling
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
        alert(error.message || 'Authentication failed');
        window.location.href = '/signin.html';
    }

    function requestUnicorn(pickupLocation) {
        if (!validatePickup(pickupLocation)) {
            alert('Invalid pickup location');
            return;
        }

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

    function validatePickup(pickup) {
        return pickup && 
            typeof pickup.latitude === 'number' && 
            typeof pickup.longitude === 'number';
    }

    function handleApiSuccess(response) {
        try {
            console.log('API Success:', response);
            
            if (response.error) {
                handleBackendError(response);
                return;
            }

            processUnicornResponse(response);
            animateArrival(() => finalizeRide(response.Unicorn.Name));
            
        } catch (error) {
            console.error('Success Handling Error:', error);
            alert('Error processing ride: ' + error.message);
            resetUIState();
        }
    }

    function handleApiError(jqXHR) {
        console.error('API Failure:', jqXHR);
        const error = parseErrorResponse(jqXHR);
        
        if (error.status === 401) {
            alert('Session expired. Please login again.');
            window.location.href = '/signin.html';
        } else {
            alert(`Error: ${error.message}\nPlease try again.`);
            resetUIState();
        }
    }

    function parseErrorResponse(jqXHR) {
        try {
            return {
                status: jqXHR.status,
                ...JSON.parse(jqXHR.responseText)
            };
        } catch {
            return {
                status: jqXHR.status,
                message: jqXHR.responseText || 'Unknown error'
            };
        }
    }

    function processUnicornResponse(response) {
        const unicorn = response.Unicorn || {};
        if (!unicorn.Name || !unicorn.Color) {
            throw new Error('Invalid unicorn data received');
        }

        const pronoun = getGenderPronoun(unicorn.Gender);
        displayUpdate(`${unicorn.Name}, your ${unicorn.Color} unicorn, is on ${pronoun} way.`);
    }

    function finalizeRide(unicornName) {
        displayUpdate(`${unicornName} has arrived. Giddy up!`);
        resetUIState(true);
    }

    function getGenderPronoun(gender) {
        const normalized = String(gender || '').toLowerCase();
        return {
            male: 'his',
            female: 'her'
        }[normalized] || 'their';
    }

    function resetUIState(completed = false) {
        WildRydes.map.unsetLocation();
        $('#request')
            .prop('disabled', completed)
            .text(completed ? 'Set Pickup' : 'Request Unicorn');
    }

    // Initialization
    $(() => {
        initializeAuth();
        $('#request').click(handleRequestClick);
        $(WildRydes.map).on('pickupChange', handlePickupChanged);
        
        if (!_config.api.invokeUrl) {
            $('#noApiMessage').show();
        }
    });

    function handlePickupChanged() {
        $('#request').text('Request Unicorn').prop('disabled', false);
    }

    function handleRequestClick(event) {
        event.preventDefault();
        requestUnicorn(WildRydes.map.selectedPoint);
    }

    // animateArrival and displayUpdate remain unchanged
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
}(jQuery));
