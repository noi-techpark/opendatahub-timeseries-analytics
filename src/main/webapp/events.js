(() => {
    console.debug("loading the events.js script")
    // setTimeout(() => {console.clear()}, 2000)

    // this will contain the form state
    let state = {}
    
    // define shorthands
    let $fromdate = jQuery("#events_fromdate")
    let $todate = jQuery("#events_todate")
    let _fromdate = document.querySelector("#events_fromdate")
    let _todate = document.querySelector("#events_todate")
    let _today = document.querySelector("#events_range_today")
    let _ytoday = document.querySelector("#events_range_ytoday")
    let _week = document.querySelector("#events_range_week")
    let _month = document.querySelector("#events_range_month")
    let _update = document.querySelector("#events_update_btn")
    let _category = document.querySelector("#events_category")
    let _provider = document.querySelector("#events_data_provider")
    let _table = document.querySelector("#events_table")

    // setup datepickers
    $fromdate.datepicker({ dateFormat: "yy-mm-dd" })
    $fromdate.datepicker("setDate", "-8")
    $todate.datepicker({ dateFormat: "yy-mm-dd" })
    $todate.datepicker("setDate", "-1")
    
    // set dates when clicking on date button controls
    _today.addEventListener("click", () => {
        $fromdate.datepicker("setDate", "0")
        $todate.datepicker("setDate", "1")
    })
    _ytoday.addEventListener("click", () => {
        $fromdate.datepicker("setDate", "-1")
        $todate.datepicker("setDate", "1")
    })
    _week.addEventListener("click", () => {
        $fromdate.datepicker("setDate", "-7")
        $todate.datepicker("setDate", "0")
    })
    _month.addEventListener("click", () => {
        $fromdate.datepicker("setDate", "-31")
        $todate.datepicker("setDate", "0")
    })


    // disable update button when no provider is selected
    _update.disabled = !_provider.value

    // load category list dinamically after choosing data provider
    _provider.addEventListener("change", async (e) => {
        const addOption = (text, value, parent, selected) => {
            const option = document.createElement("OPTION")
            option.innerText = text
            option.value = value
            if (selected) {
                option.selected = true
            }
            parent.appendChild(option)
        }

        const provider = e.target.value
        _update.disabled = !provider
        _category.innerHTML = ''
        if (provider) {
            const api_response = await fetch(`https://mobility.api.opendatahub.bz.it/v2/flat,event/${provider}?select=evcategory&distinct=1`)
            const response_body = await api_response.json()
            const categories = response_body.data.map(c => c.evcategory)
            if (categories) {
                addOption("All", "", _category, true)
                categories.forEach(c => {
                    addOption(c, encodeURIComponent(c), _category)
                })
            }
        }
    })

    // handle main button click
    _update.addEventListener("click", async () => {
        state = {
            fromdate: _fromdate.value,
            todate: _todate.value,
            category: _category.value,
            provider: _provider.value,
        }
        let api_url = `https://mobility.api.opendatahub.bz.it/v2/tree,event/${state.provider}/${state.fromdate}/${state.todate}`
        api_url = !state.category ? api_url : `${api_url}?where=evcategory.eq.${state.category}` 
        const api_response = await fetch(api_url)
        const response_body = await api_response.json()
        const data = response_body.data[state.provider]?.eventseries
        
        const events = []
        for(const eventgroup_index in data) {
            const eventgroup = data[eventgroup_index]
            for (const event_index in eventgroup.events) {
                if (Object.keys(eventgroup.events).length > 1) {
                    const event_with_subrows = []
                    for (const event_index2 in eventgroup.events) {
                        const event = eventgroup.events[event_index]
                        event_with_subrows.push({
                            evstart: event.evstart,
                            evend: event.evend,
                            evcategory: event.evcategory,
                            evname: event.evname,
                        })
                    }
                    events.push(event_with_subrows)
                    break
                } else {
                    const event = eventgroup.events[event_index]
                    events.push({
                        evstart: event.evstart,
                        evend: event.evend,
                        evcategory: event.evcategory,
                        evname: event.evname,
                    })
                }
            }
        }
        
        _table.data = JSON.stringify(events)
    })
})()