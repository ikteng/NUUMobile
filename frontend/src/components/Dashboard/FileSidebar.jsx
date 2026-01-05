import React, { useState } from "react";
import { IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { DashboardApi } from "../../api/DashboardApi";
import Modal from "../Modal";
import './FileSidebar.css';

const FileSidebar = ({
  files,
  expandedFiles,
  fileSheets,
  selectedFile,
  selectedSheet,
  onToggleFile,
  onSelectSheet,
  collapsed,
  onToggleCollapse,
  onFileDeleted,
}) => {
  const [fileToDelete, setFileToDelete] = useState(null); // file pending deletion
  const [loadingDelete, setLoadingDelete] = useState(false);

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setLoadingDelete(true);
      await DashboardApi.deleteFile(fileToDelete);
      onFileDeleted(fileToDelete); // notify parent to remove file
      setFileToDelete(null);
    } catch (err) {
      console.error("Error deleting file:", err);
      alert("Failed to delete file. Try again.");
    } finally {
      setLoadingDelete(false);
    }
  };

  const cancelDelete = () => setFileToDelete(null);

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      
     {/* Sidebar header */}
      <div className="sidebar-header">
        {!collapsed && <h1 className="sidebar-title">Uploaded Files</h1>}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label="Toggle sidebar"
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-content">
          {files.map((file) => (
            <div key={file} className="sidebar-file">
              <div
                className={`file-header ${selectedFile === file ? "active" : ""}`}
              >
                <div
                  className="file-name"
                  onClick={() => onToggleFile(file)}
                >
                  <span className="file-arrow">
                    {expandedFiles[file] ? "▾" : "▸"}
                  </span>
                  <span className="file-text">{file}</span>
                </div>

                {/* Delete icon on the right */}
                <IconButton
                  aria-label="Delete file"
                  size="small"
                  onClick={() => setFileToDelete(file)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>

              {expandedFiles[file] && (
                <div className="sheet-list">
                  {(fileSheets[file] || []).map((sheet) => (
                    <div
                      key={sheet}
                      className={`sheet-name ${
                        selectedFile === file && selectedSheet === sheet
                          ? "active"
                          : ""
                      }`}
                      onClick={() => onSelectSheet(file, sheet)}
                    >
                      {sheet}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {fileToDelete && (
        <Modal
          title={`Delete "${fileToDelete}"?`}
          onClose={cancelDelete}
          actions={[
            { label: "Cancel", onClick: cancelDelete, variant: "secondary", disabled: loadingDelete },
            { label: loadingDelete ? "Deleting..." : "Delete", onClick: confirmDelete, variant: "primary", disabled: loadingDelete }
          ]}
        >
          <p>This action cannot be undone.</p>
        </Modal>
      )}

    </div>

  );
};

export default FileSidebar;
