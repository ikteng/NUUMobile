import React, { useState, useEffect } from "react";
import { PredictionsApi } from "../../api/PredictionsApi";
import CircularProgress from "@mui/material/CircularProgress";
import "./PredictionsStats.css";

export default function PredictionsStats({ selectedFile, selectedSheet }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFile || !selectedSheet) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await PredictionsApi.getPredictionsStats(selectedFile, selectedSheet);
        setStats(data);
      } catch (err) {
        console.error("Error fetching prediction stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedFile, selectedSheet]);

  if (!selectedFile || !selectedSheet) return null;

  return (
    <div className="predictions-stats-container">
      <h2>Predictions Statistics</h2>
      {loading ? (
        <div className="circular-progress-wrapper">
          <CircularProgress size={24} sx={{ color: "var(--color-primary)" }} />
        </div>
      ) : stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <p>Total Rows</p>
            <h3>{stats.total_rows}</h3>
          </div>
          <div className="stat-card">
            <p>Predicted Churn</p>
            <h3>{stats.churn_count}</h3>
          </div>
          <div className="stat-card">
            <p>Predicted Non-Churn</p>
            <h3>{stats.non_churn_count}</h3>
          </div>
          <div className="stat-card">
            <p>Average Probability</p>
            <h3>{(stats.average_probability * 100).toFixed(2)}%</h3>
          </div>
        </div>
      ) : (
        <p>No statistics available</p>
      )}
    </div>
  );
}
