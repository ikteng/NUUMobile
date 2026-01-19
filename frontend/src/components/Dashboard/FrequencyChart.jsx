import React, { useEffect, useState } from 'react';
import { DashboardApi } from '../../api/DashboardApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './FrequencyChart.css';

export default function ColumnChart ({ selectedFile, selectedSheet }) {
  const [columns, setColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState('');
  const [showMissing, setShowMissing] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch column names for the selected file and sheet
  useEffect(() => {
    if (!selectedFile || !selectedSheet) return;

    DashboardApi.getAllColumns(selectedFile, selectedSheet)
      .then(setColumns)
      .catch(() => setColumns([]));
  }, [selectedFile, selectedSheet]);


  // Fetch value counts for the selected column
  useEffect(() => {
    if (!selectedColumn) return;

    setLoading(true);
    DashboardApi.getColumnFrequency(selectedFile, selectedSheet, selectedColumn)
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setChartData([]);
        } else {
          setChartData(data.frequency);
          setError("");
        }
      })
      .catch(() => {
        setError("Failed to fetch column data.");
        setChartData([]);
      })
      .finally(() => setLoading(false));
  }, [selectedColumn, selectedFile, selectedSheet]);

  useEffect(() => {
    setSelectedColumn('');
    setChartData([]);
    setError('');
    setLoading(false);
  }, [selectedFile, selectedSheet]);

  // Filter chart data based on "showMissing"
  const filteredChartData = showMissing
    ? chartData
    : Object.fromEntries(
        Object.entries(chartData).filter(([k]) => k.toLowerCase() !== 'missing')
      );
      
  const MAX_DISPLAY = 10;

  // Convert filteredChartData to an array of [key, count]
  const entries = Object.entries(filteredChartData)
    .map(([k, v]) => [k, Number(v)])
    .sort((a, b) => b[1] - a[1]); // descending

  // Determine the Nth largest count
  let threshold = 0;
  if (entries.length > MAX_DISPLAY) {
    threshold = entries[MAX_DISPLAY - 1][1]; // count of the Nth item
  }

  // Include all items with count >= threshold
  const chartDataArray = [];
  let otherSum = 0;

  entries.forEach(([key, count]) => {
    if (count >= threshold) {
      chartDataArray.push({ data: key, count });
    } else {
      otherSum += count;
    }
  });

  if (otherSum > 0) {
    chartDataArray.push({ data: "Other", count: otherSum });
  }

  // Function to get the highest
  const getHighest = (chartData) => {
    const entries = Object.entries(chartData)
      .map(([k, v]) => [k, Number(v)])
      .filter(([k, v]) => !isNaN(v));

    if (!entries.length) return ["undefined"];

    const maxCount = Math.max(...entries.map(([k, v]) => v));
    return entries.filter(([k, v]) => v === maxCount).map(([k]) => k);
  };

  // Function to get the lowest
  const getLowest = (chartData) => {
    const entries = Object.entries(chartData)
      .map(([k, v]) => [k, Number(v)])
      .filter(([k, v]) => !isNaN(v));

    if (!entries.length) return ["undefined"];

    const minCount = Math.min(...entries.map(([k, v]) => v));
    return entries.filter(([k, v]) => v === minCount).map(([k]) => k);
  };

  const formatTiedList = (list, max = 2) => {
    if (list.length <= max + 1) return list.join(', ');
    const firstItems = list.slice(0, max);
    const lastItem = list[list.length - 1];
    return `${firstItems.join(', ')}, ..., ${lastItem}`;
  };

  return (
    <div className="dashboard-chart-container">
        <p>Select a Column to Visualize its Value Counts</p>

        <div className="chart-header">

          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="dropdown"
          >
            <option value="">-- Select a Column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          
          <label className="missing-checkbox">
            <input
              type="checkbox"
              checked={showMissing}
              onChange={() => setShowMissing(!showMissing)}
            />
            Show Missing
          </label>
        </div>
      
      {error && <p className="error-message">{error}</p>}
      
      {filteredChartData && Object.keys(filteredChartData).length > 0 ? (
        <div>
          <div className="summary-graph">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartDataArray}>
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="column-stats">
            <div className="stat-card highest">
              <p>
                <strong>Highest {selectedColumn}:</strong>
              </p>
              <p className="stat-values">{formatTiedList(getHighest(filteredChartData))}</p>
            </div>
            
            <div className="stat-card lowest">
              <p>
                <strong>Lowest {selectedColumn}:</strong>
              </p>
              <p className="stat-values">{formatTiedList(getLowest(filteredChartData))}</p>
            </div>
          </div>

        </div>
      ) : selectedColumn ? (
        loading ? (
          <p>Loading graph for {selectedColumn}...</p>
        ) : (
          <p>No data to display for {selectedColumn}.</p>
        )
      ) : null }
      
    </div>
  );
};
