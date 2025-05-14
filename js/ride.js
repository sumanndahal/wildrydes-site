/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.map = WildRydes.map || {};

(function rideScopeWrapper($) {
    var authToken;
    WildRydes.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
        } else {
            window.location.href = '/signin.html';
        }
    }).catch(function handleTokenError(error) {
        alert(error);
        window.location.href = '/signin.html';
    });

    function requestUnicorn(pickupLocation) {
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/ride',
            headers: {
                Authorization: authToken
            },
            data: JSON.stringify({
                PickupLocation: {
                    Latitude: pickupLocation.latitude,
                    Longitude: pickupLocation.longitude
                }
            }),
            contentType: 'application/json',
            success: completeRequest,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('HTTP Error:', textStatus, errorThrown);
                alert('Network error occurred. Please try again.');
                resetUIState();
            }
        });
    }

    function completeRequest(result) {
        console.log('API Response:', result);
        
        // Handle backend errors first
        if (result.errorMessage || result.errorType) {
            handleBackendError(result);
            return;
        }

        // Process successful response
        try {
            const unicorn = result.Unicorn || {};
            const gender = (unicorn.Gender || '').toLowerCase();
            const pronoun = getGenderPronoun(gender);
            
            if (!unicorn.Name || !unicorn.Color) {
                throw new Error('Invalid unicorn data in response');
            }

            displayUpdate(`${unicorn.Name}, your ${unicorn.Color} unicorn, is on ${pronoun} way.`);
            
            animateArrival(() => {
                displayUpdate(`${unicorn.Name} has arrived. Giddy up!`);
                resetUIState(true);
            });

        } catch (error) {
            console.error('Processing Error:', error);
            alert(`Error: ${error.message}`);
            resetUIState();
        }
    }

    function handleBackendError(errorResult) {
        const errorMessage = errorResult.errorMessage || 'Unknown backend error';
        console.error('Backend Error:', errorResult);
        
        if (errorResult.errorType === 'TypeError' && errorMessage.includes('authorizer')) {
            alert('Authorization failed. Please login again.');
            window.location.href = '/signin.html';
        } else {
            alert(`Backend Error: ${errorMessage}`);
            resetUIState();
        }
    }

    function getGenderPronoun(gender) {
        switch (gender) {
            case 'male': return 'his';
            case 'female': return 'her';
            default: return 'their';
        }
    }

    function resetUIState(completed = false) {
        WildRydes.map.unsetLocation();
        const $request = $('#request');
        $request.prop('disabled', completed);
        $request.text(completed ? 'Set Pickup' : 'Request Unicorn');
    }

    // Rest of the code remains unchanged below this line
    $(function onDocReady() {
        $('#request').click(handleRequestClick);
        $(WildRydes.map).on('pickupChange', handlePickupChanged);

        WildRydes.authToken.then(function updateAuthMessage(token) {
            if (token) {
                displayUpdate('You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.');
                $('.authToken').text(token);
            }
        });

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
