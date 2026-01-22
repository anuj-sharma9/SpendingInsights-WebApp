package com.spendingapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class SpendingBackendApplication {
  public static void main(String[] args) {
    SpringApplication.run(SpendingBackendApplication.class, args);
  }
}
