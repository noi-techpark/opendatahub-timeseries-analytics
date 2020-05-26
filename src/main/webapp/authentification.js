let AUTHORIZATION_TOKEN = '';

$(document).ready(function () {

    let login_button = $('#login_button');
    let logout = $('#logout');
    let logoutuser = $('#logoutuser');
    let logout_button = $('#logout_button');

    var keycloak = new Keycloak({
        url: KEYCLOAK_AUTHORIZATION_URI,
        realm: KEYCLOAK_REALM,
        clientId: KEYCLOAK_CLIENT_ID
    });

    let setupAuthenticated = function() {
        AUTHORIZATION_TOKEN = keycloak.authenticated && !keycloak.isTokenExpired()? 'Bearer ' + keycloak.token: '';
        login_button.css('display', 'none');
        logout.css('display', 'flex');
        logoutuser.text(keycloak.idTokenParsed.name)
    }
    let setupNonAuthenticated = function() {
        AUTHORIZATION_TOKEN = null;
        login_button.css('display', 'flex');
        logout.css('display', 'none');
    }

    keycloak.init({
        flow: 'implicit'
    }).then(function(authenticated) {
        if(!authenticated) {
            setupNonAuthenticated();
        }
    }).catch(function() {
        alert('failed to initialize');
    });
    keycloak.onAuthSuccess = function () {
        setupAuthenticated();
    }
    keycloak.onAuthError = function () {
        setupNonAuthenticated();
    }
    keycloak.onAuthLogout = function () {
        setupNonAuthenticated();
    }
    keycloak.onTokenExpired = function () {
        console.log(keycloak.authenticated)
        setupNonAuthenticated();
    }

    login_button.click(function () {
        keycloak.login({
            redirectUri: KEYCLOAK_REDIRECT_URI
        })
    })
    logout_button.click(function () {
        keycloak.logout({
            redirectUri: KEYCLOAK_REDIRECT_URI
        })
    })

})