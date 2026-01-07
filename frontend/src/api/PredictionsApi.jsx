import axios from "axios";

const API_URL = "http://localhost:5001";

export const PredictionsApi = {
    getPredictions: async (file, sheet) => {
        const response = await axios.get(`${API_URL}/predict_churn/${file}/${sheet}`);
        return response.data;
    },
}