// client/src/pages/ArticleOrCategoryPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ArticleDetailPage from './ArticleDetailPage';
import ArticlesListPage from './ArticlesListPage'; // Đổi import thành file chính
import './ArticlesListPage.css';

const ArticleOrCategoryPage = ({ type }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchContent();
  }, [slug, type]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/articles/${type}/${slug}`);
      if (response.data.success) {
        setContent(response.data.data);
        setContentType(response.data.type);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      if (error.response?.status === 404) navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="article-list-loading">
        <div className="article-list-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (contentType === 'article') {
    return <ArticleDetailPage article={content} categoryType={type} />;
  }

  if (contentType === 'category') {
    // Map type URL ('tin-tuc') sang type Database ('tin_tuc')
    const typeMap = { 'tin-tuc': 'tin_tuc', 'thuoc': 'thuoc', 'benh-ly': 'benh_ly' };
    const dbType = typeMap[type] || null;
    
    // TRẢ VỀ TRANG ARTICLES LIST CHÍNH KÈM THÔNG TIN DANH MỤC
    return <ArticlesListPage type={dbType} categoryData={content} />;
  }

  return null;
};

export default ArticleOrCategoryPage;