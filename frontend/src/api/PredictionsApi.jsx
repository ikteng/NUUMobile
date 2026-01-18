import axios from "axios";

const API_URL = "http://localhost:5001";

export const PredictionsApi = {
    getPredictions: async (file, sheet, page = 1, pageSize = 20, searchTerm = "") => {
        const response = await axios.get(`${API_URL}/predict_churn/${file}/${sheet}`, {
            params: { page, page_size: pageSize, search: searchTerm }
        });
        return response.data;
    },

    downloadPredictions: async (file, sheet) => {
        const response = await axios.get(`${API_URL}/download_predictions/${file}/${sheet}`, {
            responseType: 'blob',
        });
        return response;
    },

    getPredictionsStats: async (file, sheet) => {
        const response = await axios.get(`${API_URL}/predictions_stats/${file}/${sheet}`);
        return response.data;
    },

    getSheetAccuracy: async (file, sheet) => {
        const response = await axios.get(`${API_URL}/model_accuracy/${file}/${sheet}`);
        return response.data;
    },

    getFeatureImportance: async () => {
        const response = await axios.get(`${API_URL}/feature_importance`);
        return response.data;
    },

    getTrainingMetrics: async () => {
        const response = await axios.get(`${API_URL}/model_training_metrics`);
        return response.data;
    },

}