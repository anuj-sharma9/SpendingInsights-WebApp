package com.spendingapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
public class FirebaseConfig {
  private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

  @Value("${app.firebase.serviceAccountPath:}")
  private String serviceAccountPath;

  @Value("${app.firebase.serviceAccountJson:}")
  private String serviceAccountJson;

  @PostConstruct
  public void init() throws IOException {
    if (!FirebaseApp.getApps().isEmpty()) {
      return;
    }

    GoogleCredentials credentials = null;
    if (serviceAccountJson != null && !serviceAccountJson.isBlank()) {
      credentials = GoogleCredentials.fromStream(
          new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8))
      );
    } else if (serviceAccountPath != null && !serviceAccountPath.isBlank()) {
      try (FileInputStream stream = new FileInputStream(serviceAccountPath)) {
        credentials = GoogleCredentials.fromStream(stream);
      }
    }

    if (credentials == null) {
      logger.warn("Firebase service account not configured; auth will fail until configured.");
      return;
    }

    FirebaseOptions options = FirebaseOptions.builder()
        .setCredentials(credentials)
        .build();
    FirebaseApp.initializeApp(options);
    logger.info("Firebase initialized successfully.");
  }
}
