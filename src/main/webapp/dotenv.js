/**
 * Update this file with the script infrastructure/dotenv-sed.sh
 *
 * 1) Copy .env.example to .env (place it into the projects root folder)
 * 2) Execute "cd infrastructure && ./dotenv-sed.sh"
 */
window.env = {
	SERVER_PORT: "8999",
	ENDPOINT_URL: "https://analytics.opendatahub.testingmachine.eu",
	ODH_MOBILITY_API_URI: "https://mobility.api.opendatahub.testingmachine.eu",
	LOG_APPLICATION_NAME: "opendatahub-analytics",
	THUNDERFOREST_MAP_API_KEY: ""
}
