package com.spendingapp.service;

import com.spendingapp.dto.InsightDto;
import com.spendingapp.dto.InsightsResponse;
import com.spendingapp.dto.SpendingDto;
import com.spendingapp.model.SpendingTransaction;
import com.spendingapp.model.UserAccount;
import com.spendingapp.repository.SpendingTransactionRepository;
import com.spendingapp.repository.UserAccountRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class SpendingService {
  private final SpendingTransactionRepository transactionRepository;
  private final UserAccountRepository userRepository;

  public SpendingService(SpendingTransactionRepository transactionRepository, UserAccountRepository userRepository) {
    this.transactionRepository = transactionRepository;
    this.userRepository = userRepository;
  }

  public List<SpendingDto> getTransactions(String firebaseUid) {
    List<SpendingTransaction> transactions =
        transactionRepository.findByUser_FirebaseUidOrderByTransactionDateDesc(firebaseUid);
    return transactions.stream()
        .map(tx -> new SpendingDto(
            tx.getId(),
            tx.getAmount(),
            tx.getCategory(),
            tx.getMerchant(),
            tx.getTransactionDate()
        ))
        .toList();
  }

  @Cacheable(value = "insights", key = "#firebaseUid")
  public InsightsResponse getInsights(String firebaseUid) {
    List<SpendingTransaction> transactions =
        transactionRepository.findByUser_FirebaseUidOrderByTransactionDateDesc(firebaseUid);

    BigDecimal totalSpent = transactions.stream()
        .map(SpendingTransaction::getAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    List<Object[]> categoryRows = transactionRepository.sumByCategory(firebaseUid);
    List<InsightDto> insights = new ArrayList<>();
    for (Object[] row : categoryRows) {
      insights.add(new InsightDto((String) row[0], (BigDecimal) row[1]));
    }

    return new InsightsResponse(totalSpent, transactions.size(), insights);
  }

  @CacheEvict(value = "insights", key = "#firebaseUid")
  public SpendingTransaction createTransaction(
      String firebaseUid,
      BigDecimal amount,
      String category,
      String merchant,
      LocalDate transactionDate) {
    Optional<UserAccount> user = userRepository.findByFirebaseUid(firebaseUid);
    if (user.isEmpty()) {
      throw new IllegalStateException("User not found");
    }

    BigDecimal normalizedAmount = amount.setScale(2, RoundingMode.HALF_UP);
    SpendingTransaction transaction = new SpendingTransaction();
    transaction.setUser(user.get());
    transaction.setAmount(normalizedAmount);
    transaction.setCategory(category);
    transaction.setMerchant(merchant);
    transaction.setTransactionDate(transactionDate);
    return transactionRepository.save(transaction);
  }
}
