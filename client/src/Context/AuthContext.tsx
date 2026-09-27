import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import axios from "axios";

type User = {
  id: string;
  phone: string;
  username: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (phone: string, username: string, password: string) => Promise<void>;
  pendingPhone: string | null;
  verifyOtp: (otp: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState<string | null>(() =>
    sessionStorage.getItem("pendingOtpPhone")
  );

  /*
   * Check whether the user already has a valid session
   * when the React application starts.
   */
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await axios.get("/api/user", {
          withCredentials: true,
        });

        if (!response.data.user) {
          setUser(null);
          return;
        }

        const data = response.data;

        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  async function signIn(
    phone: string,
    username: string,
    password: string
  ): Promise<void> {
    await axios.post(
      "/api/auth/signin",
      {
        phone,
        username: username || undefined,
        password,
      },
      { withCredentials: true }
    );

    sessionStorage.setItem("pendingOtpPhone", phone);
    setPendingPhone(phone);
  }

  async function verifyOtp(otp: string): Promise<void> {
    if (!pendingPhone) {
      throw new Error("Start sign-in before verifying a code");
    }

    const response = await axios.post(
      "/api/auth/verify-otp",
      { phone: pendingPhone, otp },
      { withCredentials: true }
    );

    setUser(response.data.user);
    sessionStorage.removeItem("pendingOtpPhone");
    setPendingPhone(null);
  }

  async function signOut(): Promise<void> {
    await fetch("/api/signout", {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        pendingPhone,
        verifyOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// The context hook intentionally shares the provider's module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}