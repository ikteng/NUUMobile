import axios from "axios";

const API_URL = "http://localhost:5001"; // your Flask backend

export const DashboardApi = {
    // ----------------------------
    // Files
    // ----------------------------

    // Get list of uploaded files
    getFiles: async () => {
        const response = await axios.get(`${API_URL}/get_files`);
        return response.data.files;
    },

    // Delete a file
    deleteFile: async (file) => {
        const response = await axios.delete(`${API_URL}/delete_file/${file}`);
        return response.data;
    },

    // ----------------------------
    // Sheets
    // ----------------------------

    // Get sheets of a specific file
    getSheets: async (file) => {
        const response = await axios.get(`${API_URL}/get_sheets/${file}`);
        return response.data.sheets || [];
    },

    // Get data from a specific sheet of a specific file
    getSheetData: async (file, sheet, page = 1, pageSize = 20) => {
        const response = await axios.get(`${API_URL}/get_sheets_data/${file}/${sheet}`, {
            params: { page, page_size: pageSize }
        });
        return response.data;
    },

    getSheetDataBySearch: async (file, sheet, searchTerm, page = 1, pageSize = 20) => {
        const response = await axios.get(`${API_URL}/get_sheets_data/${file}/${sheet}/search`, {
            params: { search: searchTerm, page, page_size: pageSize }
        });
        return response.data;
    },

    // ----------------------------
    // Columns
    // ----------------------------
    getAllColumns: async (file, sheet) => {
        const response = await axios.get(
        `${API_URL}/get_all_columns/${file}/${sheet}`
        );
        return response.data.columns || [];
    },

    getColumnData: async (file, sheet, column) => {
        const response = await axios.get(
        `${API_URL}/get_column_data/${file}/${sheet}/${column}`
        );
        return response.data;
    },
        
}