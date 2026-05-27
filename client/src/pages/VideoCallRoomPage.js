// client/src/pages/VideoCallRoomPage.js
// ✅ GIAO DIỆN MỚI - Theme Y Tế Xanh Pastel

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import consultationService from '../services/consultationService';
import videoService from '../services/videoService';
import chatService from '../services/chatService';
import axios from 'axios';
import { 
  FaPhoneSlash, 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash,
  FaDesktop,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimes,
  FaClock,
  FaUserMd,
  FaUser,
  FaWifi,
  FaCheckCircle,
  FaComments,
  FaPaperPlane,
  FaSmile,
  FaPaperclip,
  FaImage,
  FaMagic,
  FaSave, // THÊM MỚI
  FaNotesMedical
} from 'react-icons/fa';
import './VideoCallRoomPage.css';
import InRoomResultPanel from '../components/medical/InRoomResultPanel';

// ============================================
// ✅ COMPONENT MỚI: FORM GHI CHÚ BẮT BUỘC
// ============================================
const DoctorSummaryModal = ({ consultation, onComplete, onCancel }) => {
  const [diagnosis, setDiagnosis] = useState(consultation?.diagnosis || '');
  const [treatmentPlan, setTreatmentPlan] = useState(consultation?.treatment_plan || '');
  const [prescription, setPrescription] = useState(consultation?.prescription_data || '');
  const [notes, setNotes] = useState(consultation?.notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!diagnosis) {
      setError('Vui lòng nhập chẩn đoán.');
      return;
    }
    if (!treatmentPlan) {
      setError('Vui lòng nhập kế hoạch điều trị.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const summaryData = {
        diagnosis,
        treatment_plan: treatmentPlan,
        prescription_data: prescription,
        notes,
      };

      // Gọi API để hoàn thành (từ consultationController)
      await consultationService.completeConsultation(consultation.id, summaryData);
      
      setIsLoading(false);
      onComplete(); // Gọi hàm onComplete (sẽ hangUp cuộc gọi)
    } catch (err) {
      console.error('Lỗi lưu ghi chú:', err);
      setError(err.response?.data?.message || 'Không thể lưu ghi chú. Vui lòng thử lại.');
      setIsLoading(false);
    }
  };

  return (
    <div className="video-call-room-page-summary-modal-overlay">
      <div className="video-call-room-page-summary-modal">
        <div className="video-call-room-page-summary-modal-header">
          <h3><FaNotesMedical /> Kết quả tư vấn</h3>
          <p>Bắt buộc hoàn thành để kết thúc buổi tư vấn.</p>
        </div>
        <div className="video-call-room-page-summary-modal-body">
          {error && (
            <div className="video-call-room-page-summary-error">{error}</div>
          )}
          <div className="video-call-room-page-summary-form-group">
            <label>Chẩn đoán <span className="video-call-room-page-required">*</span></label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Chẩn đoán sơ bộ..."
            />
          </div>
          <div className="video-call-room-page-summary-form-group">
            <label>Kế hoạch điều trị <span className="video-call-room-page-required">*</span></label>
            <textarea
              rows="3"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="Lời khuyên, kế hoạch điều trị..."
            />
          </div>
          <div className="video-call-room-page-summary-form-group">
            <label>Đơn thuốc (Nếu có)</label>
            <textarea
              rows="3"
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="VD: Paracetamol 500mg (2 viên/ngày sau ăn)"
            />
          </div>
          <div className="video-call-room-page-summary-form-group">
            <label>Ghi chú thêm (Nếu có)</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú nội bộ..."
            />
          </div>
        </div>
        <div className="video-call-room-page-summary-modal-actions">
          <button
            className="video-call-room-page-btn video-call-room-page-btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            className="video-call-room-page-btn video-call-room-page-btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu và Hoàn thành'}
          </button>
        </div>
      </div>
    </div>
  );
};

