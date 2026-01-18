import React, { useEffect, useState } from "react";
import { PredictionsApi } from "../../api/PredictionsApi";
import "./ModelInfo.css";

export default function ModelInfo() {
    const [featureImportance, setFeatureImportance] = useState([]);
    const [trainingMetrics, setTrainingMetrics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchModelInfo();
    }, []);

    const fetchModelInfo = async () => {
        setLoading(true);
        setError("");

        try {
            const [fiResponse, metricsResponse] = await Promise.all([
                PredictionsApi.getFeatureImportance(),
                PredictionsApi.getTrainingMetrics()
            ]);

            // Feature importance always exists
            setFeatureImportance(fiResponse.features || []);

            // Training metrics may return { error: "..."} if missing
            if (metricsResponse.error) {
                setTrainingMetrics({ error: metricsResponse.error });
            } else {
                setTrainingMetrics(metricsResponse);
            }

        } catch (err) {
            console.error(err);
            setError("Failed to load model information");
            setFeatureImportance([]);
            setTrainingMetrics(null);
        } finally {
            setLoading(false);
        }
    };

    // Helper component to safely render a metric
    const MetricTile = ({ label, value }) => (
        <div className="metric-tile">
            <p>{label}</p>
            <h3>{typeof value === "number" ? value.toFixed(3) : "N/A"}</h3>
        </div>
    );

    if (loading) return <p>Loading model info...</p>;
    if (error) return <p className="model-error">{error}</p>;

    return (
        <div className="model-info-container">
            <h3>Model Information</h3>

            {/* ---------------- Feature Importance ---------------- */}
            <div className="model-section">
                <h4>Feature Importance</h4>

                {featureImportance.length === 0 ? (
                    <p>No feature importance data available.</p>
                ) : (
                    featureImportance.map((item) => (
                        <div key={item.feature} className="feature-row">
                            <span className="feature-name">{item.feature}</span>

                            <div className="feature-bar-wrapper">
                                <div
                                    className="feature-bar"
                                    style={{ width: `${item.importance || 0}%` }}
                                />
                            </div>

                            <span className="feature-percent">
                                {typeof item.importance === "number" 
                                    ? item.importance.toFixed(1) 
                                    : "N/A"}%
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* ---------------- Training Metrics ---------------- */}
            <div className="model-section">
                <h4>Training Performance</h4>

                {trainingMetrics?.error ? (
                    <p className="model-error">{trainingMetrics.error}</p>
                ) : trainingMetrics ? (
                    (() => {
                        const safeNumber = (num) => (typeof num === "number" ? num : 0);
                        const metricsToShow = {
                            roc_auc: safeNumber(trainingMetrics.roc_auc),
                            accuracy: safeNumber(trainingMetrics.classification_report?.accuracy),
                            precision: safeNumber(trainingMetrics.classification_report?.["weighted avg"]?.precision),
                            recall: safeNumber(trainingMetrics.classification_report?.["weighted avg"]?.recall)
                        };

                        return (
                            <div className="metrics-grid">
                                <MetricTile label="ROC-AUC" value={metricsToShow.roc_auc} />
                                <MetricTile label="Accuracy" value={metricsToShow.accuracy} />
                                <MetricTile label="Precision" value={metricsToShow.precision} />
                                <MetricTile label="Recall" value={metricsToShow.recall} />
                            </div>
                        );
                    })()
                ) : (
                    <p>No training metrics available.</p>
                )}
            </div>
            
        </div>
    );
}
