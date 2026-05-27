// client/src/components/ChatInput.js
import React, { useState, useRef, useEffect } from 'react';
import './ChatInput.css'; // Sẽ import file CSS mới ở dưới

const ChatInput = ({ value, onChange, onSend, onTyping, disabled, uploading, replyingTo, onCancelReply }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Common emojis
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
    '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
    '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
    '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠',
    '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
    '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
    '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💪', '🦵',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
    '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️'
  ];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  // Handle text change
  const handleChange = (e) => {
    onChange(e.target.value);
    if (onTyping) onTyping();
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle send
  const handleSend = () => {
    if ((!value.trim() && selectedFiles.length === 0) || disabled) return;
    
    onSend(value, selectedFiles);
    onChange('');
    setSelectedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle emoji click
  const handleEmojiClick = (emoji) => {
    onChange(value + emoji);
    textareaRef.current?.focus();
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`File ${file.name} quá lớn (tối đa 10MB)`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  // Remove selected file
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        const file = new File([blob], `voice-${Date.now()}.mp3`, { type: 'audio/mpeg' });
        setSelectedFiles(prev => [...prev, file]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Lỗi khi ghi âm:', err);
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập!');
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  // Cancel voice recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      clearInterval(recordingIntervalRef.current);
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get file icon
  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return 'fa-image';
    if (file.type.startsWith('video/')) return 'fa-video';
    if (file.type.startsWith('audio/')) return 'fa-music';
    if (file.type.includes('pdf')) return 'fa-file-pdf';
    if (file.type.includes('word')) return 'fa-file-word';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return 'fa-file-excel';
    return 'fa-file';
  };

  return (
    <div className="chatinput-container">
      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="chatinput-selected-files-preview">
          {selectedFiles.map((file, index) => (
            <div key={index} className="chatinput-file-preview-item">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt={file.name} />
              ) : (
                <div className="chatinput-file-preview-icon">
                  <i className={`fas ${getFileIcon(file)}`}></i>
                </div>
              )}
              <span className="chatinput-file-preview-name">{file.name}</span>
              <button 
                className="chatinput-remove-file-btn"
                onClick={() => removeFile(index)}
                type="button"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="chatinput-recording-indicator">
          <div className="chatinput-recording-animation">
            <span className="chatinput-recording-dot"></span>
            <span className="chatinput-recording-text">Đang ghi âm...</span>
          </div>
          <span className="chatinput-recording-time">{formatRecordingTime(recordingTime)}</span>
          <button 
            className="chatinput-cancel-recording-btn"
            onClick={cancelRecording}
            type="button"
          >
            <i className="fas fa-times"></i>
            Hủy
          </button>
        </div>
      )}

      {/* Vùng hiển thị đang trả lời */}
      {replyingTo && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', background: '#e8f5e9', borderLeft: '3px solid #7cb342',
          borderRadius: '6px', marginBottom: '8px', fontSize: '13px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <strong style={{ color: '#33691e', marginBottom: '2px' }}>
              Đang trả lời {replyingTo.sender?.full_name || 'tin nhắn'}:
            </strong>
            <span style={{ color: '#616161', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyingTo.message_type === 'text' ? replyingTo.content : `[Tin nhắn đính kèm]`}
            </span>
          </div>
          <button onClick={onCancelReply} style={{ background: 'none', border: 'none', color: '#757575', cursor: 'pointer' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Main Input Area */}
      <div className="chatinput-wrapper">
        {/* Emoji Picker Button */}
        <div className="chatinput-emoji-picker-wrapper">
          <button
            className="chatinput-action-btn chatinput-emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            type="button"
            title="Chọn emoji"
          >
            <i className="far fa-smile"></i>
          </button>

          {showEmojiPicker && (
            <div className="chatinput-emoji-picker">
              <div className="chatinput-emoji-picker-header">
                <h4>Chọn emoji</h4>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="chatinput-close-emoji-btn"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="chatinput-emoji-list">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    className="chatinput-emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? 'Buổi tư vấn đã kết thúc' : 'Nhập tin nhắn...'}
          disabled={disabled}
          rows={1}
          className="chatinput-textarea"
        />

        {/* Character Counter */}
        {value.length > 0 && (
          <div className="chatinput-char-counter">
            {value.length}/2000
          </div>
        )}

        {/* File Upload Button */}
        <button
          className="chatinput-action-btn chatinput-file-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          type="button"
          title="Đính kèm file"
        >
          <i className="fas fa-paperclip"></i>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        {/* Voice Record Button */}
        {!isRecording ? (
          <button
            className="chatinput-action-btn chatinput-voice-btn"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={disabled}
            type="button"
            title="Giữ để ghi âm"
          >
            <i className="fas fa-microphone"></i>
          </button>
        ) : (
          <button
            className="chatinput-action-btn chatinput-voice-btn chatinput-recording"
            onClick={stopRecording}
            type="button"
            title="Dừng ghi âm"
          >
            <i className="fas fa-stop"></i>
          </button>
        )}

        {/* Send Button */}
        <button
          className={`chatinput-action-btn chatinput-send-btn ${(value.trim() || selectedFiles.length > 0) ? 'chatinput-active' : ''}`}
          onClick={handleSend}
          disabled={disabled || uploading || (!value.trim() && selectedFiles.length === 0)}
          type="button"
          title="Gửi"
        >
          {uploading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;