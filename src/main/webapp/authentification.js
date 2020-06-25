let AUTHORIZATION_TOKEN = '';

$(document).ready(function () {

    let login_button = $('#login_button');
    let logout = $('#logout');
    let logoutuser = $('#logoutuser');
    let logout_button = $('#logout_button');

    var keycloak = new Keycloak();

    let setupAuthenticated = function () {
        AUTHORIZATION_TOKEN = keycloak.authenticated && !keycloak.isTokenExpired() ? 'Bearer ' + keycloak.token : '';
        login_button.css('display', 'none');
        logout.css('display', 'flex');
        logoutuser.text(keycloak.idTokenParsed.name)
    }
    let setupNonAuthenticated = function () {
        AUTHORIZATION_TOKEN = null;
        login_button.css('display', 'flex');
        logout.css('display', 'none');
    }

    keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri:
            window.location.origin + "/silent-check-sso.html",
    }).then(function (authenticated) {
        if (!authenticated) {
            setupNonAuthenticated();
        }
    }).catch(function () {
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

    login_button.click(function () {
        keycloak.login({
            redirectUri: window.location.origin
        })
    })
    logout_button.click(function () {
        keycloak.logout({
            redirectUri: window.location.origin
        })
    })

    setInterval(() => {
        keycloak.updateToken(30).then(function() {
            setupAuthenticated();
        }).catch(function() {
            if(!keycloak.authenticated || keycloak.isTokenExpired()) {
                setupNonAuthenticated();
            }
        });
    }, 60000)

})