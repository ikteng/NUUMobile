import axios from "axios";

const API_URL = "http://localhost:5001"; // your Flask backend

export const DashboardApi = {
    // Get list of uploaded files
    getFiles: async () => {
        const response = await axios.get(`${API_URL}/get_files`);
        return response.data.files;
    },

    // Get sheets of a specific file
    getSheets: async (filename) => {
        const response = await axios.get(`${API_URL}/get_sheets/${filename}`);
        return response.data.sheets || [];
    },

    // Get data from a specific sheet of a specific file
    getSheetData: async (filename, sheet, rows = 3) => {
        const response = await axios.get(`${API_URL}/get_sheets/${filename}/${sheet}`, {
            params: { rows },
        });
        return response.data;
    },

    // Delete a file
    deleteFile: async (filename) => {
        const response = await axios.delete(`${API_URL}/delete_file/${filename}`);
        return response.data;
    },
}