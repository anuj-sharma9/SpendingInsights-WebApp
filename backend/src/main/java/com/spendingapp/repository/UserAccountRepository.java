package com.spendingapp.repository;

import com.spendingapp.model.UserAccount;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
  Optional<UserAccount> findByFirebaseUid(String firebaseUid);
}
