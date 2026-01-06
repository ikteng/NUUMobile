import React, { useState, useEffect } from "react";
import { DashboardApi } from "../api/DashboardApi";
import FileSidebar from "../components/Dashboard/FileSidebar";
import DataPreview from "../components/Dashboard/DataPreview";
import ColumnChart from "../components/Dashboard/ColumnChart";
import "./Dashboard.css";

export default function Dashboard() {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState("");
    const [selectedSheet, setSelectedSheet] = useState("");
    const [expandedFiles, setExpandedFiles] = useState({});
    const [fileSheets, setFileSheets] = useState({});
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
                        <ColumnChart
                            selectedFile={selectedFile}
                            selectedSheet={selectedSheet}
                        />
                        <DataPreview
                            selectedFile={selectedFile}
                            selectedSheet={selectedSheet}
                        />
                    </>
                ) : (
                    <p>Select a file and sheet</p>
                )}
            </div>
        </div>
    );
}
