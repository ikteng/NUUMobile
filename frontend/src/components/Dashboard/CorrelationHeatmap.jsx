import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { DashboardApi } from '../../api/DashboardApi';

export default function CorrelationHeatmap({ selectedFile, selectedSheet }) {
    const [plotData, setPlotData] = useState(null);

    useEffect(() => {
        if (selectedFile && selectedSheet) fetchCorrelationMatrix();
    }, [selectedFile, selectedSheet]);

    const fetchCorrelationMatrix = async () => {
        try {
            const data = await DashboardApi.getCorrelationHeatmap(selectedFile, selectedSheet);
            setPlotData(data.plotly_json);
        } catch (err) {
            console.error("Error fetching correlation matrix:", err);
            setPlotData(null);
        }
    };

    if (!plotData) return <p>Loading correlation heatmap...</p>;

    return (
        <>
            <h2>Correlation Heatmap</h2>
            <div style={{ width: '100%', height: '600px' }}>
                <Plot
                    data={plotData.data}
                    layout={plotData.layout}
                    config={{ responsive: true }}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </>
    );
}
