// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Welcome to the Churn Predictor Tool</h1>
        <p>
          Explore customer data, generate predictions, and visualize insights effortlessly.
        </p>
      </header>

      <section className="home-features">
        <div className="feature-card">
          <h2>Upload Data</h2>
          <p>
            Easily upload your customer datasets and start analyzing immediately.
          </p>
          <Link to="/upload" className="home-button">Go to Upload</Link>
        </div>

      </section>
    </div>
  );
};

export default Home;
