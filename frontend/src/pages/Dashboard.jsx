import React, { useState, useEffect } from "react";
import { DashboardApi } from "../api/DashboardApi";
import FileSidebar from "../components/Dashboard/FileSidebar";
import DataPreview from "../components/Dashboard/DataPreview";

import FrequencyChart from "../components/Dashboard/FrequencyChart";
import CorrelationHeatmap from "../components/Dashboard/CorrelationHeatmap";

import "./Dashboard.css";

export default function Dashboard() {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState("");
    const [selectedSheet, setSelectedSheet] = useState("");
    const [expandedFiles, setExpandedFiles] = useState({});
    const [fileSheets, setFileSheets] = useState({});
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState("chart");

    useEffect(() => {
        document.title = "Dashboard - Churn Predictor";
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
        setActiveTab("chart");
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "chart":
                return (
                    <>
                        <FrequencyChart
                            selectedFile={selectedFile}
                            selectedSheet={selectedSheet}
                        />

                        <CorrelationHeatmap
                            selectedFile={selectedFile}
                            selectedSheet={selectedSheet}
                        />
                    </>
                );
            case "preview":
                return (
                    <DataPreview
                        selectedFile={selectedFile}
                        selectedSheet={selectedSheet}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="dashboard-layout">
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

            <div className="dashboard-content">
                {selectedFile && selectedSheet ? (
                    <>
                        {/* --- File / Sheet Title --- */}
                        <div className="dashboard-titlebar">
                            <h2>
                                {selectedFile}
                                <span className="sheet-name"> — Sheet: {selectedSheet}</span>
                            </h2>
                        </div>

                        {/* --- Tab Bar --- */}
                        <div className="tabs-container">
                            <button
                                className={`tab-button ${activeTab === "chart" ? "active" : ""}`}
                                onClick={() => setActiveTab("chart")}
                            >
                                Column Chart
                            </button>
                            <button
                                className={`tab-button ${activeTab === "preview" ? "active" : ""}`}
                                onClick={() => setActiveTab("preview")}
                            >
                                Data Preview
                            </button>
                        </div>

                        {/* --- Tab Content --- */}
                        <div className="tab-content">
                            {renderTabContent()}
                        </div>
                    </>
                ) : (
                    <>
                        <h1>Dashboard</h1>
                        <p>Select a file and sheet</p>
                    </>
                )}
            </div>
        </div>
    );
}
