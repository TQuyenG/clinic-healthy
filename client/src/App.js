// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DepartmentColorProvider } from './contexts/DepartmentColorContext'; 
import PermissionRoute from './components/common/PermissionRoute';
import usePermissions from './hooks/usePermissions';

// --- Import Pages ---

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OAuthCallback from './pages/OAuthCallback';

// Public & General
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FacilitiesPage from './pages/FacilitiesPage';
import EquipmentPage from './pages/EquipmentPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LookupResultPage from './pages/LookupResultPage'; 
import SearchResultPage from './pages/SearchResultPage'; 

// Articles
import ArticlesListPage from './pages/ArticlesListPage';
import ArticleManagementPage from './pages/ArticleManagementPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import ArticleOrCategoryPage from './pages/ArticleOrCategoryPage';
import SavedArticlesPage from './pages/SavedArticlesPage';
import CategoryArticlesPage from './pages/CategoryArticlesPage';
import ArticleReviewPage from './pages/ArticleReviewPage';

// Forum & Community
import ForumPage from './pages/ForumPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import MyForumPage from './pages/MyForumPage';
import MyGroupsManagementPage from './pages/MyGroupsManagementPage';
import CommunityGroupPage from './pages/CommunityGroupPage';
import CommunityGroupManagePage from './pages/CommunityGroupManagePage';
import ForumManagementPage from './pages/ForumManagementPage';
import ReportManagementPage from './pages/ReportManagementPage';

// Public Medicine & Disease (Entity Pages)
import EntityListPage from './pages/EntityListPage';
import EntityDetailPage from './pages/EntityDetailPage';
import EntityManagementPage from './pages/EntityManagementPage';

// Services, Specialties & Doctors
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ServiceCategoryDetailPage from './pages/ServiceCategoryDetailPage';
import SpecialtiesListPage from './pages/SpecialtiesListPage';
import SpecialtyDetailPage from './pages/SpecialtyDetailPage';
import DoctorsListPage from './pages/DoctorsListPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
// [DoctorReviewsPage removed — using modal integration instead]

// Common Protected
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PermissionDebugPage from './pages/PermissionDebugPage'; 

// Appointments & Medical Records
import AppointmentBookingPage from './pages/AppointmentBookingPage';
import AppointmentDetailPage from './pages/AppointmentDetailPage';
import MedicalRecordFormPage from './pages/MedicalRecordFormPage';
import MedicalRecordViewPage from './pages/MedicalRecordViewPage';
import SharedHealthProfilePage from './pages/SharedHealthProfilePage';
import DoctorMedicalRecordsPage from './pages/DoctorMedicalRecordsPage';
import MyMedicalRecordsPage from './pages/MyMedicalRecordsPage';

// Payment
// SAU KHI SỬA:
import PaymentPage from './pages/PaymentPage';
import PaymentManagementPage from './pages/PaymentManagementPage';
import PaymentDetailPage from './pages/PaymentDetailPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import FrontDeskPage from './pages/FrontDeskPage';
import PharmacyStockPage from './pages/PharmacyStockPage';
import PharmacyRetailPage from './pages/PharmacyRetailPage';
import RefundRequestPage from './pages/RefundRequestPage';
import RefundPolicyConfigPage from './pages/RefundPolicyConfigPage';
import ServiceManagementPage from './pages/ServiceManagementPage';

// Consultation (Tư vấn)
import ChatRoomPage from './pages/ChatRoomPage';
import ConsultationDetailPage from './pages/ConsultationDetailPage';
import ConsultationBookingPage from './pages/ConsultationBookingPage';
import VideoCallRoomPage from './pages/VideoCallRoomPage';
import ConsultationHistoryPage from './pages/ConsultationHistoryPage';
import ConsultationResultViewPage from './pages/ConsultationResultViewPage';

// Staff & Doctor
import MySchedulePage from './pages/MySchedulePage';

