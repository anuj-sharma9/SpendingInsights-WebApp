package com.spendingapp.dto;

import java.io.Serializable;
import java.math.BigDecimal;

public record InsightDto(String category, BigDecimal total) implements Serializable {}
