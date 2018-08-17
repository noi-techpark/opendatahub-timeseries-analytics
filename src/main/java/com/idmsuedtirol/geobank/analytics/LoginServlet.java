package com.idmsuedtirol.geobank.analytics;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLEncoder;
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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;



public class LoginServlet extends HttpServlet {
	
	@Override
	public void init(ServletConfig config) throws ServletException {
	}

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		String user = req.getParameter("user");
		String pass = req.getParameter("pass");
		System.out.println(user);
		System.out.println(pass);
		
		// http://ipchannels.integreen-life.bz.it/environment/rest/refresh-token?user=a&pw=a
		URL serviceUrl = new URL("http://ipchannels.integreen-life.bz.it/environment/rest/refresh-token?user=" + URLEncoder.encode(user, StandardCharsets.UTF_8.name()) + "&pw=" + URLEncoder.encode(pass, StandardCharsets.UTF_8.name()));

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
				System.out.println(accessToken);
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
