import React, { createContext, useContext, useState } from 'react';

export const CallQueueContext = createContext(null);

export const useCallQueue = () => {
  const ctx = useContext(CallQueueContext);
  if (!ctx) throw new Error('useCallQueue must be used within CallQueueProvider');
  return ctx;
};

export const CallQueueProvider = ({ children }) => {
  const [calling, setCalling] = useState(false);
  const [calledTicket, setCalledTicket] = useState(null);

  const value = {
    calling,
    setCalling,
    calledTicket,
    setCalledTicket
  };

  return (
    <CallQueueContext.Provider value={value}>
      {children}
    </CallQueueContext.Provider>
  );
};
