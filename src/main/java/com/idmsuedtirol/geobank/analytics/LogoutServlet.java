package com.idmsuedtirol.geobank.analytics;

import java.io.IOException;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;



public class LogoutServlet extends HttpServlet {

	private static final long serialVersionUID = 6389961208818457640L;

	@Override
	public void init(ServletConfig config) throws ServletException {
	}

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

		System.out.println("Logout!");
		ObjectMapper om = new ObjectMapper();
		ObjectNode jsonResp = om.createObjectNode();
		req.getSession().invalidate();
		jsonResp.set("message", jsonResp.textNode("ok"));
		resp.setStatus(200);
		resp.setContentType("application/json");
		resp.getWriter().write(jsonResp.toString());
	}

}
