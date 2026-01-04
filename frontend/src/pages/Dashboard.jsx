import React, { useState, useEffect } from "react";
import { DashboardApi } from "../api/DashboardApi";
import DataPreview from "../components/Dashboard/DataPreview";
import ColumnChart from "../components/Dashboard/ColumnChart";
import "./Dashboard.css";

function Dashboard() {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState("");
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState("");
    const [previewData, setPreviewData] = useState([]);
    const [previewColumns, setPreviewColumns] = useState([]);

    useEffect(() => {
        document.title = "Dashboard - Churn Predictor";
        fetchUploadedFiles();
    }, []);

    // Fetch uploaded files from backend
    const fetchUploadedFiles = async () => {
        try {
            const files = await DashboardApi.getFiles();
            setUploadedFiles(files);
            if (files.length > 0) setSelectedFile(files[0]);
        } catch (err) {
            console.error("Error fetching files:", err);
        }
    };

    // Fetch sheets (for Excel files)
    useEffect(() => {
        if (!selectedFile) {
            setSheets([]);       // Clear sheets if no file is selected
            setSelectedSheet(""); // Clear selected sheet
            return;
        }

        const fetchSheets = async () => {
            try {
                const sheets = await DashboardApi.getSheets(selectedFile);
                setSheets(sheets);
                setSelectedSheet(sheets.length > 0 ? sheets[0] : ""); // Set first sheet or empty
            } catch (err) {
                console.error("Error fetching sheets:", err);
                setSheets([]);
                setSelectedSheet(""); // Clear sheet on error
            }
        };

        // Clear selectedSheet immediately when file changes
        setSelectedSheet("");
        fetchSheets();
    }, [selectedFile]);

    useEffect(() => {
        if (selectedFile && selectedSheet) {
            const fetchPreview = async () => {
            try {
                const data = await DashboardApi.getSheetData(selectedFile, selectedSheet);
                console.log("Preview data from API:", data);
                setPreviewColumns(data.columns);
                setPreviewData(data.preview);
            } catch (err) {
                console.error("Error fetching preview:", err);
            }
            };
            fetchPreview();
        }
    }, [selectedFile, selectedSheet]);

    return (
        <div className="dashboard-container">
        <h1>Dashboard</h1>

        <div className="dashboard-selection">
            <div className="dashboard-field">
            <label>Select File:</label>
            
            <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="dropdown"
            >
                {uploadedFiles.map((file, idx) => (
                <option key={idx} value={file}>
                    {file}
                </option>
                ))}
            </select>
            </div>

            <div className="dashboard-field">
            <label>Select Sheet:</label>
            <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="dropdown"
            >
                {sheets.map((sheet, idx) => (
                <option key={idx} value={sheet}>
                    {sheet}
                </option>
                ))}
            </select>
            </div>
        </div>

        <div className="dashboard-content">
            {selectedFile && selectedSheet ? (
            <div>

                <DataPreview
                    previewData={previewData}
                    previewColumns={previewColumns}
                    selectedFile={selectedFile}
                    selectedSheet={selectedSheet}
                />
                
                <ColumnChart 
                            selectedFile={selectedFile} 
                            selectedSheet={selectedSheet} 
                        />
                {/* Here you can later add charts, tables, summaries */}
            </div>
            ) : (
            <p>Please select a file and sheet to view data.</p>
            )}
        </div>
        </div>
    );
}

export default Dashboard;
