package com.spendingapp.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SpendingDto(Long id, BigDecimal amount, String category, String merchant, LocalDate transactionDate) implements Serializable {}
