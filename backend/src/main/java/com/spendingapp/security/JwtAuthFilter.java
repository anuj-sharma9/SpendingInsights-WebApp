package com.spendingapp.security;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import java.io.IOException;
import java.util.Collections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    // Skip filter for OPTIONS (preflight) requests
    return HttpMethod.OPTIONS.matches(request.getMethod());
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
    String requestSummary = request.getMethod() + " " + request.getRequestURI();

    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      logger.debug("Missing or invalid Authorization header for {}", requestSummary);
      filterChain.doFilter(request, response);
      return;
    }

    if (FirebaseApp.getApps().isEmpty()) {
      logger.error("Firebase is not configured; rejecting auth requests.");
      response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Firebase not configured");
      return;
    }

    String token = authHeader.substring("Bearer ".length());
    try {
      FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
      String uid = decodedToken.getUid();
      logger.debug("Authenticated Firebase user {} for {}", uid, requestSummary);
      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(uid, null, Collections.emptyList());
      SecurityContextHolder.getContext().setAuthentication(authentication);
      filterChain.doFilter(request, response);
    } catch (FirebaseAuthException ex) {
      logger.warn("Invalid Firebase token for {}: {}", requestSummary, ex.getMessage());
      response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
    }
  }
}
