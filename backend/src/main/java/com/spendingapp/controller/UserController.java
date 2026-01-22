package com.spendingapp.controller;

import com.spendingapp.service.UserService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {
  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  @PostMapping("/register")
  public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> request) {
    String firebaseUid = getCurrentUserUid();
    String email = request.get("email");

    if (email == null || email.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
    }

    try {
      userService.registerUser(firebaseUid, email);
      return ResponseEntity.ok(Map.of(
          "success", true,
          "message", "Account created successfully"
      ));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of(
          "error", e.getMessage()
      ));
    }
  }

  private String getCurrentUserUid() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getName() == null) {
      throw new IllegalStateException("User not authenticated");
    }
    return auth.getName();
  }
}

