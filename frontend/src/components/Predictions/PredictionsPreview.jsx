import React, { useState, useEffect, useRef } from "react";
import { PredictionsApi } from "../../api/PredictionsApi";
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CircularProgress from '@mui/material/CircularProgress';
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
  const [downloading, setDownloading] = useState(false);

  const loaderRef = useRef(null);

  // Fetch Data
  const fetchData = async (pageNumber = 1) => {
    pageNumber === 1 ? setInitialLoading(true) : setLoading(true);
    try {
      const data = await PredictionsApi.getPredictions(
        selectedFile,
        selectedSheet,
        pageNumber,
        pageSize,
        searchTerm
      );

      const preview = data.preview || [];
      const columns = data.columns || (preview.length > 0 ? Object.keys(preview[0]) : []);

      setPreviewColumns(columns);
      setPreviewData((prev) => (pageNumber === 1 ? preview : [...prev, ...preview]));
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error("Error fetching predictions:", err);
      if (pageNumber === 1) setPreviewData([]);
    } finally {
      pageNumber === 1 ? setInitialLoading(false) : setLoading(false);
    }
  };

  const handleSearch = () => {
    setPreviewData([]);
    setPage(1);
    fetchData(1);
  };

  // Reset search when cleared
  useEffect(() => {
    if (!searchTerm && previewData.length > 0) {
      setPreviewData([]);
      setPage(1);
      fetchData(1);
    }
  }, [searchTerm]);

  // Initial load when file/sheet changes
  useEffect(() => {
    if (!selectedFile || !selectedSheet) return;
    setPreviewData([]);
    setPage(1);
    fetchData(1);
  }, [selectedFile, selectedSheet]);

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

  // Fetch next page
  useEffect(() => {
    if (page === 1) return; // already fetched
    fetchData(page);
  }, [page]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await PredictionsApi.downloadPredictions(selectedFile, selectedSheet);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "predictions.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading predictions:", error);
    } finally {
      setDownloading(false);
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
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="preview-search-bar"
            />
            <button
              className="preview-search-button"
              onClick={handleSearch}
              disabled={!searchTerm.trim() || initialLoading}
            >
              {initialLoading ? (
                <CircularProgress color="inherit" size={16} />
              ) : (
                <SearchIcon />
              )}
            </button>

          </div>

          <button className="download-button" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <CircularProgress color="inherit" size={16} />
            ) : (
              <DownloadIcon />
            )}
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
