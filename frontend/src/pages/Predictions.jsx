import React, { useState, useEffect } from "react";
import { DashboardApi } from "../api/DashboardApi";
import { PredictionsApi } from "../api/PredictionsApi";
import FileSidebar from "../components/Dashboard/FileSidebar";
import PredictionsStats from "../components/Predictions/PredictionsStats";
import PredictionsPreview from "../components/Predictions/PredictionsPreview";
import PredictionsAccuracy from "../components/Predictions/PredictionsAccuracy";
import ModelInfo from "../components/Predictions/ModelInfo";
import "./Predictions.css";

export default function Predictions() {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState("");
    const [selectedSheet, setSelectedSheet] = useState("");
    const [expandedFiles, setExpandedFiles] = useState({});
    const [fileSheets, setFileSheets] = useState({});
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState("predictions");

    useEffect(() => {
        document.title = "Predictions - Churn Predictor";
        fetchUploadedFiles();
    }, []);

    const fetchUploadedFiles = async () => {
        try {
            const files = await DashboardApi.getFiles();
            setUploadedFiles(files);
            if (files.length > 0) setSelectedFile(files[0]);
        } catch (err) {
            console.error("Error fetching files:", err);
        }
    };

    const toggleFile = async (file) => {
        setExpandedFiles((prev) => ({
            ...prev,
            [file]: !prev[file],
        }));

        if (!fileSheets[file]) {
            try {
                const sheets = await DashboardApi.getSheets(file);
                setFileSheets((prev) => ({
                    ...prev,
                    [file]: sheets,
                }));
            } catch (err) {
                console.error("Error fetching sheets:", err);
            }
        }
    };

    const selectSheet = (file, sheet) => {
        setSelectedFile(file);
        setSelectedSheet(sheet);
        setActiveTab("predictions");

    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "predictions":
                return (
                    <div className="predictions-tab-stack">
                        <PredictionsStats
                            selectedFile={selectedFile}
                            selectedSheet={selectedSheet}
                        />

                        <PredictionsPreview
                            selectedFile={selectedFile}
                            selectedSheet={selectedSheet}
                        />

                        <PredictionsAccuracy
                            selectedFile={selectedFile}
                            selectedSheet={selectedSheet}
                        />

                    </div>
                );
            case "model":
                return (
                    <ModelInfo />
                );
            default:
                return null;
        }
    };

    return (
        <div className="predictions-layout">
            <FileSidebar
                files={uploadedFiles}
                expandedFiles={expandedFiles}
                fileSheets={fileSheets}
                selectedFile={selectedFile}
                selectedSheet={selectedSheet}
                onToggleFile={toggleFile}
                onSelectSheet={selectSheet}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
                onFileDeleted={(file) => {
                    setUploadedFiles((prev) => prev.filter((f) => f !== file));
                    setFileSheets((prev) => {
                        const newSheets = { ...prev };
                        delete newSheets[file];
                        return newSheets;
                    });
                    if (selectedFile === file) {
                        setSelectedFile("");
                        setSelectedSheet("");
                    }
                }}
            />

            <div className="predictions-content">
                {selectedFile && selectedSheet ? ( 
                    <>
                        {/* --- File / Sheet Title --- */}
                        <div className="predictions-titlebar">
                            <h2>
                                {selectedFile}
                                <span className="sheet-name"> — Sheet: {selectedSheet}</span>
                            </h2>
                        </div>

                         {/* --- Tab Bar --- */}
                        <div className="tabs-container">
                            <button
                                className={`tab-button ${activeTab === "predictions" ? "active" : ""}`}
                                onClick={() => setActiveTab("predictions")}
                            >
                                Predictions
                            </button>
                            <button
                                className={`tab-button ${activeTab === "model" ? "active" : ""}`}
                                onClick={() => setActiveTab("model")}
                            >
                                Model
                            </button>
                        </div>

                        {/* --- Tab Content --- */}
                        <div className="tab-content">
                            {renderTabContent()}
                        </div>
                    </>
                ) : (
                    <>
                    <h1>Predictions</h1>
                    <p>Select a file and sheet to view predictions</p>
                    </>
                )}
            </div>
        </div>
    );
}
