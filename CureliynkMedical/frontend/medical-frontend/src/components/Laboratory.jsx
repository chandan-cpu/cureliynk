import React, { useEffect, useState } from "react";
import "./Laboratory.css";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Laboratory() {
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const findLaboratories = () => {
    setLoading(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Location is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v1/medical/laboratories/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=10&limit=10`
          );

          if (!response.ok) {
            throw new Error("Unable to find nearby laboratories.");
          }

          const data = await response.json();

          setLaboratories(data.laboratories || []);
        } catch (err) {
          console.error("Laboratory API error:", err);

          setError(
            err.message || "Unable to load nearby laboratories."
          );
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Location error:", error);

        setError(
          "Please allow location access to find laboratories near you."
        );

        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    findLaboratories();
  }, []);

  if (loading) {
    return (
      <div className="laboratory-page">
        <div className="laboratory-header">
          <h2>Nearby Laboratories</h2>
          <p>Finding laboratories near you...</p>
        </div>

        <div className="laboratory-loading">
          <div className="laboratory-spinner"></div>
          <p>Getting your location and finding nearby laboratories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="laboratory-page">
        <div className="laboratory-header">
          <h2>Nearby Laboratories</h2>
          <p>Find diagnostic laboratories near your current location.</p>
        </div>

        <div className="laboratory-error">
          <p>{error}</p>

          <button onClick={findLaboratories}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="laboratory-page">

      <div className="laboratory-header">
        <div>
          <h2>Nearby Laboratories</h2>

          <p>
            {laboratories.length} laboratories found near you
          </p>
        </div>

        <button
          className="laboratory-refresh-button"
          onClick={findLaboratories}
        >
          Refresh
        </button>
      </div>

      {laboratories.length === 0 ? (
        <div className="laboratory-empty">
          <h3>No laboratories found</h3>

          <p>
            We couldn't find any laboratories near your current
            location.
          </p>

          <button onClick={findLaboratories}>
            Search Again
          </button>
        </div>
      ) : (
        <div className="laboratory-list">

          {laboratories.map((lab, index) => (
            <div
              className="laboratory-card"
              key={lab.place_id || index}
            >

              <div className="laboratory-icon">
                🧪
              </div>

              <div className="laboratory-card-content">

                <h3>
                  {lab.name || "Medical Laboratory"}
                </h3>

                <p className="laboratory-type">
                  Diagnostic Laboratory
                </p>

                <p className="laboratory-address">
                  {lab.address || "Address unavailable"}
                </p>

                <div className="laboratory-actions">

                  {lab.google_maps_url && (
                    <a
                      href={lab.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="laboratory-map-button"
                    >
                      View on Map
                    </a>
                  )}

                </div>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}