// Admin
import UsersPage from './pages/UsersPage';
import DoctorManagementPage from './pages/DoctorManagementPage';
import PatientManagementPage from './pages/PatientManagementPage';
import SpecialtyManagementPage from './pages/SpecialtyManagementPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import ScheduleManagementPage from './pages/ScheduleManagementPage';
import StatisticsPage from './pages/StatisticsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import StaffManagementPage from './pages/StaffManagementPage';
import ContactManagementPage from './pages/ContactManagementPage';
import AppointmentManagementPage from './pages/AppointmentManagementPage';
import ConsultationRealtimeManagementPage from './pages/ConsultationRealtimeManagementPage';
import ConsultationPackageManagementPage from './pages/ConsultationPackageManagementPage';
import GroupPostDetailPage from './pages/GroupPostDetailPage';

// Toast & CSS
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './utils/css/toast.css'; 
import CustomToasts from './components/common/CustomToasts';
import { ToastProvider } from './contexts/ToastContext';
import './App.css';
import './styles/theme.css';
import './services/ws'; // Initialize WebSocket

// Marketing & Events
import EventListPage from './pages/EventListPage'; 
import EventDetailPage from './pages/EventDetailPage'; 
import EventManagementPage from './pages/EventManagementPage';
import EventCommandCenterPage from './pages/EventCommandCenterPage'; 
import UserPromotionPage from './pages/UserPromotionPage';
import DiscountManagementPage from './pages/DiscountManagementPage';

