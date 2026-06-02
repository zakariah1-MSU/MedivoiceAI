import { createContext, useContext, useState } from "react";

type PharmacyContextType = {
  pharmacyId: string | null;
  pharmacyCode: string | null;
  pharmacyName: string | null;
  setPharmacy: (id: string, name: string, code: string) => void;
  clearPharmacy: () => void;
};

const PharmacyContext = createContext<PharmacyContextType>({
  pharmacyId: null,
  pharmacyCode: null,
  pharmacyName: null,
  setPharmacy: () => {},
  clearPharmacy: () => {},
});

export function PharmacyProvider({ children }: { children: React.ReactNode }) {
  const [pharmacyId, setPharmacyId] = useState<string | null>(() => {
    const id = localStorage.getItem("pharmacy_id");
    const code = localStorage.getItem("pharmacy_code");
    if (id && !code) {
      localStorage.removeItem("pharmacy_id");
      localStorage.removeItem("pharmacy_name");
      return null;
    }
    return id;
  });
  const [pharmacyCode, setPharmacyCode] = useState<string | null>(
    () => localStorage.getItem("pharmacy_code")
  );
  const [pharmacyName, setPharmacyName] = useState<string | null>(() => {
    const code = localStorage.getItem("pharmacy_code");
    return code ? localStorage.getItem("pharmacy_name") : null;
  });

  const setPharmacy = (id: string, name: string, code: string) => {
    localStorage.setItem("pharmacy_id", id);
    localStorage.setItem("pharmacy_name", name);
    localStorage.setItem("pharmacy_code", code);
    setPharmacyId(id);
    setPharmacyName(name);
    setPharmacyCode(code);
  };

  const clearPharmacy = () => {
    localStorage.removeItem("pharmacy_id");
    localStorage.removeItem("pharmacy_name");
    localStorage.removeItem("pharmacy_code");
    setPharmacyId(null);
    setPharmacyName(null);
    setPharmacyCode(null);
  };

  return (
    <PharmacyContext.Provider value={{ pharmacyId, pharmacyCode, pharmacyName, setPharmacy, clearPharmacy }}>
      {children}
    </PharmacyContext.Provider>
  );
}

export function usePharmacyContext() {
  return useContext(PharmacyContext);
}
