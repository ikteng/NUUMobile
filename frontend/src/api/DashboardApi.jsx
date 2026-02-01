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
    getSheetData: async (file, sheet, page = 1, pageSize = 20, searchTerm = "") => {
        const response = await axios.get(`${API_URL}/get_sheets_data/${file}/${sheet}`, {
            params: { page, page_size: pageSize, search: searchTerm }
        });
        return response.data;
    },

    askAiAboutSheet: async (file, sheet, question) => {
        const response = await fetch(
            `${API_URL}/ask_ai_about_sheet/${file}/${sheet}`,
            {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
            }
        );
        return response.json();
    },

    loadAiChatHistory: async (file, sheet) => {
        const response = await axios.get(
        `${API_URL}/chat_history/${file}/${sheet}`
        );
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

    getColumnFrequency: async (file, sheet, column) => {
        const response = await axios.get(
        `${API_URL}/get_column_frequency/${file}/${sheet}/${column}`
        );
        return response.data;
    },

    getCorrelationHeatmap: async (file, sheet) => {
        const response = await axios.get(
        `${API_URL}/get_correlation_heatmap/${file}/${sheet}`
        );
        return response.data;
    },

    getDistributionVsChurn: async (file, sheet, column) => {
        const response = await fetch(
            `${API_URL}/get_distribution_vs_churn/${file}/${sheet}/${column}`
        );
        return response.json();
    },

        
}