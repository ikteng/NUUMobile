import axios from "axios";

const API_URL = "http://localhost:5001"; // your Flask backend

export const FileUploadApi = {
    // Upload files
    upload: async (files) => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        });

        return response.data;
    },
};
