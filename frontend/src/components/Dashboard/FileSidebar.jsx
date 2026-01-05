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
}) => {
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
                className={`file-name ${selectedFile === file ? "active" : ""}`}
                onClick={() => onToggleFile(file)}
              >
                {expandedFiles[file] ? "▾" : "▸"} {file}
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
    </div>
  );
};

export default FileSidebar;
