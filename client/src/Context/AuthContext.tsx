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

  /*
   * Check whether the user already has a valid session
   * when the React application starts.
   */
  useEffect(() => {
    async function checkSession() {
      try {
        //replace with axios.
        const response = await axios.get("http://localhost:5000/api/me", {
          withCredentials: true,
        });

        if (!response.data.user) {
          setUser(null);
          return;
        }

        const data = response.data;

        setUser(data.user);
      } catch (error) {
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
    const response = await axios.post("http://localhost:5000/api/auth/signin", {
      phone,
      username: username || undefined,
      password,
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error("Invalid phone number or password");
    }
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}