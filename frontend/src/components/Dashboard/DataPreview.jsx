import React from "react";
import "./DataPreview.css";

export default function DataPreview({ previewData, previewColumns, selectedFile, selectedSheet }) {
    if (!previewData || !previewColumns) return null;

    return (
        <div>
             <h2>Data Preview</h2>
            <p>
                Showing preview for <strong>{selectedFile}</strong>, sheet <strong>{selectedSheet}</strong>.
            </p>

            <div className="preview-table-container">
                <table className="preview-table">
                    <thead>
                        <tr>
                            {previewColumns.map((col, idx) => (
                                <th key={idx}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewData.map((row, idx) => (
                            <tr key={idx}>
                                {previewColumns.map((col, i) => (
                                    <td key={i}>{row[col]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
