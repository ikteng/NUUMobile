import axios from "axios";

const API_URL = "http://localhost:5001";

export const PredictionsApi = {
    getPredictions: async (file, sheet, page = 1, pageSize = 20) => {
        const response = await axios.get(`${API_URL}/predict_churn/${file}/${sheet}`, {
            params: { page, page_size: pageSize }
        });
        return response.data;
    },

    getPredictionsBySearch: async (file, sheet, searchTerm, page = 1, pageSize = 20) => {
        const response = await axios.get(`${API_URL}/predict_churn/${file}/${sheet}/search`, {
            params: { search: searchTerm, page, page_size: pageSize }
        });
        return response.data;
    },

}