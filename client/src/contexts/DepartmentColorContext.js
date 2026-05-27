// client/src/contexts/DepartmentColorContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';

const DepartmentColorContext = createContext();

export const useDepartmentColors = () => {
  const context = useContext(DepartmentColorContext);
  if (!context) {
    throw new Error('useDepartmentColors must be used within DepartmentColorProvider');
  }
  return context;
};

export const DepartmentColorProvider = ({ children }) => {
  const [departmentColors, setDepartmentColors] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('departmentColors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading department colors:', e);
      }
    }
    
    // Default colors
    return {
      BGD: '#FF9800',
      clinical: '#4CAF50',
      system: '#2196F3',
      support: '#9C27B0',
      finance: '#F44336',
      content: '#00BCD4'
    };
  });

  // Save to localStorage whenever colors change
  useEffect(() => {
    localStorage.setItem('departmentColors', JSON.stringify(departmentColors));
  }, [departmentColors]);

  const updateDepartmentColor = (deptCode, color) => {
    setDepartmentColors(prev => ({
      ...prev,
      [deptCode]: color
    }));
  };

  const getDepartmentColor = (deptCode) => {
    return departmentColors[deptCode] || '#757575';
  };

  const resetToDefaults = () => {
    const defaults = {
      BGD: '#FF9800',
      clinical: '#4CAF50',
      system: '#2196F3',
      support: '#9C27B0',
      finance: '#F44336',
      content: '#00BCD4'
    };
    setDepartmentColors(defaults);
  };

  return (
    <DepartmentColorContext.Provider 
      value={{ 
        departmentColors, 
        updateDepartmentColor, 
        getDepartmentColor,
        resetToDefaults
      }}
    >
      {children}
    </DepartmentColorContext.Provider>
  );
};
