// client/src/components/common/Header.js
import React, { useState, useEffect } from 'react';
import { FaPhone, FaEnvelope, FaClock } from 'react-icons/fa';
import axios from 'axios';
import './Header.css';

const API_BASE_URL = 'http://localhost:3001/api';

const Header = () => {
  const [headerData, setHeaderData] = useState({
    phone: '1900 1234',
    email: 'contact@easymedify.vn',
    working_hours: 'T2-T7: 7:00-20:00 | CN: 8:00-17:00',
    welcome_text: 'Chào mừng bạn đến với Easy Medify'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/header-nav-footer`);
        if (response.data && response.data.header) {
          setHeaderData(response.data.header);
        }
      } catch (error) {
        console.error('Error fetching header data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaderData();
  }, []);

  return (
    <header className="header-component">
      <div className="header-component__container">
        <div className="header-component__info">
          <div className="header-component__item">
            <FaPhone className="header-component__icon" />
            <span className="header-component__text">{headerData.phone}</span>
          </div>
          <div className="header-component__item">
            <FaEnvelope className="header-component__icon" />
            <span className="header-component__text">{headerData.email}</span>
          </div>
          <div className="header-component__item">
            <FaClock className="header-component__icon" />
            <span className="header-component__text">{headerData.working_hours}</span>
          </div>
        </div>
        <div className="header-component__welcome">
          <span className="header-component__welcome-text">{headerData.welcome_text}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;