const VideoCallRoomPage = () => {
  const { id: consultationId } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const isDoctorOrAdmin = user.role === 'doctor' || user.role === 'admin';
  
  // State
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callStatus, setCallStatus] = useState('Đang kết nối...');
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, medium, poor
  
  // State điều khiển
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // State Modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // ✅ THÊM: State Chat Box
  const [showChatBox, setShowChatBox] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  // ✅ THÊM: State Emoji Reactions
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const emojiReactions = ['❤️', '👍', '😂', '😮', '👏', '🔥', '🎉', '💯'];
  
  // ✅ THÊM: State Beauty Filter
  const [beautyFilterLevel, setBeautyFilterLevel] = useState(0); // 0-100
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Timer
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);

  // ==================== ✅ TÍNH NĂNG MỚI ====================
  // State đếm ngược (phút)
  const [timeLeft, setTimeLeft] = useState(null); // Tổng số giây còn lại
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const totalDurationRef = useRef(0);

  // Video Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenResult = searchParams.get('openResult') === '1';
  const [showInRoomPanel, setShowInRoomPanel] = useState(autoOpenResult);

  // THÊM MỚI: State xác thực OTP
  // Bác sĩ được vào thẳng, bệnh nhân phải chờ
  const [isVerified, setIsVerified] = useState(
  user.role === 'doctor' || 
  sessionStorage.getItem(`video_verified_${consultationId}`) === 'true'
);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  // THÊM MỚI: State đếm ngược
  const [resendCooldown, setResendCooldown] = useState(0);

  // ========== USEEFFECT - KHỞI TẠO ==========
  useEffect(() => {
    let isMounted = true;
    let streamInitialized = false;

    const init = async () => {
      try {
        console.log('🎬 [VideoCall] Khởi tạo phòng video call...');
        
        // 1. Lấy thông tin consultation
        const res = await consultationService.getConsultationById(consultationId);
        if (!isMounted) return;
        
        const consultationData = res.data.data || res.data;
        setConsultation(consultationData);
        console.log('✅ [VideoCall] Đã tải thông tin consultation');

        // ✅ TÍNH NĂNG MỚI: Set tổng thời gian
        const durationMins = consultationData.package?.duration_minutes || 30;
        totalDurationRef.current = durationMins * 60; // Lưu tổng giây vào ref
        setTimeLeft(totalDurationRef.current); // Set thời gian ban đầu

        // 2. Kiểm tra trạng thái consultation
        if (consultationData.status !== 'confirmed' && consultationData.status !== 'in_progress') {
          // SỬA: Cung cấp thông báo lỗi rõ ràng hơn
          let errorMessage = `Buổi tư vấn chưa sẵn sàng (Trạng thái: ${consultationData.status})`;
          if (consultationData.status === 'cancelled') {
            errorMessage = 'Buổi tư vấn này đã bị hủy. Bạn không thể tham gia.';
          } else if (consultationData.status === 'completed') {
            errorMessage = 'Buổi tư vấn này đã kết thúc.';
          } else if (consultationData.status === 'pending') {
            errorMessage = 'Buổi tư vấn này đang chờ bác sĩ xác nhận.';
          }
          
          setError(errorMessage);
          setLoading(false);
          return;
        }

        // 3. Xử lý WebSocket và xác thực
        if (!isVerified) {
          // Nếu là bệnh nhân và chưa xác thực OTP,
          // tắt loading và dừng hàm init tại đây để hiển thị màn hình OTP.
          console.log('🧑‍⚕️ [VideoCall] Bệnh nhân đang chờ OTP, tạm dừng init...');
          setLoading(false); 
          return; // Dừng hàm init
        }

        // --- TỪ ĐÂY TRỞ ĐI, CODE CHỈ CHẠY KHI (isVerified = true) ---
        
        // 4. Kết nối WebSocket
        console.log('📡 [VideoCall] Đang kết nối WebSocket...');
        await chatService.connect(user.id, consultationId);
        
        // 5. Kiểm tra kết nối (SỬA: Di chuyển vào đây)
        if (!chatService.isConnected()) {
          throw new Error('WebSocket không kết nối được');
        }
        console.log('✅ [VideoCall] WebSocket đã sẵn sàng');

        // 4. Bắt đầu stream
        console.log('📹 [VideoCall] Đang yêu cầu quyền camera/mic...');
        await videoService.startLocalStream();
        if (!isMounted) return;
        streamInitialized = true;
        console.log('✅ [VideoCall] Đã lấy được stream');

        // 5. Đăng ký callbacks
        videoService.onLocalStream = (stream) => {
          if (localVideoRef.current && isMounted) {
            localVideoRef.current.srcObject = stream;
            console.log('✅ [VideoCall] Local video đã được set');
          }
        };
        
        videoService.onRemoteStream = (stream) => {
          if (remoteVideoRef.current && isMounted) {
            remoteVideoRef.current.srcObject = stream;
            
            // Force unmute và bật âm thanh
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.volume = 1.0;
            remoteVideoRef.current.play().catch(err => {
              console.warn('⚠️ Autoplay bị chặn:', err);
            });
            
            setCallStatus('Đang diễn ra');
            startCallTimer(); // Bắt đầu đếm giờ
            console.log('✅ [VideoCall] Remote video đã được set');
            
            const audioTracks = stream.getAudioTracks();
            console.log('🎤 [VideoCall] Remote audio tracks:', audioTracks.length, audioTracks);
          }
        };
        
        videoService.onCallEnded = () => {
          if (isMounted) {
            setCallStatus('Đã kết thúc');
            stopCallTimer();
            // KHÔNG tự động chuyển trang, đợi bác sĩ điền form
            if (user.role === 'patient') {
              alert('Cuộc gọi đã kết thúc.');
              navigate(`/tu-van/${consultationId}`);
            } else {
              // Nếu là bác sĩ, và form chưa mở, thì mở form
              if (!showSummaryModal) {
                setShowSummaryModal(true);
              }
            }
          }
        };

        // 6. Tạo Peer Connection
        console.log('🔌 [VideoCall] Đang tạo Peer Connection...');
        await videoService.createPeerConnection(consultationId);
        if (!isMounted) return;
        
        setLoading(false);
        setCallStatus('Đang chờ người tham gia...');

        // 7. Chỉ Bác sĩ mới tạo Offer
        if (isDoctorOrAdmin) {
          console.log('👨‍⚕️ [VideoCall] Bác sĩ đang tạo Offer...');
          setTimeout(async () => {
            if (isMounted) {
              await videoService.createOffer();
            }
          }, 500);
        } else {
          console.log('🧑‍⚕️ [VideoCall] Bệnh nhân đang chờ Offer từ bác sĩ...');
        }
       // SỬA: Thêm dấu } để đóng if(isVerified)

      } catch (err) {
        console.error('❌ [VideoCall] Lỗi khởi tạo:', err);
        if (isMounted) {
          setError(err.message || 'Không thể khởi tạo phòng video call');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      console.log('🧹 [VideoCall] Cleanup...');
      isMounted = false;
      stopCallTimer();
      if (streamInitialized) {
        videoService.hangUp();
      }
      if (chatService.isConnected()) {
        chatService.leaveConsultation(consultationId);
      }
    };
  }, [consultationId, user.id, user.role, navigate, isVerified]); // SỬA: Thêm isVerified

  // sync search param -> panel state
  useEffect(() => {
    setShowInRoomPanel(searchParams.get('openResult') === '1');
  }, [searchParams]);

  const closeInRoomPanel = () => {
    setShowInRoomPanel(false);
    const p = new URLSearchParams(searchParams);
    p.delete('openResult');
    setSearchParams(p);
  };

  const openInRoomPanel = () => {
    const p = new URLSearchParams(searchParams);
    p.set('openResult', '1');
    setSearchParams(p);
    setShowInRoomPanel(true);
  };

  // THÊM MỚI: Hàm xử lý gửi lại OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return; // Ngăn spam

    setOtpError(''); // Xóa lỗi cũ
    try {
      setLoading(true); // Dùng chung state loading
      await consultationService.resendVideoOtp(consultationId);
      // Hiển thị thông báo thành công qua trường error
      setOtpError('Đã gửi lại mã OTP. Vui lòng kiểm tra email.');
      setResendCooldown(60); // Bắt đầu 60s đếm ngược
    } catch (err) {
      console.error('Lỗi gửi lại OTP:', err);
      setOtpError(err.response?.data?.message || 'Lỗi khi gửi lại mã');
    } finally {
      setLoading(false);
    }
  };

  // THÊM MỚI: useEffect cho bộ đếm ngược
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [consultationId, user.id, user.role, navigate, isVerified]); // SỬA: Thêm isVerified

  // THÊM MỚI: Hàm xử lý xác thực OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!otpInput) {
      setOtpError('Vui lòng nhập OTP');
      return;
    }
    
    try {
      setLoading(true); // Hiển thị loading
      await consultationService.verifyVideoOtp(consultationId, otpInput);
      
      // ✅ SỬA LỖI: Lưu trạng thái vào sessionStorage
      sessionStorage.setItem(`video_verified_${consultationId}`, 'true');

      setIsVerified(true); // Xác thực thành công!
      setLoading(false);
    } catch (err) {
      console.error('Lỗi xác thực OTP:', err);
      // ✅ SỬA LOGIC HIỂN THỊ LỖI
      if (err.response?.data?.message === 'Phiên tư vấn này đã kết thúc') {
        setError('Phiên tư vấn này đã kết thúc. Bạn không thể tham gia.');
      } else {
        setOtpError(err.response?.data?.message || 'Lỗi không xác định');
      }
      setLoading(false);
    }
  };

  // ✅ THÊM: Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const messages = await chatService.getChatHistory(consultationId);
        setChatMessages(messages);
      } catch (error) {
        console.error('❌ Lỗi tải lịch sử chat:', error);
      }
    };
    
    if (showChatBox && chatMessages.length === 0) {
      loadChatHistory();
    }
    
    // Lắng nghe tin nhắn mới qua WebSocket
    // Lắng nghe tin nhắn mới qua WebSocket
    const handleNewMessage = (payload) => {
      
      // ✅ SỬA LỖI: Thêm tin nhắn mới vào state
      setChatMessages(prev => [...prev, payload]);

      // Dùng `setShowChatBox` với callback để lấy state mới nhất
      setShowChatBox(currentShowChatBox => {
        if (!currentShowChatBox) {
          setHasNewMessage(true);
        }
        return currentShowChatBox; // Trả về state hiện tại
      });
    };
    
    chatService.on('new_message', handleNewMessage);
    
    return () => {
      chatService.off('new_message', handleNewMessage);
    };
  }, [showChatBox, consultationId, chatMessages.length]);

  // ✅ THÊM: Beauty Filter Effect
  useEffect(() => {
    if (beautyFilterLevel === 0 || !localVideoRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const video = localVideoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const applyBeautyFilter = () => {
      ctx.filter = `blur(${beautyFilterLevel / 50}px) brightness(${1 + beautyFilterLevel / 200})`;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animationFrameRef.current = requestAnimationFrame(applyBeautyFilter);
    };
    
    applyBeautyFilter();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [beautyFilterLevel]);


  const startCallTimer = () => {
    timerRef.current = setInterval(() => {
      // SỬA LỖI: Cập nhật cả hai state bằng functional update
      // 'prevDuration' là giá trị trước đó của callDuration
      setCallDuration(prevDuration => {
        const newDuration = prevDuration + 1;
        
        // ✅ TÍNH NĂNG MỚI: Logic đếm ngược
        // Dùng newDuration (đã có giá trị) thay vì 'prev'
        const newTimeLeft = totalDurationRef.current - newDuration;
        setTimeLeft(newTimeLeft); // Cập nhật timeLeft
        
        // Cảnh báo 10 phút (600 giây)
        if (newTimeLeft === 600) {
          setShowTimeWarning(true);
        }
        
        // Hết giờ
        if (newTimeLeft <= 0) {
          setTimeLeft(0);
          stopCallTimer();
          if (isDoctorOrAdmin) {
            setShowEndCallModal(true); // Hiển thị modal cho bác sĩ
          } else {
            // Tự động ngắt kết nối cho bệnh nhân
            alert('Đã hết thời gian tư vấn. Cuộc gọi sẽ tự động kết thúc.');
            videoService.hangUp();
          }
        }
        
        return newDuration; // Trả về giá trị mới cho callDuration
      });
    }, 1000);
  };

  const stopCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const prefix = seconds < 0 ? "-" : "";
    return `${prefix}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== CÁC HÀM ĐIỀU KHIỂN ==========
  const handleToggleAudio = () => {
    if (!videoService.localStream) {
      console.warn('⚠️ Local stream chưa sẵn sàng');
      return;
    }
    
    const audioTrack = videoService.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('⚠️ Không tìm thấy audio track');
      return;
    }
    
    audioTrack.enabled = !audioTrack.enabled;
    setIsAudioMuted(!audioTrack.enabled);
    console.log('🎤 [VideoCall] Audio:', audioTrack.enabled ? 'BẬT' : 'TẮT');
  };

  const handleToggleVideo = () => {
    if (!videoService.localStream) {
      console.warn('⚠️ Local stream chưa sẵn sàng');
      return;
    }
    
    const videoTrack = videoService.localStream.getVideoTracks()[0];
    if (!videoTrack) {
      console.warn('⚠️ Không tìm thấy video track');
      return;
    }
    
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoMuted(!videoTrack.enabled);
    
    console.log('📹 [VideoCall] Video:', videoTrack.enabled ? 'BẬT' : 'TẮT');
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = videoService.localStream;
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: false 
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Thay thế video track bằng screen track
        const sender = videoService.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        
        setIsScreenSharing(true);
        
        // Khi user dừng share từ browser
        screenTrack.onended = () => {
          handleStopScreenShare();
        };
        
      } else {
        handleStopScreenShare();
      }
    } catch (error) {
      console.error('❌ Lỗi chia sẻ màn hình:', error);
      alert('Không thể chia sẻ màn hình. Vui lòng thử lại.');
    }
  };

  const handleStopScreenShare = () => {
    const videoTrack = videoService.localStream.getVideoTracks()[0];
    const sender = videoService.peerConnection.getSenders().find(s => s.track?.kind === 'video');
    if (sender && videoTrack) {
      sender.replaceTrack(videoTrack);
    }
    setIsScreenSharing(false);
  };

  // ✅ SỬA: Logc Nút "Hoàn thành"
  const handleHangUp = () => {
    if (isDoctorOrAdmin) {
      // Bác sĩ phải điền form
      setShowSummaryModal(true);
    } else {
      // Bệnh nhân có thể rời
      if (window.confirm('Bạn có chắc muốn kết thúc cuộc gọi?')) {
        videoService.hangUp();
      }
    }
  };

  // ✅ HÀM MỚI: Bác sĩ hoàn tất form và kết thúc
  const handleCompleteAndHangUp = () => {
    setShowSummaryModal(false);
    videoService.hangUp();
  // Chuyển bác sĩ đến trang lịch hẹn gộp chung
  navigate('/lich-hen-cua-toi'); 
  };

  // ✅ THÊM: CHAT BOX FUNCTIONS
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    try {
      const messageData = {
        consultation_id: consultationId,
        message_type: 'text',
        content: newMessage.trim()
      };
      
      await chatService.sendTextMessage(messageData);
      setNewMessage('');
    } catch (error) {
      console.error('❌ Lỗi gửi tin nhắn:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  // ✅ SỬA: TÁCH RIÊNG HÀM NÀY RA
          const handleSendFile = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Bạn có thể thêm validation file ở đây nếu muốn
            // const validation = chatService.validateFile(file, 25); // 25MB
            // if (!validation.isValid) {
            //   alert(Object.values(validation.errors).join('\n'));
            //   return;
            // }
            
            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('consultation_id', consultationId);
              formData.append('message_type', 'file'); // <-- Sửa thành 'file'
              formData.append('receiver_id', otherUser.id); // <-- Đây là fix quan trọng
        
              await chatService.uploadFile(formData);
            } catch (error) {
              console.error('❌ Lỗi gửi file:', error);
              alert('Không thể gửi file. Vui lòng thử lại.');
            }
            // Xóa giá trị của input để có thể chọn lại file tương tự
            e.target.value = null;
          };

          // ✅ SỬA: HÀM GỐC (không còn lồng hàm khác)
          const handleSendImage = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const validation = chatService.validateFile(file, 5);
            if (!validation.isValid) {
              alert(Object.values(validation.errors).join('\n'));
              return;
            }
            
            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('consultation_id', consultationId);
              formData.append('message_type', 'image');
              formData.append('receiver_id', otherUser.id);
        
              await chatService.uploadFile(formData);
            } catch (error) {
              console.error('❌ Lỗi gửi ảnh:', error);
              alert('Không thể gửi ảnh. Vui lòng thử lại.');
            }
            // Thêm dòng này để xóa giá trị của input
            e.target.value = null;
          };
  
  // ✅ THÊM: EMOJI REACTION FUNCTIONS
  const handleEmojiClick = (emoji) => {
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji: emoji,
      left: Math.random() * 80 + 10, // 10-90%
      animationDuration: 3 + Math.random() * 2 // 3-5s
    };
    
    setFloatingEmojis(prev => [...prev, newEmoji]);
    
    // Xóa emoji sau khi animation kết thúc
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, newEmoji.animationDuration * 1000);
  };

  // ========== MODAL - BÁO CÁO SỰ CỐ ==========
  const handleSubmitReport = async () => {
    if (!reportType || !reportDescription.trim()) {
      alert('Vui lòng chọn loại sự cố và mô tả chi tiết');
      return;
    }
    
    try {
      await consultationService.createConsultationReport(consultationId, {
        report_type: reportType,
        description: reportDescription
      });
      
      alert('✅ Đã gửi báo cáo thành công. Admin sẽ xử lý sớm nhất.');
      setShowReportModal(false);
      setReportType('');
      setReportDescription('');
    } catch (error) {
      console.error('❌ Lỗi gửi báo cáo:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  // ========== RENDER ==========

if (loading) {
    return (
      <div className="video-call-room-page-loading">
        <div className="video-call-room-page-spinner"></div>
        <p>Đang tải phòng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-call-room-page-error">
        <FaExclamationTriangle />
        <h3>Đã xảy ra lỗi</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/lich-hen-cua-toi')}>Quay lại</button>
      </div>
    );
  }


// THÊM MỚI: Màn hình nhập OTP cho Bệnh nhân
  if (!isVerified && user.role === 'patient') {
    return (
      <div className="video-call-room-page-loading"> {/* Tái sử dụng style loading */}
        <form className="video-call-room-page-otp-form" onSubmit={handleVerifyOtp}>
          <FaVideo />
          <h3>Xác thực Video Call</h3>
          <p>Vui lòng nhập mã OTP (6 số) đã được gửi đến email của bạn để vào phòng.</p>
          
          <input
            type="tel"
            maxLength="6"
            placeholder="------"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            className="video-call-room-page-otp-input"
          />
          
          {otpError && (
            <p className="video-call-room-page-otp-error">{otpError}</p>
          )}
          
          <button type="submit" disabled={loading} className="video-call-room-page-otp-button">
            {loading ? 'Đang kiểm tra...' : 'Xác nhận'}
          </button>

          {/* === THÊM KHỐI NÀY === */}
          <div className="video-call-room-page-otp-resend">
            {resendCooldown > 0 ? (
              <span>Vui lòng chờ {resendCooldown} giây</span>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); handleResendOtp(); }}>
                Không nhận được mã? Gửi lại
              </a>
            )}
          </div>
          {/* === KẾT THÚC KHỐI THÊM === */}

          <a href="#" onClick={() => navigate(-1)} className="video-call-room-page-otp-back">
            Quay lại
          </a>
        </form>
      </div>
    );
  }

  
  const otherUser = user.role === 'patient' ? consultation?.doctor : consultation?.patient;

  return (
    <div className="video-call-room-page-container">
      
      {/* ========== HEADER ========== */}
      <div className="video-call-room-page-header">
        <div className="video-call-room-page-user-info">
          {user.role === 'patient' ? <FaUserMd /> : <FaUser />}
          <span className="video-call-room-page-user-name">
            {user.role === 'patient' ? 'BS. ' : 'BN. '}{otherUser?.full_name}
          </span>
          <span className="video-call-room-page-separator">•</span>
          <span className="video-call-room-page-consultation-code">
            {consultation?.consultation_code}
          </span>
        </div>
        
        <div className="video-call-room-page-status-group">
          <div className={`video-call-room-page-connection-indicator ${connectionQuality}`}>
            <FaWifi />
          </div>
          
          {/* ========== ✅ THAY ĐỔI: HIỂN THỊ ĐỒNG HỒ ĐẾM NGƯỢC ========== */}
          <div className={`video-call-room-page-call-timer ${timeLeft <= 600 ? 'video-call-room-page-call-timer-warning' : ''}`}>
            <FaClock />
            <span>{timeLeft !== null ? formatDuration(timeLeft) : '--:--'}</span>
          </div>
          
          <span className={`video-call-room-page-status-badge ${callStatus === 'Đang diễn ra' ? 'active' : ''}`}>
            {callStatus === 'Đang diễn ra' && <FaCheckCircle />}
            {callStatus}
          </span>

          {isDoctorOrAdmin && consultation?.status === 'in_progress' && (
            <button
              className="video-call-room-page-control-btn video-call-room-page-control-btn-secondary"
              onClick={openInRoomPanel}
              title="Mở nhập kết quả"
            >
              <FaNotesMedical />
              <span>Nhập kết quả</span>
            </button>
          )}
        </div>
      </div>

      {/* ========== VIDEO GRID ========== */}
      <div className="video-call-room-page-video-grid">
        {/* Video của người khác (toàn màn hình) */}
        <div className="video-call-room-page-video-wrapper video-call-room-page-remote">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            muted={false}
            className="video-call-room-page-remote-video"
          />
          {callStatus !== 'Đang diễn ra' && (
            <div className="video-call-room-page-overlay">
              <div className="video-call-room-page-overlay-content">
                <div className="video-call-room-page-spinner"></div>
                <p>{callStatus}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Video của mình (nhỏ ở góc) */}
        <div className="video-call-room-page-video-wrapper video-call-room-page-local">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="video-call-room-page-local-video"
          />
          {isVideoMuted && (
            <div className="video-call-room-page-video-off-overlay">
              <FaVideoSlash />
              <p>Camera tắt</p>
            </div>
          )}
          <div className="video-call-room-page-local-label">
            Bạn
          </div>
        </div>
      </div>

      {/* ========== CONTROLS ========== */}
      <div className="video-call-room-page-controls">
        {/* ===== THÊM KHỐI NÀY VÀO ĐÂY ===== */}
        {/* ========== EMOJI REACTIONS (TOGGLEABLE) ========== */}
        {showEmojiPanel && (
          <div className="video-call-room-page-emoji-panel">
            {emojiReactions.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiClick(emoji)}
                className="video-call-room-page-emoji-btn"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        {/* ===== KẾT THÚC KHỐI THÊM ===== */}
        <div className="video-call-room-page-controls-left">
          <button 
            className="video-call-room-page-control-btn video-call-room-page-control-btn-secondary"
            onClick={() => setShowInfoModal(true)}
            title="Thông tin cuộc gọi"
          >
            <FaInfoCircle />
          </button>
          
          <button 
            className="video-call-room-page-control-btn video-call-room-page-control-btn-secondary"
            onClick={() => setShowReportModal(true)}
            title="Báo cáo sự cố"
          >
            <FaExclamationTriangle />
          </button>
        </div>
        
        <div className="video-call-room-page-controls-center">
          <button 
            className={`video-call-room-page-control-btn ${isAudioMuted ? 'video-call-room-page-control-btn-muted' : ''}`}
            onClick={handleToggleAudio}
            title={isAudioMuted ? 'Bật Mic' : 'Tắt Mic'}
          >
            {isAudioMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </button>

          {/* ========== ✅ THAY ĐỔI: NÚT KẾT THÚC/HOÀN THÀNH ========== */}
          <button 
            className={`video-call-room-page-control-btn ${isDoctorOrAdmin ? 'video-call-room-page-control-btn-complete' : 'video-call-room-page-control-btn-hangup'}`}
            onClick={handleHangUp}
            title={isDoctorOrAdmin ? 'Hoàn thành' : 'Kết thúc'}
          >
            {isDoctorOrAdmin ? <FaSave /> : <FaPhoneSlash />}
          </button>
          {/* ======================================================== */}

          <button 
            className={`video-call-room-page-control-btn ${isVideoMuted ? 'video-call-room-page-control-btn-muted' : ''}`}
            onClick={handleToggleVideo}
            title={isVideoMuted ? 'Bật Camera' : 'Tắt Camera'}
          >
            {isVideoMuted ? <FaVideoSlash /> : <FaVideo />}
          </button>
        </div>
        
       <div className="video-call-room-page-controls-right">
        {/* ===== THÊM NÚT NÀY ===== */}
          <button 
            className={`video-call-room-page-control-btn video-call-room-page-control-btn-secondary ${showEmojiPanel ? 'video-call-room-page-control-btn-active' : ''}`}
            onClick={() => setShowEmojiPanel(!showEmojiPanel)}
            title="Phản ứng"
          >
            <FaSmile />
          </button>
          <button 
            className={`video-call-room-page-control-btn video-call-room-page-control-btn-secondary ${isScreenSharing ? 'video-call-room-page-control-btn-active' : ''}`}
            onClick={handleScreenShare}
            title="Chia sẻ màn hình"
          >
            <FaDesktop />
          </button>
          
          <button 
            className={`video-call-room-page-control-btn video-call-room-page-control-btn-secondary ${showChatBox ? 'video-call-room-page-control-btn-active' : ''}`}
            onClick={() => {
              setShowChatBox(true); // Luôn mở
              setHasNewMessage(false); // Tắt thông báo khi mở
            }}
            title="Chat"
          >
            <FaComments />
            {/* ===== THÊM BADGE NÀY ===== */}
            {hasNewMessage && !showChatBox && (
              <span className="video-call-room-page-notification-badge"></span>
            )}
            {/* ===== KẾT THÚC THÊM ===== */}
          </button>
          
          <button 
            className="video-call-room-page-control-btn video-call-room-page-control-btn-secondary"
            onClick={() => setBeautyFilterLevel(prev => (prev + 25) % 125)}
            title={`Làm đẹp: ${beautyFilterLevel}%`}
          >
            <FaMagic />
          </button>
        </div>
      </div>

      {/* ========== MODAL - THÔNG TIN CUỘC GỌI ========== */}
      {showInfoModal && (
        <div className="video-call-room-page-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="video-call-room-page-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-call-room-page-modal-header">
              <h3><FaInfoCircle /> Thông tin cuộc gọi</h3>
              <button onClick={() => setShowInfoModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="video-call-room-page-modal-body">
              <div className="video-call-room-page-info-row">
                <label>Mã tư vấn:</label>
                <span>{consultation?.consultation_code}</span>
              </div>
              
              <div className="video-call-room-page-info-row">
                <label>{user.role === 'patient' ? 'Bác sĩ:' : 'Bệnh nhân:'}</label>
                <span>{otherUser?.full_name}</span>
              </div>
              
              <div className="video-call-room-page-info-row">
                <label>Thời gian hẹn:</label>
                <span>{new Date(consultation?.appointment_time).toLocaleString('vi-VN')}</span>
              </div>
              
              {callStatus === 'Đang diễn ra' && (
                <div className="video-call-room-page-info-row">
                  <label>Thời lượng:</label>
                  <span>{formatDuration(callDuration)}</span>
                </div>
              )}
              
              <div className="video-call-room-page-info-row">
                <label>Trạng thái:</label>
                <span className="video-call-room-page-status-badge-small">{callStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL - BÁO CÁO SỰ CỐ ========== */}
      {showReportModal && (
        <div className="video-call-room-page-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="video-call-room-page-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-call-room-page-modal-header">
              <h3><FaExclamationTriangle /> Báo cáo sự cố</h3>
              <button onClick={() => setShowReportModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="video-call-room-page-modal-body">
              <div className="video-call-room-page-form-group">
                <label>Loại sự cố: <span className="video-call-room-page-required">*</span></label>
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="video-call-room-page-select"
                >
                  <option value="">-- Chọn loại sự cố --</option>
                  <option value="no_video">Không thấy hình ảnh</option>
                  <option value="no_audio">Không nghe thấy tiếng</option>
                  <option value="connection_lost">Mất kết nối</option>
                  <option value="poor_quality">Chất lượng kém</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              
              <div className="video-call-room-page-form-group">
                <label>Mô tả chi tiết: <span className="video-call-room-page-required">*</span></label>
                <textarea 
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Vui lòng mô tả chi tiết sự cố..."
                  rows="4"
                  className="video-call-room-page-textarea"
                />
              </div>
              
              <div className="video-call-room-page-modal-actions">
                <button 
                  className="video-call-room-page-btn video-call-room-page-btn-secondary"
                  onClick={() => setShowReportModal(false)}
                >
                  Hủy
                </button>
                <button 
                  className="video-call-room-page-btn video-call-room-page-btn-primary"
                  onClick={handleSubmitReport}
                >
                  Gửi báo cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== ✅ MODAL MỚI: CẢNH BÁO HẾT GIỜ ========== */}
      {showTimeWarning && (
        <div className="video-call-room-page-time-warning-modal">
          <FaClock />
          <span>Thời gian tư vấn còn lại 10 phút.</span>
          <button onClick={() => setShowTimeWarning(false)}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* ========== ✅ MODAL MỚI: BÁC SĨ XÁC NHẬN KẾT THÚC ========== */}
      {showEndCallModal && (
        <div className="video-call-room-page-modal-overlay">
          <div className="video-call-room-page-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-call-room-page-modal-header">
              <h3><FaClock /> Đã hết giờ</h3>
            </div>
            <div className="video-call-room-page-modal-body">
              <p>Đã hết thời gian tư vấn. Bạn có muốn kết thúc cuộc gọi và điền ghi chú ngay bây giờ không?</p>
            </div>
            <div className="video-call-room-page-modal-actions">
              <button 
                className="video-call-room-page-btn video-call-room-page-btn-secondary"
                onClick={() => setShowEndCallModal(false)}
              >
                Tiếp tục (thêm giờ)
              </button>
              <button 
                className="video-call-room-page-btn video-call-room-page-btn-primary"
                onClick={() => {
                  setShowEndCallModal(false);
                  setShowSummaryModal(true); // Mở form ghi chú
                }}
              >
                Kết thúc ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ✅ MODAL MỚI: BÁC SĨ ĐIỀN GHI CHÚ BẮT BUỘC ========== */}
      {showSummaryModal && (
        <DoctorSummaryModal 
          consultation={consultation}
          onCancel={() => setShowSummaryModal(false)}
          onComplete={handleCompleteAndHangUp}
        />
      )}

      {/* ========== CHAT BOX ========== */}
      {showChatBox && (
        <div className="video-call-room-page-chat-box">
          <div className="video-call-room-page-chat-header">
            <h4><FaComments /> Chat</h4>
            <button onClick={() => setShowChatBox(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="video-call-room-page-chat-body">
            {chatMessages.map((msg, index) => {
            // ✅ SỬA LỖI: Xác định URL của API (Tạm thời)
            // (Tôi sẽ sửa lại khi có file api.js)
            const API_BASE_URL = 'http://localhost:3001'; 

            let content;

            if (msg.message_type === 'image') {
              const imageUrl = msg.file_url?.startsWith('http') 
                ? msg.file_url 
                : `${API_BASE_URL}${msg.file_url}`;

              content = <img src={imageUrl} alt="Hình ảnh" className="video-call-room-page-chat-image" />;

            } else if (msg.message_type === 'file') {
              const fileUrl = msg.file_url?.startsWith('http') 
                ? msg.file_url 
                : `${API_BASE_URL}${msg.file_url}`;

              // Cố gắng decode tên file bị lỗi
              let fileName = msg.file_name || 'Tệp đính kèm';
              try {
                fileName = decodeURIComponent(escape(atob(fileName.replace(/%/g, ''))));
              } catch (e) {
                 // Nếu decode thất bại, thử cách khác
                try { fileName = decodeURIComponent(msg.file_name); }
                catch (e2) { /* Dùng tên gốc nếu vẫn lỗi */ }
              }

              content = (
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="video-call-room-page-chat-file-link"
                >
                  <FaPaperclip /> {fileName}
                </a>
              );
            } else {
              content = <p>{msg.content}</p>;
            }

            return (
              <div 
                key={msg.id || index}
                className={`video-call-room-page-chat-message ${
                  msg.sender_id === user.id ? 'video-call-room-page-chat-message-own' : ''
                }`}
              >
                {msg.sender_id !== user.id && (
                  <div className="video-call-room-page-chat-avatar">
                    {msg.sender?.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="video-call-room-page-chat-content">
                  {content}
                  <span className="video-call-room-page-chat-time">
                    {chatService.formatDetailedTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
          </div>
          
          <div className="video-call-room-page-chat-footer">
            <input
              type="file"
              accept="image/*"
              onChange={handleSendImage}
              style={{ display: 'none' }}
              id="chat-image-upload"
            />
            <label htmlFor="chat-image-upload" className="video-call-room-page-chat-icon-btn">
              <FaImage />
            </label>

            {/* ===== THÊM KHỐI NÀY ===== */}
            <input
              type="file"
              onChange={handleSendFile}
              style={{ display: 'none' }}
              id="chat-file-upload"
            />
            <label htmlFor="chat-file-upload" className="video-call-room-page-chat-icon-btn" title="Gửi file đính kèm">
              <FaPaperclip />
            </label>
            {/* ===== KẾT THÚC KHỐI THÊM ===== */}
            
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isSendingMessage}
            />
            
            <button 
              onClick={handleSendMessage}
              disabled={isSendingMessage || !newMessage.trim()}
              className="video-call-room-page-chat-send-btn"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
      
      {/* Floating Emojis */}
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          className="video-call-room-page-floating-emoji"
          style={{
            left: `${item.left}%`,
            animationDuration: `${item.animationDuration}s`
          }}
        >
          {item.emoji}
        </div>
      ))}
      
      {/* ========== BEAUTY FILTER CANVAS ========== */}
      {beautyFilterLevel > 0 && (
        <canvas
          ref={canvasRef}
          className="video-call-room-page-beauty-canvas"
        />
      )}

      {/* In-room result panel (embedded medical form) */}
      {showInRoomPanel && (
        <InRoomResultPanel
          consultationId={consultation?.id}
          consultationCode={consultation?.consultation_code}
          appointmentCode={consultation?.appointment_code}
          onClose={closeInRoomPanel}
        />
      )}

    </div>
  );
};

export default VideoCallRoomPage;
