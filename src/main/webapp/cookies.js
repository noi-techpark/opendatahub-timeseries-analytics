$(document).ready(function()
{

    function activate_ga()
    {
        gtag('config', env.GOOGLE_ANALYTICS_ID, { 'anonymize_ip': true, 'send_page_view': true });
    }

    function checkCookieUserPreferences()
    {
        try
        {
            var cookieValue = document.cookie.replace(/(?:(?:^|.*;\s*)banner\s*\=\s*([^;]*).*$)|^.*$/, "$1");

            if (cookieValue !== "accepted") {
                var banner_div = document.body.querySelector('div.alert-cookie')
                banner_div.style.display = 'block'
                banner_div.querySelector('div.accept-button-container').addEventListener('click', function (e) {
                    e.preventDefault();
                    document.cookie = 'banner=accepted; max-age=' + (60 * 60 * 24 * 365)
                    banner_div.style.display = 'none'
                })
            }
        }
        catch (e)
        {
            console.log(e)
        }
    }

    activate_ga()
    checkCookieUserPreferences()

})
