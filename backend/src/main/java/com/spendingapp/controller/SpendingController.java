package com.spendingapp.controller;

import com.spendingapp.dto.CreateSpendingRequest;
import com.spendingapp.dto.InsightsResponse;
import com.spendingapp.dto.SpendingDto;
import com.spendingapp.service.SpendingService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SpendingController {
  private final SpendingService spendingService;

  public SpendingController(SpendingService spendingService) {
    this.spendingService = spendingService;
  }

  @GetMapping("/health")
  public String health() {
    return "ok";
  }

  @GetMapping("/spending")
  public List<SpendingDto> getSpending() {
    String uid = getCurrentUserUid();
    return spendingService.getTransactions(uid);
  }

  @PostMapping("/spending")
  public Map<String, Object> createSpending(@RequestBody CreateSpendingRequest request) {
    String uid = getCurrentUserUid();

    if (request.getAmount() == null || request.getAmount().isBlank()) {
      throw new IllegalArgumentException("Amount is required");
    }
    if (request.getCategory() == null || request.getCategory().isBlank()) {
      throw new IllegalArgumentException("Category is required");
    }
    if (request.getMerchant() == null || request.getMerchant().isBlank()) {
      throw new IllegalArgumentException("Merchant is required");
    }
    if (request.getTransactionDate() == null || request.getTransactionDate().isBlank()) {
      throw new IllegalArgumentException("Transaction date is required");
    }

    String amountRaw = request.getAmount().trim();
    if (!amountRaw.matches("^\\d+(\\.\\d{1,2})?$")) {
      throw new IllegalArgumentException("Amount must have up to 2 decimal places");
    }

    BigDecimal amount = new BigDecimal(amountRaw);
    if (amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new IllegalArgumentException("Amount must be greater than 0");
    }

    LocalDate transactionDate = LocalDate.parse(request.getTransactionDate());
    if (transactionDate.isAfter(LocalDate.now())) {
      throw new IllegalArgumentException("Transaction date cannot be in the future");
    }

    spendingService.createTransaction(
        uid,
        amount,
        request.getCategory().trim(),
        request.getMerchant().trim(),
        transactionDate
    );

    return Map.of("success", true);
  }

  @GetMapping("/insights")
  public InsightsResponse getInsights() {
    String uid = getCurrentUserUid();
    return spendingService.getInsights(uid);
  }

  private String getCurrentUserUid() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getName() == null) {
      throw new IllegalStateException("User not authenticated");
    }
    return auth.getName();
  }
}