// --- Protected Route Component ---
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth(); 

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Đang tải dữ liệu người dùng...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize role
  const rawRole = user?.role || user?.role_info || user?.roleData || user?.roleData?.role;
  const roleStr = typeof rawRole === 'string'
    ? rawRole.toLowerCase()
    : (typeof rawRole === 'object' && rawRole?.name) ? String(rawRole.name).toLowerCase() : '';

  if (requiredRole) {
    const allowedRoles = (Array.isArray(requiredRole) ? requiredRole : [requiredRole]).map(r => String(r).toLowerCase());
    if (!allowedRoles.includes(roleStr)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

// --- Component điều hướng trang lịch hẹn ---
const AppointmentPageDispatcher = () => {
  // Unified appointment page for all roles; internal logic will fetch role-specific data
  return <AppointmentManagementPage />;
};

const ReceptionRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { canAccessModule, hasPermission, isAdmin } = usePermissions();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Đang tải dữ liệu người dùng...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Normalize role name from various user shapes
  const rawRole = user?.role || user?.role_info || user?.roleData || user?.roleData?.role;
  const roleStr = typeof rawRole === 'string'
    ? rawRole.toLowerCase()
    : (typeof rawRole === 'object' && rawRole?.name) ? String(rawRole.name).toLowerCase() : '';

  // Admin by role string OR by permissions hook
  if (roleStr === 'admin' || isAdmin) {
    return children;
  }

  if (!(canAccessModule('reception') || hasPermission('payments', 'pos'))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ServiceManagementRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { canAccessModule, isAdmin } = usePermissions();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Đang tải dữ liệu người dùng...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin' || isAdmin) {
    return children;
  }

  if (!(canAccessModule('services') || canAccessModule('service_categories') || canAccessModule('appointments'))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ForumRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { canAccessModule } = usePermissions();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Đang tải dữ liệu người dùng...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin always has access
  if (user.role === 'admin') {
    return children;
  }

  if (!(canAccessModule('forum') || canAccessModule('community'))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ConsultationRealtimeRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { canAccessModule } = usePermissions();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Đang tải dữ liệu người dùng...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return children;
  }

  // Allow doctors to access realtime consultation UI even if module flags are missing
  const isDoctorRole = String(user?.role || user?.role_info?.role || '').toLowerCase() === 'doctor' || user?.is_doctor === true || Boolean(user?.doctor) || Boolean(user?.doctor_id);
  if (isDoctorRole) {
    return children;
  }

  if (!(canAccessModule('consultations') || canAccessModule('consultation_realtime') || canAccessModule('video_call'))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// --- App Component ---
function App() {
  return (
    <Router>
      <DepartmentColorProvider>
        <AuthProvider>
          <ToastProvider>
            <MainLayout>
              <Routes>
            {/* ========== 1. AUTH ========== */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/xac-thuc-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/dat-lai-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/reset-password-verify" element={<ResetPasswordPage />} />
            <Route path="/xac-thuc-dat-lai-mat-khau" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* ========== 2. PUBLIC & GENERAL ========== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/trang-chu" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/gioi-thieu" element={<AboutPage />} />
            <Route path="/ve-chung-toi" element={<AboutPage />} />
            <Route path="/lien-he" element={<ContactPage />} />
            <Route path="/co-so-vat-chat" element={<FacilitiesPage />} />
            <Route path="/trang-thiet-bi" element={<EquipmentPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/dieu-khoan" element={<TermsPage />} />
            <Route path="/dieu-khoan-su-dung" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
            <Route path="/bao-mat" element={<PrivacyPolicyPage />} />
            <Route path="/tra-cuu-ket-qua" element={<LookupResultPage />} />
            <Route path="/tim-kiem" element={<SearchResultPage />} />
            <Route path="/search" element={<SearchResultPage />} />

            <Route path="/quan-ly-su-kien" element={<PermissionRoute requiredRole={['admin', 'staff']} module="events_vouchers"><EventManagementPage /></PermissionRoute>} />
            <Route path="/su-kien/:id/dieu-phoi" element={<PermissionRoute requiredRole={['admin', 'staff']} module="events_vouchers"><EventCommandCenterPage /></PermissionRoute>} />
            <Route path="/quan-ly-khuyen-mai" element={<PermissionRoute requiredRole={['admin', 'staff']} module="events_vouchers"><DiscountManagementPage /></PermissionRoute>} />
            <Route path="/quan-ly-voucher" element={<PermissionRoute requiredRole={['admin', 'staff']} module="events_vouchers"><DiscountManagementPage /></PermissionRoute>} />
            <Route path="/su-kien" element={<EventListPage />} />
            <Route path="/su-kien/:slug" element={<EventDetailPage />} />
            <Route path="/khuyen-mai" element={<ProtectedRoute requiredRole="patient"><UserPromotionPage tab="vouchers" /></ProtectedRoute>} />
            <Route path="/san-qua" element={<ProtectedRoute requiredRole="patient"><UserPromotionPage tab="game" /></ProtectedRoute>} />
            
            {/* ========== 3. ARTICLES ========== */}
            <Route path="/bai-viet" element={<ArticlesListPage />} />
            <Route path="/articles" element={<ArticlesListPage />} />
            <Route path="/tin-tuc" element={<ArticlesListPage type="tin_tuc" />} />
            <Route path="/thuoc" element={<ArticlesListPage type="thuoc" />} />
            <Route path="/benh-ly" element={<ArticlesListPage type="benh_ly" />} />
            <Route path="/tin-tuc/:slug" element={<ArticleOrCategoryPage type="tin-tuc" />} />
            <Route path="/thuoc/:slug" element={<ArticleOrCategoryPage type="thuoc" />} />
            <Route path="/benh-ly/:slug" element={<ArticleOrCategoryPage type="benh_ly" />} />
            <Route path="/bai-viet/:slug" element={<ArticleDetailPage />} />
            <Route path="/danh-muc/:slug" element={<CategoryArticlesPage />} />
            
            {/* ========== 4. DIỄN ĐÀN & CỘNG ĐỒNG (Forum & Groups) ========== */}
            {/* Hub chung điều hướng Tab bằng URL */}
            <Route path="/dien-dan-suc-khoe" element={<ForumPage />} />
            <Route path="/cong-dong" element={<ForumPage />} />
            <Route path="/cong-dong/cua-toi" element={<ProtectedRoute><ForumPage /></ProtectedRoute>} />
            
            {/* Redirects phụ */}
            <Route path="/dien-dan" element={<Navigate to="/dien-dan-suc-khoe" replace />} />
            <Route path="/health-forum" element={<Navigate to="/dien-dan-suc-khoe" replace />} />

            {/* Chi tiết */}
            <Route path="/dien-dan-suc-khoe/cau-hoi/:id" element={<QuestionDetailPage />} />
            <Route path="/cong-dong/nhom/:slug" element={<CommunityGroupPage />} />
            <Route path="/cong-dong/nhom/:groupSlug/posts/:postId" element={<GroupPostDetailPage />} /> 
            <Route path="/dien-dan-cua-toi" element={<ProtectedRoute><MyForumPage /></ProtectedRoute>} />
            <Route path="/nhom-cua-toi" element={<ProtectedRoute><MyGroupsManagementPage /></ProtectedRoute>} />

            {/* Quản lý (Admin/Staff/Doctor) */}
            <Route path="/quan-ly-nhom-cong-dong" element={<ForumRoute><CommunityGroupManagePage mode="manage" /></ForumRoute>} />
            <Route path="/quan-ly-dien-dan" element={<ForumRoute><ForumManagementPage /></ForumRoute>} />
            <Route path="/quan-ly-bao-cao" element={<ProtectedRoute requiredRole="admin"><ReportManagementPage /></ProtectedRoute>} />

            {/* ========== 5. PUBLIC MEDICINE & DISEASE ========== */}
            <Route path="/tra-cuu-thuoc" element={<EntityListPage entityType="medicine" />} />
            <Route path="/tra-cuu-thuoc/:slug" element={<EntityDetailPage entityType="medicine" />} />
            <Route path="/tra-cuu-benh-ly" element={<EntityListPage entityType="disease" />} />
            <Route path="/tra-cuu-benh-ly/:slug" element={<EntityDetailPage entityType="disease" />} />

            {/* ========== 6. SERVICES, SPECIALTIES & DOCTORS ========== */}
            <Route path="/dich-vu" element={<ServicesPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/dich-vu/:id" element={<ServiceDetailPage />} />
            <Route path="/danh-muc-dich-vu/:slug" element={<ServiceCategoryDetailPage />} />
            <Route path="/chuyen-khoa" element={<SpecialtiesListPage />} />
            <Route path="/specialties" element={<SpecialtiesListPage />} />
            <Route path="/chuyen-khoa/:slug" element={<SpecialtyDetailPage />} />
            <Route path="/bac-si" element={<DoctorsListPage />} />
            <Route path="/doctors" element={<DoctorsListPage />} />
            <Route path="/bac-si/:code" element={<DoctorProfilePage />} />
            {/* DoctorReviewsPage route removed — reviews will be shown via popup/modal integrated into detail pages */}
            
            {/* ========== 7. COMMON PROTECTED ========== */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/debug-permissions" element={<ProtectedRoute><PermissionDebugPage /></ProtectedRoute>} />
            <Route path="/ho-so-nguoi-dung" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/thong-bao" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/bai-viet-da-luu" element={<ProtectedRoute><SavedArticlesPage /></ProtectedRoute>} />
            <Route path="/quay-tiep-don" element={<ReceptionRoute><FrontDeskPage /></ReceptionRoute>} />

            {/* ========== 8. APPOINTMENTS & MEDICAL RECORDS ========== */}
            <Route path="/dat-lich-hen" element={<ProtectedRoute requiredRole="patient"><AppointmentBookingPage /></ProtectedRoute>} />
            <Route path="/thanh-toan/:appointmentId" element={<ProtectedRoute requiredRole="patient"><PaymentPage /></ProtectedRoute>} />
            <Route path="/thanh-toan-tu-van/:consultationId" element={<ProtectedRoute requiredRole="patient"><PaymentPage /></ProtectedRoute>} />
            <Route path="/ho-so-y-te" element={<ProtectedRoute requiredRole="patient"><MedicalRecordViewPage /></ProtectedRoute>} />
            <Route path="/danh-sach-ho-so" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><MyMedicalRecordsPage /></ProtectedRoute>} />
            
            <Route path="/lich-hen-cua-toi" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><AppointmentPageDispatcher /></ProtectedRoute>} />
            <Route path="/my-appointments" element={<Navigate to="/lich-hen-cua-toi" replace />} /> 
            
            <Route path="/lich-hen/:code" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'staff', 'admin']}><AppointmentDetailPage /></ProtectedRoute>} />
            <Route path="/guest/appointment/:token" element={<AppointmentDetailPage />} />
            
            <Route path="/nhap-ket-qua/:code" element={<ProtectedRoute requiredRole={['doctor', 'admin', 'staff']}><MedicalRecordFormPage /></ProtectedRoute>} />
            <Route path="/ho-so-suc-khoe-cong-khai/:code" element={<ProtectedRoute requiredRole={['doctor', 'admin', 'staff', 'patient']}><SharedHealthProfilePage /></ProtectedRoute>} />
            <Route path="/ket-qua-kham/:record_id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><MedicalRecordViewPage /></ProtectedRoute>} />

            {/* ========== 9. CONSULTATION (Tư vấn) ========== */}
            <Route path="/tu-van" element={<Navigate to="/dich-vu?tab=consultation" replace />} />
            <Route path="/dat-lich-tu-van" element={<ProtectedRoute requiredRole={['patient','admin','doctor', 'staff']}><ConsultationBookingPage /></ProtectedRoute>} />
            <Route path="/lich-tu-van-cua-toi" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><ConsultationHistoryPage /></ProtectedRoute>} />
            
            <Route path="/tu-van/video/:id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin']}><VideoCallRoomPage /></ProtectedRoute>} />
            <Route path="/tu-van/:id/video" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin']}><VideoCallRoomPage /></ProtectedRoute>} />
            <Route path="/tu-van/:id/chat" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin']}><ChatRoomPage /></ProtectedRoute>} />
            <Route path="/ket-qua-tu-van/:id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><ConsultationResultViewPage /></ProtectedRoute>} />
<Route path="/tu-van/:id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><ConsultationDetailPage /></ProtectedRoute>} />
            
            {/* ========== 10. STAFF & DOCTOR ========== */}
            <Route path="/lich-cua-toi" element={<ProtectedRoute requiredRole={['doctor', 'staff']}><MySchedulePage /></ProtectedRoute>} />
            <Route path="/ho-so-benh-an" element={<PermissionRoute requiredRole={['admin', 'staff', 'doctor']} module="medical_records"><DoctorMedicalRecordsPage /></PermissionRoute>} />

            {/* ========== 11. ADMIN & MANAGEMENT ========== */}
            <Route path="/quan-ly-nguoi-dung" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
            <Route path="/quan-ly-bac-si" element={<PermissionRoute requiredRole={['admin', 'staff']} module="doctors"><DoctorManagementPage /></PermissionRoute>} />
            <Route path="/quan-ly-benh-nhan" element={<PermissionRoute requiredRole={['admin', 'staff']} module="patients"><PatientManagementPage /></PermissionRoute>} />
            <Route path="/admin/phan-cong-nhan-su" element={<ProtectedRoute requiredRole="admin"><StaffManagementPage openAssignment={true} /></ProtectedRoute>} />
            <Route path="/quan-ly-nhan-vien" element={<PermissionRoute requiredRole={['admin', 'staff']} module="staff_management"><StaffManagementPage /></PermissionRoute>} />
            <Route path="/quan-ly-lien-he" element={<PermissionRoute requiredRole={['admin', 'staff']} module="contact"><ContactManagementPage /></PermissionRoute>} />
            <Route path="/quan-ly-chuyen-khoa" element={<ProtectedRoute requiredRole="admin"><SpecialtyManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-danh-muc" element={<ProtectedRoute requiredRole="admin"><CategoryManagementPage /></ProtectedRoute>} />
            
            <Route path="/quan-ly-bai-viet" element={<PermissionRoute requiredRole={['admin', 'staff', 'doctor']} module="articles"><ArticleManagementPage /></PermissionRoute>} />
            <Route path="/phe-duyet-bai-viet/:id" element={<PermissionRoute requiredRole={['admin', 'staff', 'doctor']} module="articles"><ArticleReviewPage /></PermissionRoute>} />
            <Route path="/quan-ly-he-thong" element={<PermissionRoute requiredRole={['admin', 'staff']} module="system_settings"><SystemSettingsPage /></PermissionRoute>} />
            <Route path="/quan-ly-dich-vu" element={<ServiceManagementRoute><ServiceManagementPage /></ServiceManagementRoute>} />
            <Route path="/quan-ly-danh-muc-dich-vu" element={<Navigate to="/quan-ly-dich-vu?tab=categories" replace />} />
            
            <Route path="/quan-ly-thuoc" element={<PermissionRoute requiredRole={['admin', 'staff', 'doctor']} module="medicines"><EntityManagementPage entityType="medicine" /></PermissionRoute>} />
            <Route path="/quan-ly-benh-ly" element={<PermissionRoute requiredRole={['admin', 'staff', 'doctor']} module="diseases"><EntityManagementPage entityType="disease" /></PermissionRoute>} />
            <Route path="/quan-ly-kho-thuoc" element={<ProtectedRoute requiredRole="admin"><PharmacyStockPage /></ProtectedRoute>} />
            <Route path="/quan-ly-kho-thuoc/ban-thuoc" element={<PermissionRoute requiredRole={['admin', 'staff']} module="pharmacy"><PharmacyRetailPage /></PermissionRoute>} />
            <Route path="/quan-ly-lich-lam-viec" element={<PermissionRoute requiredRole={['admin', 'staff']} module="work_shift"><ScheduleManagementPage /></PermissionRoute>} />
            <Route path="/quan-ly-lich-hen" element={<PermissionRoute requiredRole={['admin', 'staff']} module="appointments"><AppointmentManagementPage /></PermissionRoute>} />
            
            <Route path="/thong-ke" element={<PermissionRoute requiredRole={['admin', 'staff']} module="statistics"><StatisticsPage /></PermissionRoute>} />
            <Route path="/quan-ly-tu-van/realtime" element={<ConsultationRealtimeRoute><ConsultationRealtimeManagementPage /></ConsultationRealtimeRoute>} />
            <Route path="/quan-ly-tu-van/goi-dich-vu" element={<PermissionRoute requiredRole={['admin', 'staff']} module="consultation_pricing"><ConsultationPackageManagementPage /></PermissionRoute>} />
            <Route path="/admin/tu-van/realtime" element={<Navigate to="/quan-ly-tu-van/realtime" replace />} />
            <Route path="/admin/tu-van/packages" element={<Navigate to="/quan-ly-tu-van/goi-dich-vu" replace />} />

            {/* ========== 12. QUẢN LÝ TÀI CHÍNH ========== */}
            <Route path="/quan-ly-thanh-toan/giao-dich" element={<PermissionRoute requiredRole={['admin', 'staff']} module="payments"><PaymentManagementPage /></PermissionRoute>} />
            <Route path="/quan-ly-thanh-toan/chi-tiet/:id" element={<PermissionRoute requiredRole={['admin', 'staff']} module="payments"><PaymentDetailPage /></PermissionRoute>} />
            <Route path="/quan-ly-thanh-toan/hoan-tien" element={<PermissionRoute requiredRole={['admin', 'staff']} module="payments"><RefundRequestPage /></PermissionRoute>} />
            <Route path="/quan-ly-thanh-toan/chinh-sach" element={<PermissionRoute requiredRole={['admin', 'staff']} module="payments"><RefundPolicyConfigPage /></PermissionRoute>} />
            <Route path="/quan-ly-thanh-toan/thong-ke" element={<PermissionRoute requiredRole={['admin', 'staff']} module="payments"><StatisticsPage /></PermissionRoute>} />
            <Route path="/quan-ly-thanh-toan/cau-hinh" element={<PermissionRoute requiredRole={['admin', 'staff']} module="payments"><PaymentSettingsPage /></PermissionRoute>} />

            {/* ========== 404 - NOT FOUND ========== */}
            <Route path="/404" element={<div style={{ textAlign: 'center', padding: '50px' }}><h1>404 - Không tìm thấy trang</h1><p>Trang bạn đang tìm kiếm không tồn tại</p><a href="/">Về trang chủ</a></div>} />
            <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </MainLayout>
            
            <CustomToasts />
            <ToastContainer
              position="bottom-right"
              autoClose={15000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              style={{ zIndex: 40000, right: '24px', bottom: '96px' }}
              toastClassName="app-toastify-toast"
            />
          </ToastProvider>
        </AuthProvider>
      </DepartmentColorProvider>
    </Router>
  );
}

export default App;