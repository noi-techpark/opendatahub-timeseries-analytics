package com.idmsuedtirol.geobank.analytics;

import java.io.File;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;



public class LoginServlet extends HttpServlet {

	private static final long serialVersionUID = -5294182643959014529L;
	private String host = "https://ipchannels.integreen-life.bz.it/";
	private String loginEndpoint = "/environment/rest/refresh-token";

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
				String url = endpoint.get("url").asText();
				if (url!= null && !url.isEmpty())
					host = url;
				String loginPath = endpoint.get("loginPath").asText();
				if (loginPath!= null && !loginPath.isEmpty())
					loginEndpoint=loginPath;

			}
		} catch (Exception exxx) {
			throw new ServletException(exxx);
		}
	}

	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		String user = req.getParameter("user");
		String pass = req.getParameter("pass");

		// http://ipchannels.integreen-life.bz.it/environment/rest/refresh-token?user=a&pw=a
		/*URL serviceUrl = new URL("http://ipchannels.integreen-life.bz.it/environment/rest/refresh-token");

		HttpURLConnection conn = (HttpURLConnection) serviceUrl.openConnection();
		conn.setConnectTimeout(15000);
		conn.setReadTimeout(30000);
		conn.setRequestMethod("POST");
		conn.setDoOutput(true);
		conn.getOutputStream().write(("user=" + URLEncoder.encode(user, StandardCharsets.UTF_8.name()) + "&pw=" + URLEncoder.encode(pass, StandardCharsets.UTF_8.name())).getBytes());

		ObjectMapper om = new ObjectMapper();
		ObjectNode jsonResp = om.createObjectNode();

		int httpCode = conn.getResponseCode();
		if (httpCode == 200)
		{
			byte[] data = GeobankAnalyticsServlet.readRequestData(conn.getInputStream());

			JsonNode tree = om.readTree(data);
			ObjectNode root = (ObjectNode)tree;
			JsonNode accessTokenNode = root.get("accessToken");
			if (accessTokenNode != null)
			{
				String accessToken = accessTokenNode.get("token").asText();
				req.getSession().setAttribute("accessToken", accessToken);
				jsonResp.set("message", jsonResp.textNode("ok"));
				resp.setStatus(200);
				resp.setContentType("application/json");
				resp.getWriter().write(jsonResp.toString());
				return;
			}
		}
		resp.setContentType("application/json");
		resp.setStatus(401);*/


		URL serviceUrl = new URL(host+loginEndpoint +"?user=" +URLEncoder.encode(user, StandardCharsets.UTF_8.name()) + "&pw=" + URLEncoder.encode(pass, StandardCharsets.UTF_8.name()));

		HttpURLConnection conn = (HttpURLConnection) serviceUrl.openConnection();
		conn.setConnectTimeout(15000);
		conn.setReadTimeout(30000);

		ObjectMapper om = new ObjectMapper();
		ObjectNode jsonResp = om.createObjectNode();

		int httpCode = conn.getResponseCode();
		if (httpCode == 200)
		{
			byte[] data = GeobankAnalyticsServlet.readRequestData(conn.getInputStream());

			JsonNode tree = om.readTree(data);
			ObjectNode root = (ObjectNode)tree;
			JsonNode accessTokenNode = root.get("accessToken");
			if (accessTokenNode != null)
			{
				String accessToken = accessTokenNode.get("token").asText();
				req.getSession().setAttribute("accessToken", accessToken);
				jsonResp.set("message", jsonResp.textNode("ok"));
				resp.setStatus(200);
				resp.setContentType("application/json");
				resp.getWriter().write(jsonResp.toString());
				return;
			}
		}
		resp.setContentType("application/json");
		resp.setStatus(401);
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


}
