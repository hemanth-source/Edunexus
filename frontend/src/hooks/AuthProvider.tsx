import { createContext, useState, useEffect, useContext } from "react";
import { api } from "@/lib/api";
import type { academicYear, user } from "@/types";

// 1. Create Context
const AuthContext = createContext<{
  user: user | null;
  setUser: React.Dispatch<React.SetStateAction<user | null>>;
  loading: boolean;
  year: academicYear | null;
}>({
  user: null,
  setUser: () => {},
  loading: true,
  year: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true); // <--- Vital for preventing "flicker"
  const [year, setYear] = useState<academicYear | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        // 1. Check authentication profile
        const { data } = await api.get("/users/profile");
        setUser(data.user);
        
        // 2. Fetch current year if authenticated
        try {
          const yearRes = await api.get("/academic-years/current");
          setYear(yearRes.data);
        } catch (yearErr) {
          console.log("Failed to fetch academic year:", yearErr);
          setYear(null);
        }
      } catch (authErr) {
        console.log("Not authenticated:", authErr);
        setUser(null);
        setYear(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
