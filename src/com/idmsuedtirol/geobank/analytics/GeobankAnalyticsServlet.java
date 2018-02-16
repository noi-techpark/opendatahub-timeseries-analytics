package com.idmsuedtirol.geobank.analytics;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
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
	
	HashMap<String, String> path2url = new HashMap<>();
	
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
		Matcher serviceMatcher = firstSubfolder.matcher(requestPath);
		// If url is not in an expected format, return 404
		if (!serviceMatcher.matches())
		{
			responseError(resp, 404);
			return;
		}
			
		String serviceName = serviceMatcher.group(1);
		String servicePath = serviceMatcher.group(2);
		
		System.out.println(serviceName);
		System.out.println(servicePath);
		
		// if the service name is not found, return 404
		String serviceUrlTxt = path2url.get(serviceName);
		if (serviceUrlTxt == null)
		{
			responseError(resp, 404);
			return;
		}
		
		// TODO: add some headers about browser caching?
		
		// TODO: match servicePath against a whitelist
		String newUrlTxt = serviceUrlTxt + servicePath;
		System.out.println(newUrlTxt);
		
		URL serviceUrl = new URL(newUrlTxt);
		HttpURLConnection conn = (HttpURLConnection) serviceUrl.openConnection();
		
		// TODO: try caarg0tch timeout exceptions, then return 504
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
		if (httpCode != 200 || !contentType.startsWith("application/json"))
		{
			responseError(resp, 502, "Upstream status: " + httpCode + "\nContentType: " + contentType); // bad gateway
			return;
		}

		// TODO: check if is always json!
		resp.setContentType(conn.getContentType());
		resp.getOutputStream().write(responseData);
		
		
	}
	
	private static void responseError(HttpServletResponse resp, int code) throws IOException
	{
		responseError(resp, code, null);
	}
	private static void responseError(HttpServletResponse resp, int code, String msg) throws IOException
	{
		resp.setStatus(code);
		resp.getOutputStream().write(("Error: " + code + (msg == null ? "" : "\n" + msg)).getBytes(StandardCharsets.US_ASCII));
	}
	
	private static byte[] readRequestData(InputStream io) throws IOException
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
