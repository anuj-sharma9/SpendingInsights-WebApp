package com.spendingapp.repository;

import com.spendingapp.model.SpendingTransaction;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SpendingTransactionRepository extends JpaRepository<SpendingTransaction, Long> {
  List<SpendingTransaction> findByUser_FirebaseUidOrderByTransactionDateDesc(String firebaseUid);

  @Query("select t.category as category, sum(t.amount) as total from SpendingTransaction t "
      + "where t.user.firebaseUid = :uid group by t.category")
  List<Object[]> sumByCategory(@Param("uid") String firebaseUid);
}
