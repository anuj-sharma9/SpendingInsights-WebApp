package com.spendingapp.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public record InsightsResponse(BigDecimal totalSpent, int transactionCount, List<InsightDto> byCategory) implements Serializable {}
