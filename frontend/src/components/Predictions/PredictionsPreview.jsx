import React, { useState, useEffect, useRef } from "react";
import { PredictionsApi } from "../../api/PredictionsApi";
import "./PredictionsPreview.css";

export default function PredictionsPreview({ selectedFile, selectedSheet }) {
    const [previewData, setPreviewData] = useState([]);
    const [previewColumns, setPreviewColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchActive, setSearchActive] = useState(false);

    const loaderRef = useRef(null);

    // Fetch a page of normal predictions
    const fetchPage = async (pageNumber) => {
        pageNumber === 1 ? setInitialLoading(true) : setLoading(true);
        try {
            const data = await PredictionsApi.getPredictions(selectedFile, selectedSheet, pageNumber, pageSize);

            const preview = data.preview || [];
            if (preview.length === 0 && pageNumber === 1) {
                setPreviewData([]);
                setPreviewColumns([]);
                setTotalPages(1);
                return;
            }

            const columns = data.columns || (preview.length > 0 ? Object.keys(preview[0]) : []);
            setPreviewColumns(columns);

            setPreviewData((prev) =>
                pageNumber === 1 ? preview : [...prev, ...preview]
            );

            setTotalPages(data.total_pages || 1);
        } catch (err) {
            console.error("Error fetching predictions:", err);
            if (pageNumber === 1) setPreviewData([]);
        } finally {
            pageNumber === 1 ? setInitialLoading(false) : setLoading(false);
        }
    };


    // Fetch a page of search results
    const fetchSearchPage = async (pageNumber) => {
        pageNumber === 1 ? setInitialLoading(true) : setLoading(true);
        try {
            const data = await PredictionsApi.getPredictionsBySearch(
                selectedFile,
                selectedSheet,
                searchTerm,
                pageNumber,
                pageSize
            );

            const preview = data.preview || [];
            if (preview.length === 0 && pageNumber === 1) {
                setPreviewData([]);
                setPreviewColumns([]);
                setTotalPages(1);
                return;
            }

            const columns = data.columns || (preview.length > 0 ? Object.keys(preview[0]) : []);
            setPreviewColumns(columns);

            setPreviewData((prev) =>
                pageNumber === 1 ? preview : [...prev, ...preview]
            );

            setTotalPages(data.total_pages || 1);
        } catch (err) {
            console.error("Error fetching search results:", err);
            if (pageNumber === 1) setPreviewData([]);
        } finally {
            pageNumber === 1 ? setInitialLoading(false) : setLoading(false);
        }
    };


    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        setSearchActive(true);
        setPreviewData([]);
        setPage(1);
        fetchSearchPage(1);
    };

    useEffect(() => {
        if (!searchTerm && searchActive) {
            // search bar cleared
            setSearchActive(false);
            setPreviewData([]);
            setPage(1);
        }
    }, [searchTerm, searchActive]);

    // Initial load when file/sheet changes
    useEffect(() => {
        if (!selectedFile || !selectedSheet) return;
        setPreviewData([]);
        setPage(1);
        searchActive ? fetchSearchPage(1) : fetchPage(1);
    }, [selectedFile, selectedSheet, searchActive]);

    // Infinite scroll observer
    useEffect(() => {
        if (!loaderRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && page < totalPages && !loading) {
                    setPage((prev) => prev + 1);
                }
            },
            { root: null, rootMargin: "100px", threshold: 0.1 }
        );

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [loaderRef, page, totalPages, loading]);

    // Fetch next page whenever `page` changes
    useEffect(() => {
        if (page === 1) return; // already fetched in initial load
        searchActive ? fetchSearchPage(page) : fetchPage(page);
    }, [page]);

    const handleDownload = async () => {
        try {
            const response = await PredictionsApi.downloadPredictions(selectedFile, selectedSheet);

            // Check if the response is successful
            if (response.status === 200) {
                // Create a Blob from the response data
                const blob = response.data;

                // Create a URL for the Blob object
                const url = window.URL.createObjectURL(blob);

                // Create an invisible anchor element
                const a = document.createElement("a");

                // Set the href to the URL created for the Blob
                a.href = url;

                // Set the download filename
                a.download = "predictions.xlsx";

                // Append anchor to the body and simulate a click
                document.body.appendChild(a);
                a.click();

                // Remove the anchor after the click
                a.remove();

                // Clean up the URL object after download
                window.URL.revokeObjectURL(url);
            } else {
                console.error("Failed to download the file");
            }
        } catch (error) {
            console.error("Error downloading the file", error);
        }
    };


    if (!selectedFile || !selectedSheet) return null;

    return (
        <div className="predictions-preview-container">
            <h2>Predictions Preview</h2>

            <div className="predictions-preview-header">
                <p>
                    Showing predictions for <strong>{selectedFile}</strong>, sheet <strong>{selectedSheet}</strong>.
                </p>

                <div className="predictions-preview-header-right">
                    <div className="preview-search-wrapper">
                        <div className="search-input-container">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="preview-search-bar"
                            />
                        </div>
                        <button
                            className="preview-search-button"
                            onClick={handleSearch}
                            disabled={!searchTerm.trim()}
                        >
                            Search
                        </button>
                    </div>

                     {/* Download Button */}
                    <button className="download-button" onClick={handleDownload}>
                        Download
                    </button>
                </div>
            </div>

            {initialLoading ? (
                <p>Loading predictions...</p>
            ) : previewData.length === 0 ? (
                <p>No predictions found</p>
            ) : (
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

                    <div ref={loaderRef} style={{ height: "1px" }}></div>
                    {loading && <p>Loading more predictions...</p>}
                </div>
            )}
        </div>
    );
}
