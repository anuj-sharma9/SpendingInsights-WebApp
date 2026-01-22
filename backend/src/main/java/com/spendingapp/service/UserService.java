package com.spendingapp.service;

import com.spendingapp.model.UserAccount;
import com.spendingapp.repository.UserAccountRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
  private final UserAccountRepository userRepository;

  public UserService(UserAccountRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Transactional
  public UserAccount registerUser(String firebaseUid, String email) {
    // Check if user already exists
    Optional<UserAccount> existingUser = userRepository.findByFirebaseUid(firebaseUid);
    if (existingUser.isPresent()) {
      throw new IllegalStateException("User already exists");
    }

    // Create new user account with blank slate (no sample data)
    UserAccount user = new UserAccount();
    user.setFirebaseUid(firebaseUid);
    user.setEmail(email);
    userRepository.save(user);

    return user;
  }
}

