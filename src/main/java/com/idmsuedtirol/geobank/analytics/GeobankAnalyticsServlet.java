package com.idmsuedtirol.geobank.analytics;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/*
   Url esempi:

   http://ipchannels.integreen-life.bz.it/parkingFrontEnd/rest/get-stations
   http://ipchannels.integreen-life.bz.it/BluetoothFrontEnd/rest/get-stations

   http://localhost:8888/data/integreen/BluetoothFrontEnd/rest/get-stations

   Status 422: se i parametri non validano
   Status 404: se l'url non è tra quelle previste
   Status 504: gateway timeout se non ho ottenuto risposta in tempo
   Status 502: bad gateway l'altro non risponde con un 200 (mettere nel testo il status originale)
 */
public class GeobankAnalyticsServlet extends HttpServlet {

	private static final long serialVersionUID = -5920499466614372803L;

	HashMap<String, String> path2url = new HashMap<String, String>();

	Pattern firstSubfolder;

	@Override
	public void init(ServletConfig config) throws ServletException {
		try {
			String configFileName = config.getServletContext().getRealPath("/WEB-INF/config.json");
			ObjectMapper jsonmapper = new ObjectMapper();
			ObjectNode configData = (ObjectNode) jsonmapper.readTree(new File(configFileName));
			ArrayNode endpoints = (ArrayNode) configData.get("endpoints");
			for (int e = 0; e < endpoints.size(); e++)
			{
				ObjectNode endpoint = (ObjectNode) endpoints.get(e);
				String name = endpoint.get("name").asText();
				String url = endpoint.get("url").asText();
				path2url.put(name, url);
			}
			firstSubfolder = Pattern.compile("/([a-zA-Z0-9_-]+)((/.*)?)");
		} catch (Exception exxx) {
			throw new ServletException(exxx);
		}
	}

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

		String requestPath = req.getPathInfo();
		String urlParameters = req.getQueryString();
		Matcher serviceMatcher = firstSubfolder.matcher(requestPath);
		// If url is not in an expected format, return 404
		if (!serviceMatcher.matches())
		{
			responseError(resp, 404);
			return;
		}

		String serviceName = serviceMatcher.group(1);
		String servicePath = serviceMatcher.group(2);

		// if the service name is not found, return 404
		String serviceUrlTxt = path2url.get(serviceName);
		if (serviceUrlTxt == null)
		{
			responseError(resp, 404);
			return;
		}

		// TODO: add some headers about browser caching?

		// TODO: match servicePath against a whitelist
		String newUrlTxt = serviceUrlTxt + servicePath + "?" + urlParameters;

		URL serviceUrl = new URL(newUrlTxt);
		HttpURLConnection conn = (HttpURLConnection) serviceUrl.openConnection();

		String accessToken = (String)req.getSession().getAttribute("accessToken");

		if ( accessToken != null)
			conn.addRequestProperty("Authorization", "Bearer " + accessToken);

		conn.setConnectTimeout(15000);
		conn.setReadTimeout(30000);

		int httpCode;
		byte[] responseData = new byte[0];
		String contentType;

		try
		{
			httpCode = conn.getResponseCode();
			contentType = conn.getContentType();
			// read input stream only with status 200
			// reading with status != 200 can throw other exceptions
			if (httpCode == 200)
				responseData = readRequestData(conn.getInputStream());

			conn.disconnect();
		}
		catch (SocketTimeoutException timeout)
		{
			responseError(resp, 504, "Timeout"); // gateway timeout
			return;
		}

		// As last check
		if (httpCode != 200 || contentType == null || !contentType.startsWith("application/json"))
		{
			responseError(resp, 502, "Upstream status: " + httpCode + "\nContentType: " + contentType + "\nUpstream url: " + newUrlTxt); // bad gateway
			return;
		}

		// TODO: check if is always json!
		resp.setContentType(contentType);
		resp.getOutputStream().write(responseData);


	}

	private static void responseError(HttpServletResponse resp, int code) throws IOException
	{
		responseError(resp, code, null);
	}
	private static void responseError(HttpServletResponse resp, int code, String msg) throws IOException
	{
		// imposta il content type a test semplice in caso di errore
		resp.setContentType("text/plain");
		resp.setStatus(code);
		resp.getOutputStream().write(("Error: " + code + (msg == null ? "" : "\n" + msg)).getBytes(StandardCharsets.US_ASCII));
	}

	static byte[] readRequestData(InputStream io) throws IOException
	{
		ByteArrayOutputStream baos = new ByteArrayOutputStream();

		byte[] buf = new byte[300000];
		int len;

		while ((len = io.read(buf)) > 0)
		{
			baos.write(buf,0,len);
		}
		return baos.toByteArray();
	}
}
