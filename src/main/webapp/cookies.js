$(document).ready(function()
{

    function activate_ga()
    {
        let script = document.createElement('script');
        script.setAttribute('src','https://www.googletagmanager.com/gtag/js?id=' + env.GOOGLE_ANALYTICS_ID);
        script.setAttribute('async','true')
        document.head.appendChild(script)
        
        window.dataLayer = window.dataLayer || [];
        function gtag() {
           dataLayer.push(arguments);
        }

        gtag("js", new Date());
        gtag('config', env.GOOGLE_ANALYTICS_ID, { 'anonymize_ip': true });
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
                    activate_ga()
                })
            }
            else
            {
               activate_ga()
            }
        }
        catch (e)
        {
            console.log(e)
        }
    }
    
    if (env.GOOGLE_ANALYTICS_ID != '')
       checkCookieUserPreferences()

})
