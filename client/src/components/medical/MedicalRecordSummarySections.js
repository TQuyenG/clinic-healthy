import React from 'react';
import {
  FaUserInjured, FaUserMd, FaCalendarAlt, FaNotesMedical,
  FaFileMedical, FaFilePrescription, FaDownload,
  FaFileImage, FaFilePdf, FaFileWord, FaStethoscope,
  FaHeartbeat, FaClipboardList
} from 'react-icons/fa';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

const fileIcon = (name = '') => {
  const extension = String(name).split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return FaFileImage;
  if (extension === 'pdf') return FaFilePdf;
  if (['doc', 'docx'].includes(extension)) return FaFileWord;
  return FaFileMedical;
};

const renderFileItem = (file, index, fileUrl) => {
  const name = file?.originalname || file?.name || `file-${index + 1}`;
  const source = file?.source ? ` • ${file.source}` : '';
  const href = file?.url && typeof fileUrl === 'function' ? fileUrl(file.url) : (file?.url || null);
  const Icon = fileIcon(name);
  const isImage = String(name).toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);

  const content = (
    <>
      {isImage ? (
        href ? <img src={href} alt={name} className="mrvp-file-thumb" /> : <FaFileImage />
      ) : (
        <Icon />
      )}
      <span className="mrvp-file-name" title={name}>{name}{source}</span>
      {href ? <FaDownload className="mrvp-file-dl" /> : null}
    </>
  );

  if (href) {
    return (
      <a key={index} href={href} className="mrvp-file-item" target="_blank" rel="noopener noreferrer" download={name}>
        {content}
      </a>
    );
  }

  return (
    <div key={index} className="mrvp-file-item">
      {content}
    </div>
  );
};

