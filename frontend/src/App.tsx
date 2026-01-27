import React, { useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth } from "./auth/firebase";
import InsightsChart from "./components/InsightsChart";
import ClickSplash from "./components/DropletCursor";

type Spending = {
  id: number;
  amount: number;
  category: string;
  merchant: string;
  transactionDate: string;
};

type Insight = {
  category: string;
  total: number;
};

type InsightsResponse = {
  totalSpent: number;
  transactionCount: number;
  byCategory: Insight[];
};

const apiBase = import.meta.env.VITE_API_BASE || "/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spending, setSpending] = useState<Spending[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newMerchant, setNewMerchant] = useState("");
  const [newDate, setNewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [refreshingVerification, setRefreshingVerification] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        setToken(idToken);
      } else {
        setToken("");
        setSpending([]);
        setInsights(null);
      }
    });
  }, []);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`
  }), [token]);

  const mapAuthError = (err: any) => {
    const code = err?.code as string | undefined;
    if (!code) {
      return "Something went wrong. Please try again.";
    }

    switch (code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/user-not-found":
        return "No account found for that email.";
      case "auth/email-already-in-use":
        return "That email is already associated with an account.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResetMessage(null);
    setResetError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(mapAuthError(err));
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setRegistering(true);
    try {
      // Create Firebase account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setVerificationMessage("Verification email sent. Check your inbox.");
      setVerificationError(null);
      const idToken = await userCredential.user.getIdToken();
      
      // Register user in backend
      const response = await fetch(`${apiBase}/users/register`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error("Failed to complete registration");
      }

      // Clear form and switch to login view (user is already logged in)
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setIsRegistering(false);
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setRegistering(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const switchToRegister = () => {
    setIsRegistering(true);
    setError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setResettingPassword(false);
    setResetMessage(null);
    setResetError(null);
  };

  const switchToLogin = () => {
    setIsRegistering(false);
    setError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setResettingPassword(false);
    setResetMessage(null);
    setResetError(null);
  };

  const switchToResetPassword = () => {
    setResettingPassword(true);
    setError(null);
    setResetMessage(null);
    setResetError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSendPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetMessage(null);
    setResetError(null);

    if (!email) {
      setResetError("Please enter your email address.");
      return;
    }

    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      setResetError(mapAuthError(err));
    } finally {
      setSendingReset(false);
    }
  };

  const categories = [
    "Groceries",
    "Entertainment",
    "Rent",
    "Utilities",
    "Dining",
    "Coffee",
    "Transport",
    "Shopping",
    "Health",
    "Travel",
    "Insurance",
    "Subscriptions",
    "Education",
    "Personal Care",
    "Other"
  ];

  const handleCreateTransaction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setFormError(null);

    if (!newAmount || !newCategory || !newMerchant || !newDate) {
      setFormError("Please fill out all fields.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(newAmount)) {
      setFormError("Amount must have up to 2 decimal places.");
      return;
    }

    const amountValue = Number(newAmount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/spending`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: newAmount,
          category: newCategory,
          merchant: newMerchant,
          transactionDate: newDate
        })
      });

      if (!response.ok) {
        throw new Error("Failed to add transaction");
      }

      setNewAmount("");
      setNewCategory("");
      setNewMerchant("");
      setNewDate("");
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAmountChange = (value: string) => {
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
      setNewAmount(value);
    }
  };

  const handleRefreshVerification = async () => {
    setRefreshingVerification(true);
    setVerificationError(null);
    setVerificationMessage(null);
    try {
      await auth.currentUser?.reload();
      const refreshedUser = auth.currentUser;
      setUser(refreshedUser);
      if (refreshedUser?.emailVerified) {
        setVerificationMessage("Email verified successfully!");
      } else {
        setVerificationMessage("Email not yet verified. Please check your inbox and click the verification link.");
      }
    } catch (err: any) {
      setVerificationError("Failed to refresh verification status. Please try again.");
    } finally {
      setRefreshingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setVerificationError(null);
    setVerificationMessage(null);
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationMessage("Verification email resent. Check your inbox.");
    } catch (err: any) {
      setVerificationError(mapAuthError(err));
    } finally {
      setResending(false);
    }
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [spendingRes, insightsRes] = await Promise.all([
        fetch(`${apiBase}/spending`, { headers: authHeaders }),
        fetch(`${apiBase}/insights`, { headers: authHeaders })
      ]);

      if (!spendingRes.ok || !insightsRes.ok) {
        throw new Error("Failed to load spending data");
      }

      const spendingJson: Spending[] = await spendingRes.json();
      const insightsJson: InsightsResponse = await insightsRes.json();
      setSpending(spendingJson);
      setInsights(insightsJson);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Format currency with nice styling
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date nicely - append T00:00:00 to treat as local time, not UTC
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <>
      <ClickSplash />
      <div className="app">
        <header className="header">
          <div>
            <h1>💧 Spending Insights</h1>
            <p className="muted">Secure spending analytics with Firebase + Spring Boot</p>
          </div>
          {user && (
            <button className="secondary" onClick={handleLogout}>
              <span>Sign out</span>
            </button>
          )}
        </header>

        {!user ? (
          <section className="card" style={{ maxWidth: '440px', margin: '60px auto' }}>
            {!isRegistering ? (
              <>
                {!resettingPassword ? (
                  <>
                    <h2>Welcome back</h2>
                    <p className="muted" style={{ marginBottom: '8px' }}>
                      Sign in to view your spending insights and analytics.
                    </p>
                    <form onSubmit={handleLogin} className="form">
                      <label>
                        Email address
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="you@example.com"
                          required 
                        />
                      </label>
                      <label>
                        Password
                        <input 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="••••••••"
                          required 
                        />
                      </label>
                      {error && <p className="error">{error}</p>}
                      <button type="submit">
                        <span>Sign in</span>
                      </button>
                    </form>
                    <div className="auth-switch" style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid rgba(14, 165, 233, 0.15)',
                      textAlign: 'center' 
                    }}>
                      <button 
                        type="button" 
                        className="secondary" 
                        onClick={switchToResetPassword}
                        style={{ width: '100%' }}
                      >
                        <span>Forgot password?</span>
                      </button>
                    </div>
                    <div className="auth-switch" style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid rgba(14, 165, 233, 0.15)',
                      textAlign: 'center' 
                    }}>
                      <p className="muted" style={{ marginBottom: '12px' }}>
                        Don't have an account?
                      </p>
                      <button 
                        type="button" 
                        className="secondary" 
                        onClick={switchToRegister}
                        style={{ width: '100%' }}
                      >
                        <span>Create Account</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2>Reset your password</h2>
                    <p className="muted" style={{ marginBottom: '8px' }}>
                      Enter your email and we'll send you a reset link.
                    </p>
                    <form onSubmit={handleSendPasswordReset} className="form">
                      <label>
                        Email address
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="you@example.com"
                          required 
                          disabled={sendingReset}
                        />
                      </label>
                      {resetError && <p className="error">{resetError}</p>}
                      {resetMessage && <p className="muted">{resetMessage}</p>}
                      <button type="submit" disabled={sendingReset}>
                        <span>{sendingReset ? "Sending..." : "Send reset email"}</span>
                      </button>
                    </form>
                    <div className="auth-switch" style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid rgba(14, 165, 233, 0.15)',
                      textAlign: 'center' 
                    }}>
                      <button 
                        type="button" 
                        className="secondary" 
                        onClick={switchToLogin}
                        style={{ width: '100%' }}
                        disabled={sendingReset}
                      >
                        <span>Back to Sign In</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <h2>Create Account</h2>
                <p className="muted" style={{ marginBottom: '8px' }}>
                  Sign up to start tracking your spending insights.
                </p>
                <form onSubmit={handleRegister} className="form">
                  <label>
                    Email address
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="you@example.com"
                      required 
                      disabled={registering}
                    />
                  </label>
                  <label>
                    Password
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      required 
                      disabled={registering}
                    />
                  </label>
                  <label>
                    Confirm Password
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="••••••••"
                      required 
                      disabled={registering}
                    />
                  </label>
                  {error && <p className="error">{error}</p>}
                  <button type="submit" disabled={registering}>
                    <span>{registering ? "Creating account..." : "Create Account"}</span>
                  </button>
                </form>
                <div className="auth-switch" style={{ 
                  marginTop: '24px', 
                  paddingTop: '20px', 
                  borderTop: '1px solid rgba(14, 165, 233, 0.15)',
                  textAlign: 'center' 
                }}>
                  <p className="muted" style={{ marginBottom: '12px' }}>
                    Already have an account?
                  </p>
                  <button 
                    type="button" 
                    className="secondary" 
                    onClick={switchToLogin}
                    style={{ width: '100%' }}
                    disabled={registering}
                  >
                    <span>Sign In</span>
                  </button>
                </div>
              </>
            )}
          </section>
        ) : user && !user.emailVerified ? (
          <section className="card" style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📧</div>
            <h2>Verify your email</h2>
            <p className="muted" style={{ marginBottom: '24px' }}>
              We've sent a verification link to <strong>{user.email}</strong>. 
              Please check your inbox and click the link to verify your account.
            </p>
            {verificationError && <p className="error" style={{ marginBottom: '16px' }}>{verificationError}</p>}
            {verificationMessage && <p className="muted" style={{ marginBottom: '16px', color: 'var(--sky-600)' }}>{verificationMessage}</p>}
            <div className="form" style={{ gap: '12px' }}>
              <button 
                onClick={handleRefreshVerification} 
                disabled={refreshingVerification || resending}
              >
                <span>{refreshingVerification ? "Checking..." : "I've verified my email"}</span>
              </button>
              <button
                type="button"
                className="secondary"
                onClick={handleResendVerification}
                disabled={refreshingVerification || resending}
              >
                <span>{resending ? "Resending..." : "Resend verification email"}</span>
              </button>
            </div>
            <div style={{ 
              marginTop: '24px', 
              paddingTop: '20px', 
              borderTop: '1px solid rgba(14, 165, 233, 0.15)'
            }}>
              <button 
                type="button" 
                className="secondary" 
                onClick={handleLogout}
                style={{ width: '100%' }}
              >
                <span>Sign out</span>
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid">
              <section className="card">
                <h2>📊 Insights Overview</h2>
                {insights ? (
                  <>
                    <div className="stats">
                      <div>
                        <p className="stat-label">Total Spent</p>
                        <p className="stat-value">{formatCurrency(insights.totalSpent)}</p>
                      </div>
                      <div>
                        <p className="stat-label">Transactions</p>
                        <p className="stat-value">{insights.transactionCount}</p>
                      </div>
                    </div>
                    <InsightsChart insights={insights.byCategory} />
                  </>
                ) : (
                  <div className="loading">
                    <p className="muted">Loading your insights...</p>
                  </div>
                )}
              </section>

              <section className="card">
                <div className="card-header">
                  <h2>📋 Recent Transactions</h2>
                  <button className="secondary" onClick={loadData} disabled={loading}>
                    <span>{loading ? "Refreshing..." : "Refresh"}</span>
                  </button>
                </div>
                {error && <p className="error">{error}</p>}
                <div className="table">
                  <div className="table-row table-header">
                    <span>Date</span>
                    <span>Merchant</span>
                    <span>Category</span>
                    <span className="align-right">Amount</span>
                  </div>
                  {spending.length === 0 ? (
                    <div style={{ 
                      padding: '32px 16px', 
                      textAlign: 'center',
                      background: 'rgba(14, 165, 233, 0.05)',
                      borderRadius: '12px',
                      marginTop: '8px'
                    }}>
                      <p className="muted">No transactions found. Start spending to see your data here!</p>
                    </div>
                  ) : (
                    spending.map((tx, index) => (
                      <div 
                        key={tx.id} 
                        className="table-row"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'cardEnter 0.4s ease-out backwards'
                        }}
                      >
                        <span>{formatDate(tx.transactionDate)}</span>
                        <span style={{ fontWeight: 500 }}>{tx.merchant}</span>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: 'rgba(14, 165, 233, 0.1)',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          color: '#0369a1'
                        }}>
                          {tx.category}
                        </span>
                        <span className="align-right" style={{ fontWeight: 600 }}>
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="card" style={{ marginTop: "28px" }}>
              <div className="card-header">
                <h2>➕ Add a Transaction</h2>
              </div>
              <form onSubmit={handleCreateTransaction} className="form">
                <label>
                  Amount
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    required
                    disabled={submitting}
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Merchant
                  <input
                    type="text"
                    placeholder="Any merchant name"
                    value={newMerchant}
                    onChange={(e) => setNewMerchant(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    required
                    disabled={submitting}
                  />
                </label>
                {formError && <p className="error">{formError}</p>}
                <button type="submit" disabled={submitting}>
                  <span>{submitting ? "Saving..." : "Add Transaction"}</span>
                </button>
              </form>
            </section>
          </>
        )}

        {/* Footer credit */}
        <footer className="footer-credit">
          Webapp developed by Anuj Sharma from{" "}
          <a href="https://anujsharma9.com" target="_blank" rel="noopener noreferrer">
            anujsharma9.com
          </a>
        </footer>
      </div>
    </>
  );
}
