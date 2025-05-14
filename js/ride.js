/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};

(function rideScopeWrapper($) {
    let authToken;

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
            alert('Please select a valid pickup location');
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
        const isValid = pickup && 
            typeof pickup.latitude === 'number' && 
            typeof pickup.longitude === 'number';
        
        if (!isValid) {
            console.error('Invalid pickup location:', pickup);
        }
        return isValid;
    }

    function handleApiSuccess(response) {
        try {
            console.debug('API Response:', JSON.stringify(response, null, 2));
            
            if (response.error) {
                handleBackendError(response);
                return;
            }

            if (!response.Unicorn) {
                throw new Error('No unicorn data in response');
            }

            processUnicornResponse(response);
            animateArrival(() => finalizeRide(response.Unicorn.Name));
            
        } catch (error) {
            console.error('Response Handling Error:', {
                error: error,
                response: response
            });
            alert('Error processing ride: ' + error.message);
            resetUIState();
        }
    }

    function processUnicornResponse(response) {
        const unicorn = response.Unicorn || {};
        const defaultValues = {
            Name: 'Mystery Unicorn',
            Color: 'Rainbow',
            Gender: 'Unknown'
        };

        if (!unicorn.Name || !unicorn.Color) {
            console.warn('Incomplete unicorn data:', unicorn);
            throw new Error('Received incomplete unicorn details');
        }

        const finalData = {
            Name: unicorn.Name || defaultValues.Name,
            Color: unicorn.Color || defaultValues.Color,
            Gender: unicorn.Gender || defaultValues.Gender
        };

        const pronoun = getGenderPronoun(finalData.Gender);
        displayUpdate(`${finalData.Name}, your ${finalData.Color} unicorn, is on ${pronoun} way.`);
    }

    function handleApiError(jqXHR) {
        const error = parseErrorResponse(jqXHR);
        console.error('API Error:', error);
        
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
