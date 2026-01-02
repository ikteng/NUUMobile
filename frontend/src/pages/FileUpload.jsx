import React, { useState, useEffect } from 'react';
import './FileUpload.css';

function FileUpload() {
  useEffect(() => {
    document.title = 'Upload - Churn Predictor';

    // Prevent browser from opening files when dropped outside drop zone
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState('');

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length === 0) return;

    // Here you would call your backend API to upload files
    // Example: await uploadFiles(files);

    // Show notification
    setNotification(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully!`);

    // Clear selected files
    setFiles([]);

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1>Upload Customer Data</h1>
        <p className="subtitle">
          Upload Excel or CSV files for churn analysis.
        </p>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>Drag & drop files here</p>
          <p className="or">or</p>

          <input
            type="file"
            multiple
            accept=".xls,.xlsx,.csv"
            id="file-input"
            className="file-input"
            onChange={handleFileChange}
          />

          <label htmlFor="file-input" className="upload-btn">
            Select Files
          </label>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <span>{file.name}</span>
                <button onClick={() => removeFile(index)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button
          className="confirm-upload-btn"
          disabled={files.length === 0}
          onClick={handleUpload}
        >
          Upload {files.length} File{files.length !== 1 && 's'}
        </button>
      </div>
      
      {/* Notification Box */}
      {notification && (
        <div className="notification-box">
          {notification}
        </div>
      )}

    </div>
  );
}

export default FileUpload;
