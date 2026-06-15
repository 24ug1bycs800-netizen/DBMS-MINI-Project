import React, { useState, useEffect } from "react";
import { useCityStore } from "../store/useCityStore.js";
import { Search, MapPin, X, Globe } from "lucide-react";
import api from "../services/api.js";

interface City {
  id: number;
  name: string;
  slug: string;
}

const ALL_CITIES: City = { id: 0, name: "All Cities", slug: "" };

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedCity, setSelectedCity } = useCityStore();
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get("/cities");
        setCities(res.data.cities);
      } catch (err) {
        console.error("Failed to load cities", err);
      }
    };
    fetchCities();
  }, []);

  if (!isOpen) return null;

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (city: City) => {
    setSelectedCity(city);
    onClose();
  };

  const isAllCities = selectedCity.id === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-md">
      <div className="w-full max-w-xl p-6 rounded-2xl bg-card border border-gray-700 font-poppins shadow-premium text-white relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-primary text-premium-card" />
          Select Your City
        </h2>

        {/* ALL CITIES OPTION */}
        <button
          onClick={() => handleSelect(ALL_CITIES)}
          className="w-full mb-4 p-3 rounded-xl border text-sm font-semibold font-inter transition-all flex items-center gap-2.5"
          style={
            isAllCities
              ? { borderColor: "rgba(201,168,76,0.5)", background: "rgba(201,168,76,0.1)", color: "#C9A84C" }
              : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.45)" }
          }
          onMouseEnter={(e) => { if (!isAllCities) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "#fff"; } }}
          onMouseLeave={(e) => { if (!isAllCities) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; } }}
        >
          <Globe className="w-4 h-4 flex-shrink-0" style={{ color: isAllCities ? "#C9A84C" : "rgba(255,255,255,0.3)" }} />
          All Cities
          <span className="ml-auto text-[10px] font-normal opacity-60">Show everything</span>
        </button>

        {/* SEARCH BOX */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search for cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl focus:border-primary focus:outline-none text-white placeholder-muted font-inter text-sm transition-all"
          />
        </div>

        {/* CITIES GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-2">
          {filtered.length > 0 ? (
            filtered.map((city) => {
              const isSelected = selectedCity.id === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => handleSelect(city)}
                  className={`p-3 rounded-xl border text-sm text-center font-medium font-inter transition-all ${
                    isSelected
                      ? "border-primary bg-primary bg-opacity-20 text-white shadow-xl"
                      : "border-neutral-800 bg-neutral-900 bg-opacity-50 hover:bg-neutral-800 text-muted hover:text-white"
                  }`}
                >
                  {city.name}
                </button>
              );
            })
          ) : (
            <p className="col-span-3 text-center text-muted py-6">
              No cities matched your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
