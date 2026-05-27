// Path: client/src/components/consultation/RefundManagement.js
// ============================================================================

import React, { useState, useEffect } from 'react';
import consultationService from '../../services/consultationService';
import { FaMoneyBillWave, FaCheckCircle, FaSpinner } from 'react-icons/fa';

export const RefundManagement = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await consultationService.getRefundList();
      if (response.data.success) {
        setRefunds(response.data.data.refunds);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRefund = async (consultationId, amount) => {
    if (!window.confirm(`Xác nhận hoàn tiền ${amount.toLocaleString()}đ?`)) return;

    try {
      setProcessing(consultationId);
      await consultationService.processRefund(consultationId, {
        refund_amount: amount,
        refund_reason: 'Admin xử lý hoàn tiền'
      });
      alert('Hoàn tiền thành công');
      fetchRefunds();
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Lỗi khi hoàn tiền');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="refund-management">
      <div className="refund-header">
        <h3><FaMoneyBillWave /> Quản lý hoàn tiền</h3>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <div className="refunds-table-container">
          <table className="refunds-table">
            <thead>
              <tr>
                <th>Mã tư vấn</th>
                <th>Bệnh nhân</th>
                <th>Bác sĩ</th>
                <th>Số tiền</th>
                <th>Lý do hủy</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((consultation) => (
                <tr key={consultation.id}>
                  <td>{consultation.consultation_code}</td>
                  <td>{consultation.patient?.full_name}</td>
                  <td>{consultation.doctor?.full_name}</td>
                  <td className="amount-cell">{consultation.Payment?.amount.toLocaleString()}đ</td>
                  <td>{consultation.metadata?.cancel_reason || 'N/A'}</td>
                  <td>
                    <span className={`refund-status ${consultation.Payment?.status}`}>
                      {consultation.Payment?.status === 'refunded' ? 'Đã hoàn' : 'Chưa hoàn'}
                    </span>
                  </td>
                  <td>
                    {consultation.Payment?.status !== 'refunded' ? (
                      <button 
                        className="btn-process-refund"
                        onClick={() => processRefund(consultation.id, consultation.Payment?.amount)}
                        disabled={processing === consultation.id}
                      >
                        {processing === consultation.id ? (
                          <><FaSpinner className="spin" /> Đang xử lý</>
                        ) : (
                          <><FaCheckCircle /> Xử lý hoàn tiền</>
                        )}
                      </button>
                    ) : (
                      <span className="refunded-label">Đã hoàn tiền</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
