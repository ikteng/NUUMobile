import React, { useEffect, useState } from "react";
import { PredictionsApi } from "../../api/PredictionsApi";
import "./PredictionsAccuracy.css";

export default function PredictionsAccuracy({ selectedFile, selectedSheet }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!selectedFile || !selectedSheet) return;
        fetchAccuracy();
    }, [selectedFile, selectedSheet]);

    const fetchAccuracy = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await PredictionsApi.getSheetAccuracy(selectedFile, selectedSheet);

            if (data.message) {
                setMessage(data.message);
                setMetrics(null);
            } else if (data.error) {
                setError(data.error);
                setMetrics(null);
            } 
            else {
                setMetrics(data);
            }

        } catch (err) {
            setError("Failed to fetch accuracy");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Loading model accuracy...</p>;
    if (error) return <p className="predictions-error">{error}</p>;
    if (message) return <p className="predictions-message">{message}</p>;
    if (!metrics) return null;

    const { classification_report, confusion_matrix, roc_auc } = metrics;

    return (
        <div className="predictions-accuracy">
            <h3>Model Accuracy Metrics</h3>

            <p><strong>ROC-AUC Score:</strong> {roc_auc.toFixed(3)}</p>

            <div className="metric-section">
                <h4>Confusion Matrix</h4>
                <div className="table-scroll">
                    <table className="confusion-matrix">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Predicted 0</th>
                                <th>Predicted 1</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th>Actual 0</th>
                                <td>{confusion_matrix[0][0]}</td>
                                <td>{confusion_matrix[0][1]}</td>
                            </tr>
                            <tr>
                                <th>Actual 1</th>
                                <td>{confusion_matrix[1][0]}</td>
                                <td>{confusion_matrix[1][1]}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="metric-section">
                <h4>Classification Report</h4>
                <div className="table-scroll">
                    <table className="classification-report">
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Precision</th>
                                <th>Recall</th>
                                <th>F1-Score</th>
                                <th>Support</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(classification_report)
                                .filter((key) => !["accuracy", "macro avg", "weighted avg"].includes(key))
                                .map((key) => (
                                    <tr key={key}>
                                        <td>{key}</td>
                                        <td>{classification_report[key].precision.toFixed(3)}</td>
                                        <td>{classification_report[key].recall.toFixed(3)}</td>
                                        <td>{classification_report[key]["f1-score"].toFixed(3)}</td>
                                        <td>{classification_report[key].support}</td>
                                    </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