const renderLinkBadge = (item) => {
  const linkedCode = item?.linked_appointment_code || item?.appointment_code || item?.code || null;
  const mode = item?.mode || item?.type || null;
  if (!linkedCode && !mode) return null;

  return (
    <div className="mrvp-service-linkline">
      {linkedCode && <span className="mrvp-service-linkcode">#{linkedCode}</span>}
      {mode && <span className="mrvp-service-linkmode">{mode === 'immediate' ? 'Làm ngay' : 'Đặt lịch'}</span>}
    </div>
  );
};

const MedicalRecordSummarySections = ({
  record,
  patientName,
  patientPhone,
  patientEmail,
  doctorName,
  doctorPhone,
  doctorEmail,
  serviceName,
  fileUrl,
  showFileLinks = true,
}) => {
  const prescriptionList = normalizeList(record?.prescription_json);
  const testImages = normalizeList(record?.test_images_json);
  const reportFiles = normalizeList(record?.report_files_json);
  const serviceIndications = normalizeList(record?.service_indications);
  const vitals = record?.vitals_json || {};

  const name = patientName || record?.patient_name || record?.Appointment?.patient_name || record?.Patient?.User?.full_name || record?.Appointment?.guest_name || 'N/A';
  const phone = patientPhone || record?.patient_phone || record?.Appointment?.patient_phone || record?.Patient?.User?.phone || record?.Appointment?.guest_phone || 'N/A';
  const doctor = doctorName || record?.doctor_name || record?.Doctor?.user?.full_name || record?.Appointment?.Doctor?.user?.full_name || 'N/A';
  const pEmail = patientEmail || record?.patient_email || record?.Patient?.User?.email || record?.Appointment?.guest_email || '';
  const dPhone = doctorPhone || record?.doctor_phone || record?.Doctor?.user?.phone || record?.Appointment?.Doctor?.user?.phone || '';
  const dEmail = doctorEmail || record?.doctor_email || record?.Doctor?.user?.email || '';
  const svcName = serviceName || record?.service_name || record?.Appointment?.service_name || '';
  const serviceDate = formatDate(record?.Appointment?.appointment_date || record?.created_at);

  return (
    <div className="mrvp-summary-shell">
      <div className="mrvp-meta-strip mrvp-summary-header">
        <div className="mrvp-meta-card">
          <span className="mrvp-iconbox mrvp-iconbox--md mrvp-iconbox--green">
            <FaUserInjured />
          </span>
          <div className="mrvp-meta-texts">
            <span className="mrvp-meta-lbl">Bệnh nhân</span>
            <span className="mrvp-meta-val">{name}</span>
            <small className="mrvp-meta-sub">
              {phone}
              {pEmail ? ` • ${pEmail}` : ''}
            </small>
          </div>
        </div>
        <div className="mrvp-meta-card">
          <span className="mrvp-iconbox mrvp-iconbox--md mrvp-iconbox--blue">
            <FaUserMd />
          </span>
          <div className="mrvp-meta-texts">
            <span className="mrvp-meta-lbl">Bác sĩ phụ trách</span>
            <span className="mrvp-meta-val">{doctor}</span>
            {dPhone ? <small className="mrvp-meta-sub">{dPhone}{dEmail ? ` • ${dEmail}` : ''}</small> : (dEmail ? <small className="mrvp-meta-sub">{dEmail}</small> : null)}
          </div>
        </div>
        <div className="mrvp-meta-card">
          <span className="mrvp-iconbox mrvp-iconbox--md mrvp-iconbox--amber">
            <FaClipboardList />
          </span>
          <div className="mrvp-meta-texts">
            <span className="mrvp-meta-lbl">Dịch vụ</span>
            <span className="mrvp-meta-val">{svcName || 'N/A'}</span>
            <small className="mrvp-meta-sub">{serviceDate}</small>
          </div>
        </div>
      </div>

      <div className="mrvp-record-grid">
        <div className="mrvp-record-col mrvp-record-col--left">
          <div className="mrvp-card">
            <div className="mrvp-diag-block">
              <div className="mrvp-diag-lbl"><FaStethoscope /> Chẩn đoán</div>
              <p className="mrvp-diag-text">{record?.diagnosis || 'Không có chẩn đoán.'}</p>
            </div>
            {[
              { label: 'Triệu chứng', text: record?.symptoms },
              { label: 'Kế hoạch điều trị', text: record?.treatment_plan },
              { label: 'Lời khuyên bác sĩ', text: record?.advice },
              { label: 'Ghi chú lâm sàng', text: record?.clinical_note },
            ].map(({ label, text }) => (
              <div key={label} className="mrvp-rec-row">
                <div className="mrvp-rec-row-lbl">{label}</div>
                <p className="mrvp-rec-row-text">{text || 'Không có thông tin.'}</p>
              </div>
            ))}
          </div>

          {Object.keys(vitals || {}).length > 0 && (
            <div className="mrvp-card">
              <div className="mrvp-card-head">
                <FaHeartbeat />
                <span className="mrvp-card-head-title">Chỉ số theo dõi</span>
              </div>
              <div className="mrvp-rec-row"><div className="mrvp-rec-row-lbl">Huyết áp</div><p className="mrvp-rec-row-text">{vitals.blood_pressure || 'Không có thông tin.'}</p></div>
              <div className="mrvp-rec-row"><div className="mrvp-rec-row-lbl">Mạch</div><p className="mrvp-rec-row-text">{vitals.pulse || vitals.heart_rate || 'Không có thông tin.'}</p></div>
              <div className="mrvp-rec-row"><div className="mrvp-rec-row-lbl">Nhiệt độ</div><p className="mrvp-rec-row-text">{vitals.temperature || 'Không có thông tin.'}</p></div>
              <div className="mrvp-rec-row"><div className="mrvp-rec-row-lbl">Cân nặng / Chiều cao</div><p className="mrvp-rec-row-text">{vitals.weight || '—'} / {vitals.height || '—'}</p></div>
              <div className="mrvp-rec-row"><div className="mrvp-rec-row-lbl">Nhịp thở</div><p className="mrvp-rec-row-text">{vitals.respiratory_rate || vitals.spo2 || 'Không có thông tin.'}</p></div>
            </div>
          )}

          <div className="mrvp-card">
            <div className="mrvp-rec-row">
              <div className="mrvp-rec-row-lbl">Ngày tái khám</div>
              <p className="mrvp-rec-row-text">{record?.follow_up_date ? formatDate(record.follow_up_date) : 'Không có thông tin.'}</p>
            </div>
            {record?.follow_up_date && (
              <div className="mrvp-followup-row">
                <FaCalendarAlt />
                <strong>Tái khám:</strong>&nbsp;{formatDate(record.follow_up_date)}
              </div>
            )}
          </div>
        </div>

        <div className="mrvp-record-col mrvp-record-col--right">
          {prescriptionList.length > 0 && (
          <div className="mrvp-card">
            <div className="mrvp-card-head">
              <FaFilePrescription />
              <span className="mrvp-card-head-title">Đơn thuốc</span>
            </div>
            <table className="mrvp-rx-table">
              <thead>
                <tr>
                  <th>Tên thuốc</th><th>SL</th><th>Liều dùng</th><th>Hướng dẫn</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionList.map((item, index) => (
                  <tr key={index}>
                    <td data-label="Thuốc">{item.name}</td>
                    <td data-label="SL">{item.quantity}</td>
                    <td data-label="Liều">{item.dosage}</td>
                    <td data-label="HD">{item.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {serviceIndications.length > 0 && (
            <div className="mrvp-card">
            <div className="mrvp-card-head">
              <FaClipboardList />
              <span className="mrvp-card-head-title">Dịch vụ phụ / lịch hẹn bổ sung</span>
            </div>
            <table className="mrvp-rx-table">
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th>Trạng thái</th>
                  <th>STT</th>
                </tr>
              </thead>
              <tbody>
                {serviceIndications.map((item, index) => (
                  <tr key={item.id || index}>
                    <td data-label="Dịch vụ">
                      <div className="mrvp-service-linktitle">{item.service_name || item.name || 'Dịch vụ'}</div>
                      {renderLinkBadge(item)}
                    </td>
                    <td data-label="Trạng thái">{item.status || '—'}</td>
                    <td data-label="STT">{item.queue_number || item.display_queue || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {(testImages.length > 0 || reportFiles.length > 0) && (
        <div className="mrvp-card mrvp-attachments-card">
            <div className="mrvp-card-head">
              <FaFileMedical />
              <span className="mrvp-card-head-title">Tài liệu đính kèm</span>
            </div>
            {testImages.length > 0 && (
              <div className="mrvp-file-group">
                <div className="mrvp-file-group-title"><FaFileImage /> Ảnh xét nghiệm</div>
                <div className="mrvp-file-list">
                  {testImages.map((file, index) => renderFileItem(file, index, showFileLinks ? fileUrl : null))}
                </div>
              </div>
            )}
            {reportFiles.length > 0 && (
              <div className="mrvp-file-group">
                <div className="mrvp-file-group-title"><FaFilePdf /> File báo cáo</div>
                <div className="mrvp-file-list">
                  {reportFiles.map((file, index) => renderFileItem(file, index, showFileLinks ? fileUrl : null))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default MedicalRecordSummarySections;
