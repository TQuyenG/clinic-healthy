// client/src/pages/StatisticsPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import paymentService from '../services/paymentService';
import consultationService from '../services/consultationService';
import articleService from '../services/articleService';
import userService from '../services/userService';
import staffService from '../services/staffService';
import forumService from '../services/forumService';
import eventService from '../services/eventService';
import marketingService from '../services/marketingService';
import communityService from '../services/communityService';
import api from '../services/api';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { toast } from 'react-toastify';
import { 
  FaChartLine, FaCalendarAlt, FaMoneyBillWave, FaWallet, 
  FaArrowUp, FaArrowDown, FaPrint, FaDownload,
  FaChartPie, FaFileInvoiceDollar, FaChartBar, FaTimes,
  FaFileExcel, FaFilePdf, FaFileWord,
  FaCalendarCheck, FaUndo,
  FaClipboardList, FaCheckCircle, FaCalendar, FaUsers, FaEnvelope, FaUser, FaUserMd
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './StatisticsPage.css';

const GridLayout = WidthProvider(ResponsiveGridLayout);
const WIDGET_LAYOUT_STORAGE_KEY = 'clinic-statistics-widget-layouts-v2';

const StatisticsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartModalTitle, setChartModalTitle] = useState('');
  const [chartModalSubtitle, setChartModalSubtitle] = useState('');
  const [chartModalRows, setChartModalRows] = useState([]);
  const [chartModalContext, setChartModalContext] = useState({ kind: 'generic', actionLabel: 'Xem' });
  const [chartModalLoading, setChartModalLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [widgetEditMode, setWidgetEditMode] = useState(false);
  const [widgetLayouts, setWidgetLayouts] = useState({});

  const [stats, setStats] = useState({
    chart: [],
    appointmentChart: [],
    dailyChart: [],
    methodBreakdown: [],
    statusCounts: {},
    appointmentStatusCounts: {},
    refundStatusCounts: {},
    refundMonthly: [],
    topServices: [],
    topDoctors: [],
    promotions: [],
    communityGroups: [],
    userStats: {
      totalUsers: 0,
      totalDoctors: 0,
      totalStaff: 0,
      totalAdmins: 0,
      totalPatients: 0,
      verifiedUsers: 0,
      activeUsers: 0,
      roles: { admin: 0, doctor: 0, staff: 0, patient: 0 }
    },
    departmentStats: [],
    consultationOverview: {
      total_consultations: 0,
      total_revenue: 0,
      refund_rate: 0,
      avg_rating: 0,
      total_reviews: 0,
      by_status: [],
      by_type: [],
      rating_breakdown: [],
      top_package: null,
      peak_hours: []
    },
    forumOverview: { totalQuestions: 0, totalAnswers: 0, topicCount: 0, pendingQuestions: 0, rejectedQuestions: 0, statusCounts: {}, topTopics: [], recentQuestions: [], unansweredQuestions: 0 },
    articleOverview: { total: 0, draft: 0, pending: 0, pending_medical: 0, approved: 0, rejected: 0, hidden: 0, request_edit: 0, request_rewrite: 0, reports: 0, action_required: 0, articles: [] },
    eventOverview: { total_events: 0, active_events: 0, total_views: 0, total_clicks: 0, avg_ctr: '0%', top_events: [] },
    promotionOverview: { totalPromotions: 0, activePromotions: 0, inactivePromotions: 0, expiringSoon: 0, voucherPromotions: 0 },
    communityOverview: { totalGroups: 0, activeGroups: 0, pendingGroups: 0, suspendedGroups: 0 },
    contactOverview: { total: 0, new: 0, processing: 0, replied: 0, closed: 0 },
    auditOverview: { total: 0, actions: [] },
    appointmentOverview: { year: new Date().getFullYear(), monthly: [], statusCounts: {}, typeCounts: {}, topServices: [], topDoctors: [], summary: {} },
    summary: {
      total: 0,
      today: 0,
      total_transactions: 0,
      paid_transactions: 0,
      total_appointments: 0,
      completed_appointments: 0,
      cancelled_appointments: 0,
      total_refund_amount: 0,
      total_refund_requests: 0,
      completed_refund_requests: 0,
      pending_refund_requests: 0,
      avg_daily_revenue: 0,
      payment_conversion_rate: 0,
      appointment_completion_rate: 0,
      appointment_cancellation_rate: 0,
      refund_rate: 0
    }
  });

  const COLORS = ['#43a047', '#42a5f5', '#ffa726', '#ef5350', '#ab47bc'];

  const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  const formatCurrencyValue = formatCurrency;

  const formatDateTimeLabel = (dateValue, timeValue) => {
    if (!dateValue) return 'N/A';
    const dateLabel = new Date(dateValue).toLocaleDateString('vi-VN');
    return timeValue ? `${dateLabel} ${String(timeValue).slice(0, 5)}` : dateLabel;
  };

  const buildDetailAction = (kind) => {
    switch (kind) {
      case 'appointments': return { label: 'Xem quản lý lịch hẹn', path: '/quan-ly-lich-hen' };
      case 'payments': return { label: 'Xem quản lý giao dịch', path: '/quan-ly-thanh-toan/giao-dich' };
      case 'refunds': return { label: 'Xem quản lý hoàn tiền', path: '/quan-ly-thanh-toan/hoan-tien' };
      case 'consultations': return { label: 'Xem quản lý tư vấn', path: '/quan-ly-tu-van/realtime' };
      case 'users': return { label: 'Xem quản lý người dùng', path: '/quan-ly-nguoi-dung' };
      default: return { label: 'Xem chi tiết', path: null };
    }
  };

  const normalizeModalRows = (rows = []) => rows.map((row, index) => {
    if (!row || typeof row !== 'object') {
      return { title: String(row ?? `Mục ${index + 1}`), category: 'Dữ liệu', detail: '', value: row };
    }
    if (row.title || row.category || row.detail || row.routePath) return row;
    const entries = Object.entries(row);
    const [firstKey, firstValue] = entries[0] || [];
    const numericEntry = entries.find(([, value]) => typeof value === 'number');
    const detailEntries = entries.slice(1).map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toLocaleString('vi-VN') : value}`);
    return {
      title: String(firstValue ?? `Mục ${index + 1}`),
      category: firstKey || 'Dữ liệu',
      detail: detailEntries.join(' • '),
      value: numericEntry ? numericEntry[1] : undefined
    };
  });

  const normalizeStatsPayload = (payload = {}) => {
    const rawData = Array.isArray(payload.chart) ? payload.chart : [];
    const rawAppointmentData = Array.isArray(payload.appointmentChart) ? payload.appointmentChart : [];
    const rawDailyData = Array.isArray(payload.dailyChart) ? payload.dailyChart : [];
    const summaryData = payload.summary || {};
    const methodBreakdown = Array.isArray(payload.methodBreakdown) ? payload.methodBreakdown : [];
    const refundMonthly = Array.isArray(payload.refundMonthly) ? payload.refundMonthly : [];
    const topServices = Array.isArray(payload.topServices) ? payload.topServices : [];
    const topDoctors = Array.isArray(payload.topDoctors) ? payload.topDoctors : [];
    const userStats = payload.userStats || {};
    const departmentStats = Array.isArray(payload.departmentStats) ? payload.departmentStats : [];
    const consultationOverview = payload.consultationOverview || {};
    const forumOverview = payload.forumOverview || {};
    const articleOverview = payload.articleOverview || {};
    const eventOverview = payload.eventOverview || {};
    const promotionOverview = payload.promotionOverview || {};
    const communityOverview = payload.communityOverview || {};
    const contactOverview = payload.contactOverview || {};
    const auditOverview = payload.auditOverview || {};

    const chart = Array.from({ length: 12 }, (_, i) => {
      const monthData = rawData.find((item) => Number(item.month) === i + 1);
      return {
        month: i + 1,
        name: `T${i + 1}`,
        fullName: `Tháng ${i + 1}`,
        revenue: monthData ? Number(monthData.total) : 0,
        expense: monthData ? Number(monthData.total) * 0.2 : 0,
        profit: monthData ? Number(monthData.total) * 0.8 : 0
      };
    });

    const appointmentChart = Array.from({ length: 12 }, (_, i) => {
      const monthData = rawAppointmentData.find((item) => Number(item.month) === i + 1);
      return { month: i + 1, name: `T${i + 1}`, fullName: `Tháng ${i + 1}`, count: monthData ? Number(monthData.count) : 0 };
    });

    const dailyChart = rawDailyData.map((item) => ({ day: item.day, count: Number(item.count || 0), revenue: Number(item.revenue || 0) }));

    return {
      chart,
      appointmentChart,
      dailyChart,
      methodBreakdown,
      statusCounts: payload.statusCounts || {},
      appointmentStatusCounts: payload.appointmentStatusCounts || {},
      refundStatusCounts: payload.refundStatusCounts || {},
      refundMonthly,
      topServices,
      topDoctors,
      promotions: Array.isArray(payload.promotions) ? payload.promotions : [],
      communityGroups: Array.isArray(payload.communityGroups) ? payload.communityGroups : [],
      userStats: {
        totalUsers: Number(userStats.totalUsers || 0),
        totalDoctors: Number(userStats.totalDoctors || 0),
        totalStaff: Number(userStats.totalStaff || 0),
        totalAdmins: Number(userStats.totalAdmins || 0),
        totalPatients: Number(userStats.totalPatients || 0),
        verifiedUsers: Number(userStats.verifiedUsers || 0),
        activeUsers: Number(userStats.activeUsers || 0),
        roles: {
          admin: Number(userStats.roles?.admin || 0),
          doctor: Number(userStats.roles?.doctor || 0),
          staff: Number(userStats.roles?.staff || 0),
          patient: Number(userStats.roles?.patient || 0)
        }
      },
      departmentStats: departmentStats.map((item) => ({
        code: item.code,
        name: item.name,
        total_staff: Number(item.total_staff || 0),
        managers: Number(item.managers || 0),
        active_staff: Number(item.active_staff || 0),
        inactive_staff: Number(item.inactive_staff || 0)
      })),
      consultationOverview: {
        total_consultations: Number(consultationOverview.total_consultations || 0),
        total_revenue: Number(consultationOverview.total_revenue || 0),
        refund_rate: Number(consultationOverview.refund_rate || 0),
        avg_rating: Number(consultationOverview.avg_rating || 0),
        total_reviews: Number(consultationOverview.total_reviews || 0),
        by_status: Array.isArray(consultationOverview.by_status) ? consultationOverview.by_status : [],
        by_type: Array.isArray(consultationOverview.by_type) ? consultationOverview.by_type : [],
        rating_breakdown: Array.isArray(consultationOverview.rating_breakdown) ? consultationOverview.rating_breakdown : [],
        top_package: consultationOverview.top_package || null,
        peak_hours: Array.isArray(consultationOverview.peak_hours) ? consultationOverview.peak_hours : []
      },
      forumOverview: {
        totalQuestions: Number(forumOverview.totalQuestions || 0),
        totalAnswers: Number(forumOverview.totalAnswers || 0),
        topicCount: Number(forumOverview.topicCount || 0),
        pendingQuestions: Number(forumOverview.pendingQuestions || 0),
        rejectedQuestions: Number(forumOverview.rejectedQuestions || 0),
        statusCounts: forumOverview.statusCounts || {},
        topTopics: Array.isArray(forumOverview.topTopics) ? forumOverview.topTopics : [],
        recentQuestions: Array.isArray(forumOverview.recentQuestions) ? forumOverview.recentQuestions : [],
        unansweredQuestions: Number(forumOverview.unansweredQuestions || 0)
      },
      articleOverview: {
        total: Number(articleOverview.total || 0),
        draft: Number(articleOverview.draft || 0),
        pending: Number(articleOverview.pending || 0),
        pending_medical: Number(articleOverview.pending_medical || 0),
        approved: Number(articleOverview.approved || 0),
        rejected: Number(articleOverview.rejected || 0),
        hidden: Number(articleOverview.hidden || 0),
        request_edit: Number(articleOverview.request_edit || 0),
        request_rewrite: Number(articleOverview.request_rewrite || 0),
        reports: Number(articleOverview.reports || 0),
        action_required: Number(articleOverview.action_required || 0),
        articles: Array.isArray(articleOverview.articles) ? articleOverview.articles : []
      },
      eventOverview: {
        total_events: Number(eventOverview.total_events || 0),
        active_events: Number(eventOverview.active_events || 0),
        total_views: Number(eventOverview.total_views || 0),
        total_clicks: Number(eventOverview.total_clicks || 0),
        avg_ctr: eventOverview.avg_ctr || '0%',
        top_events: Array.isArray(eventOverview.top_events) ? eventOverview.top_events : []
      },
      promotionOverview: {
        totalPromotions: Number(promotionOverview.totalPromotions || 0),
        activePromotions: Number(promotionOverview.activePromotions || 0),
        inactivePromotions: Number(promotionOverview.inactivePromotions || 0),
        expiringSoon: Number(promotionOverview.expiringSoon || 0),
        voucherPromotions: Number(promotionOverview.voucherPromotions || 0)
      },
      communityOverview: {
        totalGroups: Number(communityOverview.totalGroups || 0),
        activeGroups: Number(communityOverview.activeGroups || 0),
        pendingGroups: Number(communityOverview.pendingGroups || 0),
        suspendedGroups: Number(communityOverview.suspendedGroups || 0)
      },
      contactOverview: {
        total: Number(contactOverview.total || 0),
        new: Number(contactOverview.new || 0),
        processing: Number(contactOverview.processing || 0),
        replied: Number(contactOverview.replied || 0),
        closed: Number(contactOverview.closed || 0)
      },
      auditOverview: {
        total: Number(auditOverview.total || 0),
        actions: Array.isArray(auditOverview.actions) ? auditOverview.actions : []
      },
      summary: {
        total: Number(summaryData.total || 0),
        today: Number(summaryData.today || 0),
        total_transactions: Number(summaryData.total_transactions || 0),
        paid_transactions: Number(summaryData.paid_transactions || 0),
        total_appointments: Number(summaryData.total_appointments || 0),
        completed_appointments: Number(summaryData.completed_appointments || 0),
        cancelled_appointments: Number(summaryData.cancelled_appointments || 0),
        total_refund_amount: Number(summaryData.total_refund_amount || 0),
        total_refund_requests: Number(summaryData.total_refund_requests || 0),
        completed_refund_requests: Number(summaryData.completed_refund_requests || 0),
        pending_refund_requests: Number(summaryData.pending_refund_requests || 0),
        avg_daily_revenue: Number(summaryData.avg_daily_revenue || 0),
        payment_conversion_rate: Number(summaryData.payment_conversion_rate || 0),
        appointment_completion_rate: Number(summaryData.appointment_completion_rate || 0),
        appointment_cancellation_rate: Number(summaryData.appointment_cancellation_rate || 0),
        refund_rate: Number(summaryData.refund_rate || 0)
      }
    };
  };

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        paymentService.getRevenueStatistics({ year }),
        appointmentService.getAppointmentStatistics({ year }),
        userService.getUserStats(),
        staffService.getDepartmentStatistics(),
        consultationService.getSystemStatisticsOverview({ date_from: `${year}-01-01`, date_to: `${year}-12-31`, type: 'all' }),
        forumService.getForumOverview(),
        articleService.getAdminStatistics({ limit: 5 }),
        eventService.getStats({}),
        marketingService.getAllPromotions(),
        communityService.adminGetAllGroups({ limit: 200 }),
        api.get('/contact/messages', { params: { page: 1, limit: 1 } })
      ];

      const responses = await Promise.all(requests.map((request) => request.catch((error) => ({ error }))));
      const currentResponse = responses[0];
      const appointmentResponse = responses[1];
      const userResponse = responses[2];
      const departmentResponse = responses[3];
      const consultationResponse = responses[4];
      const forumResponse = responses[5];
      const articleResponse = responses[6];
      const eventResponse = responses[7];
      const promotionResponse = responses[8];
      const communityResponse = responses[9];
      const contactResponse = responses[10];
      

      if (currentResponse?.data?.success) {
        const normalizedCurrent = normalizeStatsPayload(currentResponse.data.data || {});
        setStats(normalizedCurrent);
      }

      if (appointmentResponse?.data?.success) {
        const appointmentData = appointmentResponse.data.data || {};
        setStats((previous) => ({
          ...previous,
          appointmentOverview: {
            year: Number(appointmentData.year || year),
            monthly: Array.isArray(appointmentData.monthly) ? appointmentData.monthly : [],
            statusCounts: appointmentData.statusCounts || {},
            typeCounts: appointmentData.typeCounts || {},
            topServices: Array.isArray(appointmentData.topServices) ? appointmentData.topServices : [],
            topDoctors: Array.isArray(appointmentData.topDoctors) ? appointmentData.topDoctors : [],
            summary: appointmentData.summary || {}
          }
        }));
      }

      if (userResponse?.data?.success) {
        const userStatsData = userResponse.data.stats || {};
        setStats((previous) => ({
          ...previous,
          userStats: {
            totalUsers: Number(userStatsData.totalUsers || 0),
            totalDoctors: Number(userStatsData.totalDoctors || 0),
            totalStaff: Number(userStatsData.totalStaff || 0),
            totalAdmins: Number(userStatsData.totalAdmins || 0),
            totalPatients: Number(userStatsData.totalPatients || 0),
            verifiedUsers: Number(userStatsData.verifiedUsers || 0),
            activeUsers: Number(userStatsData.activeUsers || 0),
            roles: {
              admin: Number(userStatsData.roles?.admin || 0),
              doctor: Number(userStatsData.roles?.doctor || 0),
              staff: Number(userStatsData.roles?.staff || 0),
              patient: Number(userStatsData.roles?.patient || 0)
            }
          }
        }));
      }

      if (departmentResponse?.data?.success) {
        setStats((previous) => ({
          ...previous,
          departmentStats: Array.isArray(departmentResponse.data.data)
            ? departmentResponse.data.data.map((item) => ({
                code: item.code,
                name: item.name,
                total_staff: Number(item.total_staff || 0),
                managers: Number(item.managers || 0),
                active_staff: Number(item.active_staff || 0),
                inactive_staff: Number(item.inactive_staff || 0)
              }))
            : []
        }));
      }

      if (consultationResponse?.data?.success) {
        const consultationOverviewData = consultationResponse.data.data || {};
        setStats((previous) => ({
          ...previous,
          consultationOverview: {
            total_consultations: Number(consultationOverviewData.total_consultations || 0),
            total_revenue: Number(consultationOverviewData.total_revenue || 0),
            refund_rate: Number(consultationOverviewData.refund_rate || 0),
            avg_rating: Number(consultationOverviewData.avg_rating || 0),
            total_reviews: Number(consultationOverviewData.total_reviews || 0),
            by_status: Array.isArray(consultationOverviewData.by_status)
              ? consultationOverviewData.by_status.map((item) => ({ name: item.status, value: Number(item.count || 0) }))
              : [],
            by_type: Array.isArray(consultationOverviewData.by_type)
              ? consultationOverviewData.by_type.map((item) => ({ name: item.consultation_type, value: Number(item.count || 0) }))
              : [],
            rating_breakdown: Array.isArray(consultationOverviewData.rating_breakdown)
              ? consultationOverviewData.rating_breakdown.map((item) => ({ name: `${item.rating} sao`, value: Number(item.count || 0) }))
              : [],
            top_package: consultationOverviewData.top_package || null,
            peak_hours: Array.isArray(consultationOverviewData.peak_hours) ? consultationOverviewData.peak_hours : []
          }
        }));
      }

      const forumPayload = forumResponse?.data || forumResponse;
      if (forumPayload?.success) {
        setStats((previous) => ({
          ...previous,
          forumOverview: {
            totalQuestions: Number(forumPayload.data?.totalQuestions || 0),
            totalAnswers: Number(forumPayload.data?.totalAnswers || 0),
            topicCount: Number(forumPayload.data?.topicCount || 0),
            pendingQuestions: Number(forumPayload.data?.pendingQuestions || 0),
            rejectedQuestions: Number(forumPayload.data?.rejectedQuestions || 0),
            statusCounts: forumPayload.data?.statusCounts || {},
            topTopics: Array.isArray(forumPayload.data?.topTopics) ? forumPayload.data.topTopics : [],
            recentQuestions: Array.isArray(forumPayload.data?.recentQuestions) ? forumPayload.data.recentQuestions : [],
            unansweredQuestions: Number(forumPayload.data?.unansweredQuestions || 0)
          }
        }));
      }

      const articlePayload = articleResponse?.data || articleResponse;
      if (articlePayload?.success) {
        const articleStats = articlePayload.stats || {};
        setStats((previous) => ({
          ...previous,
          articleOverview: {
            total: Number(articleStats.total || 0),
            draft: Number(articleStats.draft || 0),
            pending: Number(articleStats.pending || 0),
            pending_medical: Number(articleStats.pending_medical || 0),
            approved: Number(articleStats.approved || 0),
            rejected: Number(articleStats.rejected || 0),
            hidden: Number(articleStats.hidden || 0),
            request_edit: Number(articleStats.request_edit || 0),
            request_rewrite: Number(articleStats.request_rewrite || 0),
            reports: Number(articleStats.reports || 0),
            action_required: Number(articleStats.action_required || 0),
            articles: Array.isArray(articlePayload.articles) ? articlePayload.articles : []
          }
        }));
      }

      const eventPayload = eventResponse?.data || eventResponse;
      if (eventPayload?.success) {
        setStats((previous) => ({
          ...previous,
          eventOverview: {
            total_events: Number(eventPayload.stats?.total_events || 0),
            active_events: Number(eventPayload.stats?.active_events || 0),
            total_views: Number(eventPayload.stats?.total_views || 0),
            total_clicks: Number(eventPayload.stats?.total_clicks || 0),
            avg_ctr: eventPayload.stats?.avg_ctr || '0%',
            top_events: Array.isArray(eventPayload.stats?.top_events) ? eventPayload.stats.top_events : []
          }
        }));
      }

      const promotionPayload = promotionResponse?.data || promotionResponse;
      if (promotionPayload?.success) {
        const promotions = Array.isArray(promotionPayload.promotions) ? promotionPayload.promotions : [];
        setStats((previous) => ({
          ...previous,
          promotions,
          promotionOverview: promotionPayload.statistics || {
            totalPromotions: promotions.length,
            activePromotions: promotions.filter((item) => item.status === 'running' || item.is_active).length,
            inactivePromotions: promotions.filter((item) => item.status === 'expired' || item.status === 'disabled' || !item.is_active).length,
            expiringSoon: 0,
            voucherPromotions: promotions.filter((item) => item.apply_for && item.apply_for !== 'all').length
          }
        }));
      }

      const communityPayload = communityResponse?.data?.data || communityResponse?.data || communityResponse;
      if (communityPayload?.groups) {
        const groups = Array.isArray(communityPayload.groups) ? communityPayload.groups : [];
        setStats((previous) => ({
          ...previous,
          communityGroups: groups,
          communityOverview: communityResponse?.data?.statistics || {
            totalGroups: groups.length,
            activeGroups: groups.filter((item) => item.status === 'active').length,
            pendingGroups: groups.filter((item) => item.status === 'pending').length,
            suspendedGroups: groups.filter((item) => ['suspended', 'rejected'].includes(item.status)).length
          }
        }));
      }

      const contactPayload = contactResponse?.data || contactResponse;
      if (contactPayload?.success) {
        const contactStats = contactPayload.stats || {};
        setStats((previous) => ({
          ...previous,
          contactOverview: {
            total: Number(contactStats.total || 0),
            new: Number(contactStats.new || 0),
            processing: Number(contactStats.processing || 0),
            replied: Number(contactStats.replied || 0),
            closed: Number(contactStats.closed || 0)
          }
        }));
      }

      
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    try {
      const savedLayouts = window.localStorage.getItem(WIDGET_LAYOUT_STORAGE_KEY);
      if (savedLayouts) {
        setWidgetLayouts(JSON.parse(savedLayouts));
      }
    } catch (error) {
      console.warn('Could not load saved widget layouts:', error);
    }
  }, []);

  const handleWidgetLayoutChange = useCallback((currentLayout, allLayouts) => {
    if (!widgetEditMode) return;
    setWidgetLayouts((previous) => {
      const nextLayouts = {
        ...previous,
        [activeSection]: allLayouts && Object.keys(allLayouts).length > 0 ? allLayouts : { lg: currentLayout }
      };
      try {
        window.localStorage.setItem(WIDGET_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayouts));
      } catch (error) {
        console.warn('Could not save widget layouts:', error);
      }
      return nextLayouts;
    });
  }, [activeSection, widgetEditMode]);

  useEffect(() => {
    const syncStatistics = () => {
      fetchStatistics();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncStatistics();
      }
    };

    window.addEventListener('focus', syncStatistics);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', syncStatistics);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatistics]);

  const filteredData = useMemo(() => stats.chart, [stats.chart]);

  const analysis = useMemo(() => {
    if (!filteredData.length) {
      return { avg: 0, maxMonth: 'N/A', growth: 0, pieData: [], paymentMethodPie: [], appointmentPie: [], refundPie: [], totalRevenue: 0, totalExpense: 0, totalProfit: 0, totalTransactions: 0, totalAppointments: 0, refundAmount: 0 };
    }

    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
    const totalExpense = filteredData.reduce((sum, item) => sum + item.expense, 0);
    const totalProfit = filteredData.reduce((sum, item) => sum + item.profit, 0);
    const avg = totalRevenue / filteredData.length;
    const maxMonthObj = filteredData.reduce((prev, current) => (prev.revenue > current.revenue ? prev : current), { revenue: 0, name: 'N/A' });
    const currentMonth = new Date().getMonth();
    const currentMonthRev = stats.chart[currentMonth]?.revenue || 0;
    const prevMonthRev = stats.chart[currentMonth - 1]?.revenue || 0;
    const growth = prevMonthRev > 0 ? ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100 : 0;

    const pieData = [
      { name: 'Chuyển khoản', value: Number(stats.methodBreakdown?.find((item) => ['bank_transfer', 'vnpay', 'momo'].includes(item.method))?.total || 0) },
      { name: 'Tiền mặt', value: Number(stats.methodBreakdown?.find((item) => item.method === 'cash')?.total || 0) },
      { name: 'Khác', value: Math.max(0, totalRevenue - (Number(stats.methodBreakdown?.find((item) => ['bank_transfer', 'vnpay', 'momo'].includes(item.method))?.total || 0) + Number(stats.methodBreakdown?.find((item) => item.method === 'cash')?.total || 0))) }
    ];

    const paymentMethodPie = (stats.methodBreakdown || []).map((item) => ({ name: item.method, value: Number(item.total || 0) })).filter((item) => item.value > 0).sort((left, right) => right.value - left.value);
    const appointmentPie = [
      { name: 'Hoàn thành', value: Number(stats.summary.completed_appointments || 0) },
      { name: 'Hủy', value: Number(stats.summary.cancelled_appointments || 0) },
      { name: 'Khác', value: Math.max(0, Number(stats.summary.total_appointments || 0) - Number(stats.summary.completed_appointments || 0) - Number(stats.summary.cancelled_appointments || 0)) }
    ].filter((item) => item.value > 0);
    const refundPie = [
      { name: 'Đã hoàn', value: Number(stats.summary.completed_refund_requests || 0) },
      { name: 'Đang chờ', value: Number(stats.summary.pending_refund_requests || 0) },
      { name: 'Khác', value: Math.max(0, Number(stats.summary.total_refund_requests || 0) - Number(stats.summary.completed_refund_requests || 0) - Number(stats.summary.pending_refund_requests || 0)) }
    ].filter((item) => item.value > 0);

    return { avg, maxMonth: maxMonthObj.fullName, growth, pieData, paymentMethodPie, appointmentPie, refundPie, totalRevenue, totalExpense, totalProfit, totalTransactions: Number(stats.summary.total_transactions || 0), totalAppointments: Number(stats.summary.total_appointments || 0), refundAmount: Number(stats.summary.total_refund_amount || 0) };
  }, [filteredData, stats.chart, stats.methodBreakdown, stats.summary]);

  const paymentMethodData = useMemo(() => analysis.paymentMethodPie || [], [analysis.paymentMethodPie]);
  const appointmentStatusData = useMemo(() => {
    const statusCounts = stats.appointmentOverview?.statusCounts || {};
    const completed = Number(statusCounts.completed || stats.summary.completed_appointments || 0);
    const cancelled = Number(statusCounts.cancelled || stats.summary.cancelled_appointments || 0);
    const confirmed = Number(statusCounts.confirmed || 0);
    const pending = Number(statusCounts.pending || 0);
    const inProgress = Number(statusCounts.in_progress || 0);
    return [
      { name: 'Hoàn thành', value: completed },
      { name: 'Đã hủy', value: cancelled },
      { name: 'Đã xác nhận', value: confirmed },
      { name: 'Chờ xử lý', value: pending },
      { name: 'Đang khám', value: inProgress }
    ].filter((item) => item.value > 0);
  }, [stats.appointmentOverview, stats.summary]);
  const refundStatusData = useMemo(() => [
    { name: 'Đã hoàn', value: Number(stats.summary.completed_refund_requests || 0) },
    { name: 'Đang chờ', value: Number(stats.summary.pending_refund_requests || 0) },
    { name: 'Tổng còn lại', value: Math.max(0, Number(stats.summary.total_refund_requests || 0) - Number(stats.summary.completed_refund_requests || 0) - Number(stats.summary.pending_refund_requests || 0)) }
  ].filter((item) => item.value > 0), [stats.summary]);

  const radarData = useMemo(() => ([
    { metric: 'Doanh thu', value: Math.min(100, Number(stats.summary.total || 0) / 1000000), fullMark: 100 },
    { metric: 'Lịch hẹn', value: Math.min(100, Number(stats.summary.total_appointments || 0)), fullMark: 100 },
    { metric: 'Thanh toán', value: Math.min(100, Number(stats.summary.payment_conversion_rate || 0)), fullMark: 100 },
    { metric: 'Hoàn thành', value: Math.min(100, Number(stats.summary.appointment_completion_rate || 0)), fullMark: 100 },
    { metric: 'Hoàn tiền', value: Math.min(100, Number(stats.summary.refund_rate || 0)), fullMark: 100 }
  ]), [stats.summary]);

  const topServicesData = useMemo(() => (stats.topServices || []).slice(0, 8).map((item, index) => ({ id: item.id, name: item.name || `Dịch vụ ${index + 1}`, count: Number(item.count || 0) })), [stats.topServices]);
  const topDoctorsData = useMemo(() => (stats.topDoctors || []).slice(0, 8).map((item, index) => ({ id: item.id, name: item.name || `Bác sĩ ${index + 1}`, count: Number(item.count || 0) })), [stats.topDoctors]);
  const userRoleData = useMemo(() => ([
    { name: 'Quản trị', value: Number(stats.userStats?.roles?.admin || 0) },
    { name: 'Bác sĩ', value: Number(stats.userStats?.roles?.doctor || 0) },
    { name: 'Nhân viên', value: Number(stats.userStats?.roles?.staff || 0) },
    { name: 'Bệnh nhân', value: Number(stats.userStats?.roles?.patient || 0) }
  ].filter((item) => item.value > 0)), [stats.userStats]);
  const departmentStatsData = useMemo(() => (stats.departmentStats || []).map((item) => ({ code: item.code, name: item.name || item.code, total_staff: Number(item.total_staff || 0), managers: Number(item.managers || 0), active_staff: Number(item.active_staff || 0), inactive_staff: Number(item.inactive_staff || 0) })).filter((item) => item.total_staff > 0), [stats.departmentStats]);
  const consultationStatusData = useMemo(() => (stats.consultationOverview?.by_status || []).filter((item) => Number(item.value || 0) > 0), [stats.consultationOverview]);
  const consultationTypeData = useMemo(() => (stats.consultationOverview?.by_type || []).filter((item) => Number(item.value || 0) > 0), [stats.consultationOverview]);
  const onlineConsultationServiceData = useMemo(() => (stats.consultationOverview?.by_type || []).map((item, index) => ({ id: item.id || index, name: item.name || item.consultation_type || `Tư vấn ${index + 1}`, count: Number(item.value || 0) })).filter((item) => item.count > 0), [stats.consultationOverview]);
  const consultationRatingData = useMemo(() => (stats.consultationOverview?.rating_breakdown || []).filter((item) => Number(item.value || 0) > 0), [stats.consultationOverview]);
  const dailyChartData = useMemo(() => (stats.dailyChart || [])
    .map((item) => ({ ...item, dayLabel: String(item.day || '').slice(5) || item.day }))
    .sort((left, right) => String(left.day || '').localeCompare(String(right.day || ''))), [stats.dailyChart]);
  const refundMonthlyData = useMemo(() => (stats.refundMonthly || []).map((item) => ({ ...item, label: item.fullName })), [stats.refundMonthly]);
  const promotionsData = useMemo(() => (stats.promotions || []).map((item, index) => ({
    id: item.id || index,
    name: item.name || item.title || `Khuyến mãi ${index + 1}`,
    status: item.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động',
    endDate: item.end_date,
    applyFor: item.apply_for || 'all',
    raw: item
  })), [stats.promotions]);
  const communityGroupsData = useMemo(() => (stats.communityGroups || []).map((item, index) => ({
    id: item.id || index,
    name: item.name || item.title || item.slug || `Nhóm ${index + 1}`,
    status: item.status || 'unknown',
    members: Number(item.member_count || item.members_count || item.total_members || 0),
    posts: Number(item.post_count || item.total_posts || 0),
    raw: item
  })), [stats.communityGroups]);
  const eventTopData = useMemo(() => (stats.eventOverview?.top_events || []).map((item, index) => ({
    id: item.id || index,
    name: item.name || item.title || `Sự kiện ${index + 1}`,
    views: Number(item.views || item.total_views || 0),
    clicks: Number(item.clicks || item.total_clicks || 0),
    ctr: item.ctr || item.avg_ctr || 0
  })), [stats.eventOverview]);
  const articleStatusData = useMemo(() => ([
    { name: 'Đã duyệt', value: Number(stats.articleOverview?.approved || 0) },
    { name: 'Chờ duyệt', value: Number(stats.articleOverview?.pending || 0) },
    { name: 'Chờ duyệt y khoa', value: Number(stats.articleOverview?.pending_medical || 0) },
    { name: 'Bị từ chối', value: Number(stats.articleOverview?.rejected || 0) },
    { name: 'Cần sửa', value: Number(stats.articleOverview?.request_edit || 0) },
    { name: 'Cần viết lại', value: Number(stats.articleOverview?.request_rewrite || 0) }
  ].filter((item) => item.value > 0)), [stats.articleOverview]);
  const forumQuestionStatusData = useMemo(() => Object.entries(stats.forumOverview?.statusCounts || {})
    .map(([name, value]) => ({ name, value: Number(value || 0) }))
    .filter((item) => item.value > 0), [stats.forumOverview]);
  const recentForumQuestions = useMemo(() => (stats.forumOverview?.recentQuestions || []).slice(0, 5), [stats.forumOverview]);
  const recentArticles = useMemo(() => (stats.articleOverview?.articles || []).slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    category: item.category?.name || item.category_name || 'Chưa phân loại',
    views: Number(item.views || 0),
    reports: Number(item.report_count || 0),
    author: item.author?.full_name || item.author?.username || 'Không rõ'
  })), [stats.articleOverview]);
  const contactStatusData = useMemo(() => ([
    { name: 'Mới', value: Number(stats.contactOverview?.new || 0) },
    { name: 'Đang xử lý', value: Number(stats.contactOverview?.processing || 0) },
    { name: 'Đã phản hồi', value: Number(stats.contactOverview?.replied || 0) },
    { name: 'Đóng', value: Number(stats.contactOverview?.closed || 0) }
  ].filter((item) => item.value > 0)), [stats.contactOverview]);
  const communityStatusData = useMemo(() => ([
    { name: 'Đang hoạt động', value: Number(stats.communityOverview?.activeGroups || 0) },
    { name: 'Chờ duyệt', value: Number(stats.communityOverview?.pendingGroups || 0) },
    { name: 'Tạm dừng', value: Number(stats.communityOverview?.suspendedGroups || 0) }
  ].filter((item) => item.value > 0)), [stats.communityOverview]);
  // Audit action chart removed — audit statistics are no longer displayed on the Statistics page.

  const sortByNumeric = (rows, key = 'count') => [...rows].sort((left, right) => Number(right[key] || 0) - Number(left[key] || 0)).slice(0, 10);

  const dailyRevenueTop10 = useMemo(() => sortByNumeric(dailyChartData.map((item) => ({ ...item, value: Number(item.revenue || 0) })), 'value'), [dailyChartData]);
  const topServicesTop10 = useMemo(() => sortByNumeric(topServicesData), [topServicesData]);
  const topDoctorsTop10 = useMemo(() => sortByNumeric(topDoctorsData), [topDoctorsData]);
  const consultationStatusTop10 = useMemo(() => sortByNumeric(consultationStatusData, 'value'), [consultationStatusData]);
  const consultationRatingTop10 = useMemo(() => sortByNumeric(consultationRatingData, 'value'), [consultationRatingData]);
  const departmentTop10 = useMemo(() => sortByNumeric(departmentStatsData, 'total_staff'), [departmentStatsData]);
  const eventTop10 = useMemo(() => sortByNumeric(eventTopData, 'views'), [eventTopData]);
  const promotionTop10 = useMemo(() => promotionsData.slice(0, 10), [promotionsData]);
  const communityTop10 = useMemo(() => sortByNumeric(communityGroupsData, 'members'), [communityGroupsData]);

  const createRouteRow = (title, category, subtitle, detail, value, routePath, routeLabel = 'Xem', routeState = null) => ({ title, category, subtitle, detail, value, routePath, routeLabel, routeState });

  const openChartModal = (title, subtitle, rows) => {
    setChartModalTitle(title);
    setChartModalSubtitle(subtitle);
    setChartModalRows(normalizeModalRows(rows));
    setChartModalContext({ kind: 'generic', actionLabel: 'Xem' });
    setShowChartModal(true);
  };

  const openDetailModal = useCallback(async (kind) => {
    const action = buildDetailAction(kind);
    setChartModalTitle(
      kind === 'appointments' ? 'Chi tiết lịch hẹn' :
      kind === 'payments' ? 'Chi tiết giao dịch' :
      kind === 'refunds' ? 'Chi tiết hoàn tiền' :
      kind === 'users' ? 'Chi tiết người dùng' : 'Chi tiết thống kê'
    );
    setChartModalSubtitle(
      kind === 'appointments' ? 'Danh sách lịch hẹn theo năm đang chọn' :
      kind === 'payments' ? 'Danh sách giao dịch theo năm đang chọn' :
      kind === 'refunds' ? 'Danh sách yêu cầu hoàn tiền theo năm đang chọn' :
      kind === 'users' ? 'Phân bổ người dùng theo vai trò và trạng thái tài khoản' : 'Dữ liệu chi tiết'
    );
    setChartModalContext({ kind, ...action });
    setChartModalRows([]);
    setShowChartModal(true);
    setChartModalLoading(true);
    try {
      if (kind === 'users') {
        setChartModalRows([
          { title: 'Tổng người dùng', category: 'Hệ thống', subtitle: 'Tổng số tài khoản trong hệ thống', detail: `Đã xác thực: ${stats.userStats?.verifiedUsers || 0} • Đang hoạt động: ${stats.userStats?.activeUsers || 0}`, value: stats.userStats?.totalUsers || 0, routeLabel: 'Xem quản lý người dùng', routePath: '/quan-ly-nguoi-dung' },
          { title: 'Quản trị', category: 'Vai trò', subtitle: 'Tài khoản admin', detail: `Số lượng: ${stats.userStats?.roles?.admin || 0}`, value: stats.userStats?.roles?.admin || 0, routeLabel: 'Xem quản lý người dùng', routePath: '/quan-ly-nguoi-dung' },
          { title: 'Bác sĩ', category: 'Vai trò', subtitle: 'Tài khoản bác sĩ', detail: `Số lượng: ${stats.userStats?.roles?.doctor || 0}`, value: stats.userStats?.roles?.doctor || 0, routeLabel: 'Xem quản lý người dùng', routePath: '/quan-ly-nguoi-dung' },
          { title: 'Nhân viên', category: 'Vai trò', subtitle: 'Tài khoản nhân viên', detail: `Số lượng: ${stats.userStats?.roles?.staff || 0}`, value: stats.userStats?.roles?.staff || 0, routeLabel: 'Xem quản lý người dùng', routePath: '/quan-ly-nguoi-dung' },
          { title: 'Bệnh nhân', category: 'Vai trò', subtitle: 'Tài khoản bệnh nhân', detail: `Số lượng: ${stats.userStats?.roles?.patient || 0}`, value: stats.userStats?.roles?.patient || 0, routeLabel: 'Xem quản lý người dùng', routePath: '/quan-ly-nguoi-dung' }
        ]);
      } else {
        setChartModalRows([]);
      }
    } catch (error) {
      console.error('Error loading detail modal data:', error);
      toast.error('Không thể tải dữ liệu chi tiết');
      setChartModalRows([]);
    } finally {
      setChartModalLoading(false);
    }
  }, [stats.userStats]);

  const overviewMetricCards = useMemo(() => ([
    { label: 'Doanh thu', value: formatCurrency(analysis.totalRevenue), note: `${stats.summary.today || 0} giao dịch hôm nay`, tone: 'primary', onClick: () => openDetailModal('payments'), icon: <FaMoneyBillWave size={16}/> },
    { label: 'Lịch hẹn', value: Number(stats.summary.total_appointments || 0), note: `${Number(stats.summary.completed_appointments || 0)} hoàn thành`, tone: 'success', onClick: () => openDetailModal('appointments'), icon: <FaCalendarCheck size={16}/> },
    { label: 'Người dùng', value: Number(stats.userStats?.totalUsers || 0), note: `${Number(stats.userStats?.verifiedUsers || 0)} đã xác minh`, tone: 'info', onClick: () => openDetailModal('users'), icon: <FaClipboardList size={16}/> },
    { label: 'Tư vấn', value: Number(stats.consultationOverview?.total_consultations || 0), note: `${Number(stats.consultationOverview?.total_reviews || 0)} đánh giá`, tone: 'warning', onClick: () => openChartModal('Tư vấn online', 'Tổng hợp theo loại dịch vụ tư vấn', consultationTypeData.map((item) => createRouteRow(item.name || item.consultation_type, 'Tư vấn', 'Phân bổ theo loại dịch vụ', `Số lượng: ${item.value}`, item.value, '/quan-ly-tu-van/realtime', 'Xem tư vấn'))), icon: <FaChartLine size={16}/> },
    { label: 'Diễn đàn', value: Number(stats.forumOverview?.totalQuestions || 0), note: `${Number(stats.forumOverview?.totalAnswers || 0)} trả lời • ${Number(stats.forumOverview?.topicCount || 0)} chủ đề`, tone: 'primary', onClick: () => setActiveSection('content'), icon: <FaClipboardList size={16}/> },
    { label: 'Bài viết', value: Number(stats.articleOverview?.total || 0), note: `${Number(stats.articleOverview?.approved || 0)} đã duyệt • ${Number(stats.articleOverview?.action_required || 0)} cần xử lý`, tone: 'success', onClick: () => setActiveSection('content'), icon: <FaFileWord size={16}/> },
    { label: 'Cộng đồng', value: Number(stats.communityOverview?.totalGroups || 0), note: `${Number(stats.communityOverview?.activeGroups || 0)} đang hoạt động • ${Number(stats.communityOverview?.pendingGroups || 0)} chờ duyệt`, tone: 'info', onClick: () => setActiveSection('content'), icon: <FaUsers size={16}/> },
    { label: 'Sự kiện', value: Number(stats.eventOverview?.total_events || 0), note: `${Number(stats.eventOverview?.active_events || 0)} đang chạy • ${Number(stats.eventOverview?.total_views || 0)} lượt xem`, tone: 'warning', onClick: () => setActiveSection('events'), icon: <FaCalendar size={16}/> },
    { label: 'Khuyến mãi', value: Number(stats.promotionOverview?.totalPromotions || 0), note: `${Number(stats.promotionOverview?.activePromotions || 0)} đang hoạt động • ${Number(stats.promotionOverview?.expiringSoon || 0)} sắp hết hạn`, tone: 'primary', onClick: () => setActiveSection('events'), icon: <FaFilePdf size={16}/> },
    { label: 'Liên hệ', value: Number(stats.contactOverview?.total || 0), note: `${Number(stats.contactOverview?.processing || 0)} đang xử lý • ${Number(stats.contactOverview?.replied || 0)} đã phản hồi`, tone: 'neutral', onClick: () => setActiveSection('system'), icon: <FaEnvelope size={16}/> }
  ]), [analysis.totalRevenue, consultationTypeData, stats.articleOverview, stats.communityOverview, stats.contactOverview, stats.consultationOverview, stats.eventOverview, stats.forumOverview, stats.promotionOverview, stats.summary, stats.userStats]);

  const sectionMetricCards = useMemo(() => {
    switch (activeSection) {
      case 'finance':
        return [
          { label: 'Doanh thu', value: formatCurrency(analysis.totalRevenue), note: `${stats.summary.today || 0} giao dịch hôm nay`, tone: 'primary', icon: <FaMoneyBillWave size={16}/> },
          { label: 'Thanh toán', value: Number(stats.summary.paid_transactions || 0), note: `${Number(stats.summary.payment_conversion_rate || 0)}% chuyển đổi`, tone: 'success', icon: <FaWallet size={16}/> },
          { label: 'Hoàn tiền', value: Number(stats.summary.total_refund_requests || 0), note: `${Number(stats.summary.total_refund_amount || 0).toLocaleString('vi-VN')} VND`, tone: 'warning', icon: <FaUndo size={16}/> },
          { label: 'Lợi nhuận TB', value: formatCurrency(Number(stats.summary.avg_daily_revenue || 0)), note: 'Trung bình theo ngày', tone: 'info', icon: <FaChartLine size={16}/> }
        ];
      case 'services':
        return [
          { label: 'Tư vấn', value: Number(stats.consultationOverview?.total_consultations || 0), note: `${Number(stats.consultationOverview?.total_reviews || 0)} đánh giá`, tone: 'primary', icon: <FaClipboardList size={16}/> },
          { label: 'Doanh thu tư vấn', value: formatCurrency(Number(stats.consultationOverview?.total_revenue || 0)), note: 'Tổng doanh thu từ tư vấn', tone: 'success', icon: <FaMoneyBillWave size={16}/> },
          { label: 'Đánh giá TB', value: Number(stats.consultationOverview?.avg_rating || 0).toFixed(1), note: 'Trên thang 5 sao', tone: 'warning', icon: <FaChartPie size={16}/> },
          { label: 'Nhóm dịch vụ', value: Number(onlineConsultationServiceData.length || 0), note: 'Dịch vụ được dùng nhiều nhất', tone: 'info', icon: <FaFileWord size={16}/> }
        ];
      case 'appointments':
        return [
          { label: 'Tổng lịch hẹn', value: Number(stats.summary.total_appointments || 0), note: `${Number(stats.summary.completed_appointments || 0)} hoàn thành`, tone: 'primary', icon: <FaCalendarCheck size={16}/> },
          { label: 'Đã hoàn thành', value: Number(stats.summary.completed_appointments || 0), note: `${Number(stats.summary.appointment_completion_rate || 0)}% hoàn tất`, tone: 'success', icon: <FaCheckCircle size={16}/> },
          { label: 'Đã hủy', value: Number(stats.summary.cancelled_appointments || 0), note: `${Number(stats.summary.appointment_cancellation_rate || 0)}% hủy`, tone: 'danger', icon: <FaUndo size={16}/> },
          { label: 'Hoàn tiền', value: Number(stats.summary.total_refund_requests || 0), note: `${Number(stats.summary.completed_refund_requests || 0)} đã xử lý`, tone: 'warning', icon: <FaWallet size={16}/> }
        ];
      case 'users':
        return [
          { label: 'Tổng người dùng', value: Number(stats.userStats?.totalUsers || 0), note: `${Number(stats.userStats?.verifiedUsers || 0)} đã xác minh`, tone: 'primary', icon: <FaClipboardList size={16}/> },
          { label: 'Bác sĩ', value: Number(stats.userStats?.roles?.doctor || 0), note: 'Tài khoản bác sĩ', tone: 'success', icon: <FaUserMd size={16}/> },
          { label: 'Nhân viên', value: Number(stats.userStats?.roles?.staff || 0), note: 'Tài khoản nhân viên', tone: 'info', icon: <FaUser size={16}/> },
          { label: 'Bệnh nhân', value: Number(stats.userStats?.roles?.patient || 0), note: 'Tài khoản bệnh nhân', tone: 'warning', icon: <FaUsers size={16}/> }
        ];
      case 'content':
        return [
          { label: 'Diễn đàn', value: Number(stats.forumOverview?.totalQuestions || 0), note: `${Number(stats.forumOverview?.totalAnswers || 0)} trả lời`, tone: 'primary', icon: <FaClipboardList size={16}/> },
          { label: 'Bài viết', value: Number(stats.articleOverview?.total || 0), note: `${Number(stats.articleOverview?.action_required || 0)} cần xử lý`, tone: 'success', icon: <FaFileWord size={16}/> },
          { label: 'Cộng đồng', value: Number(stats.communityOverview?.totalGroups || 0), note: `${Number(stats.communityOverview?.activeGroups || 0)} đang hoạt động`, tone: 'info', icon: <FaUsers size={16}/> },
          { label: 'Nội dung cần duyệt', value: Number(stats.forumOverview?.unansweredQuestions || 0) + Number(stats.articleOverview?.action_required || 0) + Number(stats.communityOverview?.pendingGroups || 0), note: 'Việc cần ưu tiên', tone: 'warning', icon: <FaChartBar size={16}/> }
        ];
      case 'events':
        return [
          { label: 'Sự kiện', value: Number(stats.eventOverview?.total_events || 0), note: `${Number(stats.eventOverview?.active_events || 0)} đang chạy`, tone: 'primary', icon: <FaCalendar size={16}/> },
          { label: 'Lượt xem', value: Number(stats.eventOverview?.total_views || 0), note: `${Number(stats.eventOverview?.total_clicks || 0)} lượt click`, tone: 'success', icon: <FaChartLine size={16}/> },
          { label: 'Khuyến mãi', value: Number(stats.promotionOverview?.totalPromotions || 0), note: `${Number(stats.promotionOverview?.activePromotions || 0)} đang hoạt động`, tone: 'info', icon: <FaFilePdf size={16}/> },
          { label: 'Sắp hết hạn', value: Number(stats.promotionOverview?.expiringSoon || 0), note: 'Cần theo dõi sớm', tone: 'warning', icon: <FaUndo size={16}/> }
        ];
      case 'system':
        return [
          { label: 'Liên hệ', value: Number(stats.contactOverview?.total || 0), note: `${Number(stats.contactOverview?.processing || 0)} đang xử lý`, tone: 'primary', icon: <FaEnvelope size={16}/> },
          { label: 'Đã phản hồi', value: Number(stats.contactOverview?.replied || 0), note: `${Number(stats.contactOverview?.closed || 0)} đã đóng`, tone: 'success', icon: <FaCheckCircle size={16}/> }
        ];
      default:
        return [];
    }
  }, [activeSection, analysis.totalRevenue, onlineConsultationServiceData.length, stats.communityOverview, stats.contactOverview, stats.consultationOverview, stats.eventOverview, stats.forumOverview, stats.promotionOverview, stats.summary, stats.userStats]);

  const renderMetricStrip = (cards) => (
    <div className="statistics-kpi-grid statistics-kpi-grid--compact statistics-kpi-grid--section">
      {cards.map((card) => (
        <div key={card.label} className={`statistics-kpi-card ${card.tone} statistics-kpi-card--clickable`} onClick={card.onClick} role={card.onClick ? 'button' : undefined} tabIndex={card.onClick ? 0 : undefined}>
          <div className="statistics-kpi-header">
            <span className="statistics-kpi-label">{card.label}</span>
            <div className="statistics-kpi-icon">{card.icon}</div>
          </div>
          <div className="statistics-kpi-value">{card.value}</div>
          <div className="statistics-kpi-trend neutral">{card.note}</div>
        </div>
      ))}
    </div>
  );

  const downloadRowsCsv = (fileName, rows) => {
    if (!rows || rows.length === 0) {
      toast.info('Không có dữ liệu để tải xuống');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    toast.success('Đã tải xuống dữ liệu chart');
  };

  const exportExcelWorkbook = (mode = 'all') => {
    const workbook = XLSX.utils.book_new();
    const financeRows = filteredData.map((item) => ({ 'Tháng': item.fullName, 'Doanh thu': item.revenue, 'Chi phí': item.expense, 'Lợi nhuận': item.profit }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(financeRows), 'Tai chinh');
    if (mode !== 'finance') {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats.appointmentChart.map((item) => ({ 'Tháng': item.fullName, 'Số lịch hẹn': item.count }))), 'Van hanh');
    }
    const suffix = mode === 'finance' ? 'Tai_chinh' : 'Tong_hop';
    XLSX.writeFile(workbook, `Bao_cao_${suffix}_${year}.xlsx`);
    toast.success('Đã xuất báo cáo Excel!');
    setShowExportModal(false);
  };

  const exportToExcel = () => exportExcelWorkbook('all');
  const exportFinanceExcel = () => exportExcelWorkbook('finance');
  const exportOperationsExcel = () => exportExcelWorkbook('operations');
  const exportToPDF = () => { window.print(); toast.info('Vui lòng chọn "Lưu dưới dạng PDF" trong hộp thoại in'); setShowExportModal(false); };
  const exportToCSV = () => {
    const csv = [['Tháng', 'Doanh thu', 'Chi phí', 'Lợi nhuận'], ...filteredData.map((item) => [item.fullName, item.revenue, item.expense, item.profit])].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_doanh_thu_${year}.csv`;
    link.click();
    toast.success('Đã xuất file CSV!');
    setShowExportModal(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="statistics-custom-tooltip">
          <p className="label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="value" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="statistics-page-wrapper">
        <div className="statistics-loading">
          <div className="statistics-spinner"></div>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-page-wrapper">
      <div className="statistics-page-container">
        <div className="statistics-hero" style={{ marginBottom: '16px' }}>
          <div>
            <p className="statistics-insight-kicker">Executive dashboard</p>
            <h2 className="statistics-insight-title">Thống kê vận hành toàn hệ thống</h2>
            <p className="statistics-insight-note">
              Dữ liệu được gom theo các nhóm quyết định chính: doanh thu, vận hành khám chữa, người dùng, cộng đồng và marketing.
            </p>
            <div className="statistics-hero-meta">
              <div className="statistics-select-group statistics-select-group--hero">
                <FaCalendarAlt size={14}/>
                <span className="statistics-select-label">Năm dữ liệu</span>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="statistics-select"
                >
                  {[2023, 2024, 2025, 2026].map((value) => (
                    <option key={value} value={value}>Năm {value}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="statistics-actions">
            <button className={`statistics-btn ${widgetEditMode ? 'statistics-btn-primary' : 'statistics-btn-secondary'}`} onClick={() => setWidgetEditMode((previous) => !previous)}>
              <FaChartBar size={13}/> {widgetEditMode ? 'Khóa widget' : 'Sửa widget'}
            </button>
            <button className="statistics-btn statistics-btn-secondary" onClick={() => setShowExportModal(true)}>
              <FaDownload size={13}/> Xuất báo cáo
            </button>
            <button className="statistics-btn statistics-btn-primary" onClick={() => window.print()}>
              <FaPrint size={13}/> In
            </button>
          </div>
        </div>

        <div className="statistics-tabs">
          <button className={`statistics-tab ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>Tổng quan</button>
          <button className={`statistics-tab ${activeSection === 'finance' ? 'active' : ''}`} onClick={() => setActiveSection('finance')}>Tài chính</button>
          <button className={`statistics-tab ${activeSection === 'services' ? 'active' : ''}`} onClick={() => setActiveSection('services')}>Dịch vụ</button>
          <button className={`statistics-tab ${activeSection === 'appointments' ? 'active' : ''}`} onClick={() => setActiveSection('appointments')}>Lịch hẹn</button>
          <button className={`statistics-tab ${activeSection === 'users' ? 'active' : ''}`} onClick={() => setActiveSection('users')}>Người dùng</button>
          <button className={`statistics-tab ${activeSection === 'content' ? 'active' : ''}`} onClick={() => setActiveSection('content')}>Nội dung</button>
          <button className={`statistics-tab ${activeSection === 'events' ? 'active' : ''}`} onClick={() => setActiveSection('events')}>Sự kiện & KM</button>
          <button className={`statistics-tab ${activeSection === 'system' ? 'active' : ''}`} onClick={() => setActiveSection('system')}>Liên hệ & Hệ thống</button>
        </div>

        {activeSection === 'overview' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Tổng quan</p>
                <h3 className="statistics-section-title">Bức tranh vận hành theo năm đang chọn</h3>
                <p className="statistics-section-desc">Gom các số liệu quan trọng nhất từ toàn hệ thống để nhìn nhanh tình hình chung.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(overviewMetricCards)}
            <GridLayout
              className="statistics-widget-grid statistics-charts-grid--dense"
              rowHeight={34}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              compactType="vertical"
              preventCollision={widgetEditMode}
              isDraggable={widgetEditMode}
              isResizable={widgetEditMode}
              draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined}
              draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select"
              margin={[16, 16]}
              layouts={widgetLayouts[activeSection] || {}}
              onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)}
              onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}
            >
              <div key="overview-revenue" data-grid={{ x: 0, y: 0, w: 8, h: 12, minW: 4, minH: 9 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartLine/> Doanh thu theo tháng</h3>
                    <div className="statistics-chart-actions">
                      <button className="statistics-chart-btn" onClick={() => openChartModal('Doanh thu theo tháng', 'Chi tiết doanh thu từng tháng của năm đang chọn', filteredData.map((item) => createRouteRow(item.fullName, 'Doanh thu', `Năm ${year}`, `Doanh thu: ${formatCurrency(item.revenue)} • Chi phí: ${formatCurrency(item.expense)} • Lợi nhuận: ${formatCurrency(item.profit)}`, item.revenue, '/quan-ly-thanh-toan/giao-dich', 'Xem giao dịch')))}>
                        Xem chi tiết
                      </button>
                      <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`doanh_thu_${year}.csv`, filteredData.map((item) => ({ Thang: item.fullName, DoanhThu: item.revenue, ChiPhi: item.expense, LoiNhuan: item.profit })))}>
                        Tải xuống
                      </button>
                    </div>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#43a047" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#43a047" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value / 1000000}M`}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend />
                        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#43a047" strokeWidth={2} fill="url(#colorRevenue)" />
                        <Area type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#42a5f5" strokeWidth={2} fill="#42a5f5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="overview-appointments" data-grid={{ x: 8, y: 0, w: 4, h: 11, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaCalendarCheck/> Lịch hẹn theo tháng</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Lịch hẹn theo tháng', 'Tổng số lịch hẹn theo tháng trong năm', stats.appointmentChart.map((item) => createRouteRow(item.fullName, 'Lịch hẹn', `Năm ${year}`, `Số lịch: ${item.count}`, item.count, '/quan-ly-lich-hen', 'Xem lịch')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.appointmentOverview?.monthly?.length ? stats.appointmentOverview.monthly : stats.appointmentChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                        <YAxis tick={{ fontSize: 11 }}/>
                        <Tooltip formatter={(value) => `${value} lịch`}/>
                        <Legend />
                        <Bar dataKey="count" name="Lịch hẹn" fill="#43a047" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="overview-user-roles" data-grid={{ x: 0, y: 12, w: 6, h: 11, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaUsers/> Người dùng theo vai trò</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Người dùng theo vai trò', 'Phân bố tài khoản trong hệ thống', userRoleData.map((item) => createRouteRow(item.name, 'Người dùng', 'Theo vai trò', `Số lượng: ${item.value}`, item.value, '/quan-ly-nguoi-dung', 'Mở quản lý người dùng')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={userRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80}>
                          {userRoleData.map((entry, index) => <Cell key={`user-role-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} tài khoản`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="overview-daily" data-grid={{ x: 6, y: 12, w: 6, h: 11, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaCalendarAlt/> Dòng tiền theo ngày</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Dòng tiền theo ngày', 'Biến động doanh thu từng ngày trong năm', dailyRevenueTop10.map((item) => createRouteRow(item.dayLabel, 'Doanh thu ngày', 'Theo ngày', `Doanh thu: ${formatCurrency(item.revenue)} • Chi phí: ${formatCurrency(item.expense)} • Lợi nhuận: ${formatCurrency(item.profit)}`, item.revenue, '/quan-ly-thanh-toan/giao-dich', 'Xem giao dịch')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="dayLabel" tick={{ fontSize: 10 }} minTickGap={12}/>
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value / 1000000}M`}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Doanh thu ngày" stroke="#43a047" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="profit" name="Lợi nhuận ngày" stroke="#42a5f5" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="overview-forum-status" data-grid={{ x: 0, y: 23, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Trạng thái diễn đàn</h3>
                    <button className="statistics-chart-btn" onClick={() => setActiveSection('content')}>
                      Xem nội dung
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={forumQuestionStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80}>
                          {forumQuestionStatusData.map((entry, index) => <Cell key={`overview-forum-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} câu hỏi`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="overview-article-status" data-grid={{ x: 4, y: 23, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaFileWord/> Trạng thái bài viết</h3>
                    <button className="statistics-chart-btn" onClick={() => setActiveSection('content')}>
                      Xem nội dung
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={articleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={72}>
                          {articleStatusData.map((entry, index) => <Cell key={`overview-article-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} bài`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="overview-community-status" data-grid={{ x: 8, y: 23, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaUsers/> Trạng thái cộng đồng</h3>
                    <button className="statistics-chart-btn" onClick={() => setActiveSection('content')}>
                      Xem nội dung
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={communityStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={72}>
                          {communityStatusData.map((entry, index) => <Cell key={`overview-community-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} nhóm`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="overview-contact-status" data-grid={{ x: 0, y: 33, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaEnvelope/> Trạng thái liên hệ</h3>
                    <button className="statistics-chart-btn" onClick={() => setActiveSection('system')}>
                      Xem hệ thống
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={contactStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={72}>
                          {contactStatusData.map((entry, index) => <Cell key={`overview-contact-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} liên hệ`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Audit widget removed as per request */}
            </GridLayout>
          </div>
        )}

        {activeSection === 'finance' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Tài chính</p>
                <h3 className="statistics-section-title">Doanh thu, phương thức thanh toán, hoàn tiền</h3>
                <p className="statistics-section-desc">Theo dõi tiền vào, tiền ra và các khoản cần đối soát trong năm.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(sectionMetricCards)}
            <GridLayout
              className="statistics-widget-grid statistics-charts-grid--dense"
              rowHeight={34}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              compactType="vertical"
              preventCollision={widgetEditMode}
              isDraggable={widgetEditMode}
              isResizable={widgetEditMode}
              draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined}
              draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select"
              margin={[16, 16]}
              layouts={widgetLayouts[activeSection] || {}}
              onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)}
              onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}
            >
              <div key="finance-monthly" data-grid={{ x: 0, y: 0, w: 8, h: 12, minW: 4, minH: 9 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartLine/> Doanh thu theo tháng</h3>
                    <div className="statistics-chart-actions">
                      <button className="statistics-chart-btn" onClick={() => openChartModal('Doanh thu theo tháng', 'Chi tiết doanh thu từng tháng', filteredData.map((item) => createRouteRow(item.fullName, 'Doanh thu', `Năm ${year}`, `Doanh thu: ${formatCurrency(item.revenue)} • Chi phí: ${formatCurrency(item.expense)} • Lợi nhuận: ${formatCurrency(item.profit)}`, item.revenue, '/quan-ly-thanh-toan/giao-dich', 'Xem giao dịch')))}>
                        Xem chi tiết
                      </button>
                      <button className="statistics-chart-btn" onClick={() => downloadRowsCsv(`doanh_thu_${year}.csv`, filteredData.map((item) => ({ Thang: item.fullName, DoanhThu: item.revenue, ChiPhi: item.expense, LoiNhuan: item.profit })))}>
                        Tải xuống
                      </button>
                    </div>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredData}>
                        <defs>
                          <linearGradient id="colorRevenueFinance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#43a047" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#43a047" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value / 1000000}M`}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend />
                        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#43a047" strokeWidth={2} fill="url(#colorRevenueFinance)" />
                        <Area type="monotone" dataKey="expense" name="Chi phí" stroke="#ef5350" strokeWidth={2} fill="#ef5350" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="finance-payment" data-grid={{ x: 8, y: 0, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartPie/> Phương thức thanh toán</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Phương thức thanh toán', 'Phân bổ doanh thu theo phương thức', paymentMethodData.map((item) => createRouteRow(item.name, 'Thanh toán', 'Phương thức sử dụng', `Giá trị: ${formatCurrency(item.value)}`, item.value, '/quan-ly-thanh-toan/giao-dich', 'Xem giao dịch')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                          {paymentMethodData.map((entry, index) => <Cell key={`payment-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)}/>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="finance-refund" data-grid={{ x: 0, y: 12, w: 4, h: 9, minW: 3, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaUndo/> Hoàn tiền</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Trạng thái hoàn tiền', 'Tổng quan yêu cầu hoàn tiền', refundStatusData.map((item) => createRouteRow(item.name, 'Hoàn tiền', 'Trạng thái', `Số lượng: ${item.value}`, item.value, '/quan-ly-thanh-toan/hoan-tien', 'Xem yêu cầu')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={refundStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                          {refundStatusData.map((entry, index) => <Cell key={`refund-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} yêu cầu`}/>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="finance-table" data-grid={{ x: 4, y: 12, w: 8, h: 10, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaFileInvoiceDollar/> Bảng chi tiết tài chính</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-card">
                      <div className="statistics-table-header">
                        <h4 className="statistics-table-title">Doanh thu theo tháng</h4>
                      </div>
                      <div className="statistics-table-wrapper">
                        <table className="statistics-table">
                          <thead>
                            <tr><th>Tháng</th><th>Doanh thu</th><th>Chi phí</th><th>Lợi nhuận</th></tr>
                          </thead>
                          <tbody>
                            {filteredData.map((item) => (
                              <tr key={item.month}>
                                <td>{item.fullName}</td>
                                <td>{formatCurrency(item.revenue)}</td>
                                <td>{formatCurrency(item.expense)}</td>
                                <td>{formatCurrency(item.profit)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div key="finance-daily" data-grid={{ x: 0, y: 22, w: 6, h: 11, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaCalendarAlt/> Doanh thu theo ngày</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Doanh thu theo ngày', 'Top ngày phát sinh doanh thu cao nhất', dailyRevenueTop10.map((item) => createRouteRow(item.dayLabel, 'Doanh thu ngày', 'Tài chính', `Doanh thu: ${formatCurrency(item.revenue)} • Lợi nhuận: ${formatCurrency(item.profit)}`, item.revenue, '/quan-ly-thanh-toan/giao-dich', 'Xem giao dịch')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="dayLabel" tick={{ fontSize: 10 }} minTickGap={12}/>
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value / 1000000}M`}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#43a047" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expense" name="Chi phí" stroke="#ef5350" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="finance-daily-top" data-grid={{ x: 6, y: 22, w: 6, h: 11, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Bảng top 10 ngày tài chính</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {dailyRevenueTop10.length > 0 ? dailyRevenueTop10.map((item) => (
                        <div key={`daily-finance-${item.day}`} className="statistics-table-row">
                          <div>
                            <strong>{item.dayLabel}</strong>
                            <div className="statistics-table-sub">Doanh thu ngày</div>
                          </div>
                          <div className="statistics-table-value">{formatCurrency(item.revenue)}</div>
                        </div>
                      )) : <div className="statistics-empty-state">Chưa có dữ liệu ngày</div>}
                    </div>
                  </div>
                </div>
              </div>
            </GridLayout>
          </div>
        )}

        {activeSection === 'services' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Dịch vụ</p>
                <h3 className="statistics-section-title">Tư vấn online, đánh giá và top dịch vụ</h3>
                <p className="statistics-section-desc">Xem khối tư vấn đang chạy tốt đến đâu và dịch vụ nào được chọn nhiều nhất.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(sectionMetricCards)}
            <GridLayout
              className="statistics-widget-grid statistics-charts-grid--dense"
              rowHeight={34}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              compactType="vertical"
              preventCollision={widgetEditMode}
              isDraggable={widgetEditMode}
              isResizable={widgetEditMode}
              draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined}
              draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select"
              margin={[16, 16]}
              layouts={widgetLayouts[activeSection] || {}}
              onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)}
              onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}
            >
              <div key="services-online" data-grid={{ x: 0, y: 0, w: 8, h: 11, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartBar/> Tư vấn online</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Tư vấn online', 'Số lượt tư vấn theo loại', consultationTypeData.map((item) => createRouteRow(item.name, 'Tư vấn', 'Loại dịch vụ', `Số lượt: ${item.value}`, item.value, '/quan-ly-tu-van/realtime', 'Xem tư vấn')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consultationTypeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                        <YAxis tick={{ fontSize: 11 }}/>
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Lượt tư vấn" fill="#42a5f5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="services-rating" data-grid={{ x: 8, y: 0, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartPie/> Đánh giá dịch vụ</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Đánh giá tư vấn', 'Phân bố đánh giá sao', consultationRatingData.map((item) => createRouteRow(item.name, 'Đánh giá', 'Tư vấn online', `Số lượt: ${item.value}`, item.value, '/quan-ly-tu-van/realtime', 'Xem đánh giá')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={consultationRatingData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                          {consultationRatingData.map((entry, index) => <Cell key={`rating-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} lượt`}/>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="services-table" data-grid={{ x: 0, y: 11, w: 8, h: 10, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Bảng chi tiết dịch vụ</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {topServicesData.length > 0 ? topServicesData.map((item) => (
                        <div key={`service-${item.id || item.name}`} className="statistics-table-row">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="statistics-table-sub">{item.count} lượt sử dụng</div>
                          </div>
                          <button className="statistics-chart-btn" onClick={() => openChartModal('Chi tiết dịch vụ', 'Danh sách dịch vụ được sử dụng nhiều nhất', topServicesData.map((service) => createRouteRow(service.name, 'Dịch vụ', 'Top dịch vụ', `Số lượt: ${service.count}`, service.count, '/quan-ly-dich-vu', 'Xem dịch vụ')))}>
                            Xem chi tiết
                          </button>
                        </div>
                      )) : <div className="statistics-empty-state">Chưa có dữ liệu</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div key="services-top" data-grid={{ x: 8, y: 11, w: 4, h: 9, minW: 3, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Top 10 dịch vụ</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {topServicesTop10.length > 0 ? topServicesTop10.map((item, index) => (
                        <div key={`service-top-${item.id || index}`} className="statistics-table-row">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="statistics-table-sub">#{index + 1} trong năm</div>
                          </div>
                          <div className="statistics-table-value">{item.count}</div>
                        </div>
                      )) : <div className="statistics-empty-state">Chưa có dữ liệu</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div key="services-doctors" data-grid={{ x: 0, y: 21, w: 4, h: 9, minW: 3, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Top 10 bác sĩ</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {topDoctorsTop10.length > 0 ? topDoctorsTop10.map((item, index) => (
                        <div key={`doctor-top-${item.id || index}`} className="statistics-table-row">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="statistics-table-sub">#{index + 1} trong năm</div>
                          </div>
                          <div className="statistics-table-value">{item.count}</div>
                        </div>
                      )) : <div className="statistics-empty-state">Chưa có dữ liệu</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div key="services-mix" data-grid={{ x: 4, y: 21, w: 8, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartPie/> Phân bố đánh giá & trạng thái</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {consultationStatusTop10.map((item) => (
                        <div key={`consult-status-${item.name}`} className="statistics-table-row">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="statistics-table-sub">Trạng thái tư vấn</div>
                          </div>
                          <div className="statistics-table-value">{item.value}</div>
                        </div>
                      ))}
                      {consultationRatingTop10.map((item) => (
                        <div key={`consult-rating-${item.name}`} className="statistics-table-row">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="statistics-table-sub">Đánh giá sao</div>
                          </div>
                          <div className="statistics-table-value">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GridLayout>
          </div>
        )}

        {activeSection === 'appointments' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Lịch hẹn</p>
                <h3 className="statistics-section-title">Nhịp đặt lịch và trạng thái xử lý</h3>
                <p className="statistics-section-desc">Nắm nhanh số lịch đã đặt, số đã xử lý và tỷ lệ hoàn tất theo năm.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(sectionMetricCards)}
            <GridLayout
              className="statistics-widget-grid statistics-charts-grid--dense"
              rowHeight={34}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              compactType="vertical"
              preventCollision={widgetEditMode}
              isDraggable={widgetEditMode}
              isResizable={widgetEditMode}
              draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined}
              draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select"
              margin={[16, 16]}
              layouts={widgetLayouts[activeSection] || {}}
              onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)}
              onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}
            >
              <div key="appointments-month" data-grid={{ x: 0, y: 0, w: 8, h: 11, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaCalendarCheck/> Lịch hẹn theo tháng</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Lịch hẹn theo tháng', 'Chi tiết số lượng lịch hẹn từng tháng', stats.appointmentChart.map((item) => createRouteRow(item.fullName, 'Lịch hẹn', `Năm ${year}`, `Số lịch: ${item.count}`, item.count, '/quan-ly-lich-hen', 'Xem lịch')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.appointmentChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                        <YAxis tick={{ fontSize: 11 }}/>
                        <Tooltip formatter={(value) => `${value} lịch`}/>
                        <Legend />
                        <Bar dataKey="count" name="Số lịch" fill="#43a047" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="appointments-status" data-grid={{ x: 8, y: 0, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartPie/> Trạng thái lịch hẹn</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Trạng thái lịch hẹn', 'Tỷ lệ hoàn thành và hủy lịch', appointmentStatusData.map((item) => createRouteRow(item.name, 'Lịch hẹn', 'Trạng thái', `Số lượng: ${item.value}`, item.value, '/quan-ly-lich-hen', 'Xem lịch')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={appointmentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                          {appointmentStatusData.map((entry, index) => <Cell key={`appointment-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} lịch`}/>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="appointments-table" data-grid={{ x: 0, y: 11, w: 8, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Bảng chi tiết lịch hẹn</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      <div className="statistics-table-row">
                        <div><strong>Tổng lịch hẹn</strong><div className="statistics-table-sub">Toàn bộ lịch trong năm</div></div>
                        <div className="statistics-table-value">{stats.appointmentOverview?.summary?.totalAppointments ?? stats.summary.total_appointments}</div>
                      </div>
                      <div className="statistics-table-row">
                        <div><strong>Đã hoàn thành</strong><div className="statistics-table-sub">Lịch đã xử lý xong</div></div>
                        <div className="statistics-table-value">{stats.appointmentOverview?.summary?.completedAppointments ?? stats.summary.completed_appointments}</div>
                      </div>
                      <div className="statistics-table-row">
                        <div><strong>Đã hủy</strong><div className="statistics-table-sub">Lịch bị hủy</div></div>
                        <div className="statistics-table-value">{stats.appointmentOverview?.summary?.cancelledAppointments ?? stats.summary.cancelled_appointments}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div key="appointments-top" data-grid={{ x: 8, y: 11, w: 4, h: 9, minW: 3, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Top 10 tháng lịch hẹn</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {(stats.appointmentOverview?.monthly?.length ? stats.appointmentOverview.monthly : stats.appointmentChart)
                        .slice()
                        .sort((left, right) => Number(right.count || 0) - Number(left.count || 0))
                        .slice(0, 10)
                        .map((item, index) => (
                        <div key={`appt-top-${item.month}`} className="statistics-table-row">
                          <div>
                            <strong>{item.fullName}</strong>
                            <div className="statistics-table-sub">#{index + 1} theo số lịch</div>
                          </div>
                          <div className="statistics-table-value">{item.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GridLayout>
          </div>
        )}

        {activeSection === 'users' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Người dùng</p>
                <h3 className="statistics-section-title">Người dùng, bác sĩ, nhân viên, bệnh nhân</h3>
                <p className="statistics-section-desc">Xem cơ cấu người dùng trong hệ thống theo vai trò và phòng ban phụ trách.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(sectionMetricCards)}
            <GridLayout
              className="statistics-widget-grid statistics-charts-grid--dense"
              rowHeight={34}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              compactType="vertical"
              preventCollision={widgetEditMode}
              isDraggable={widgetEditMode}
              isResizable={widgetEditMode}
              draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined}
              draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select"
              margin={[16, 16]}
              layouts={widgetLayouts[activeSection] || {}}
              onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)}
              onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}
            >
              <div key="users-roles" data-grid={{ x: 0, y: 0, w: 4, h: 10, minW: 3, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Phân bổ vai trò</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Phân bổ người dùng', 'Vai trò trong hệ thống', userRoleData.map((item) => createRouteRow(item.name, 'Người dùng', 'Phân bổ vai trò', `Số lượng: ${item.value}`, item.value, '/quan-ly-nguoi-dung', 'Xem người dùng')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={userRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                          {userRoleData.map((entry, index) => <Cell key={`user-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} tài khoản`}/>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="users-department" data-grid={{ x: 4, y: 0, w: 8, h: 10, minW: 4, minH: 8 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartBar/> Phòng ban</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Thống kê phòng ban', 'Số lượng nhân sự theo phòng ban', departmentStatsData.map((item) => createRouteRow(item.name, 'Phòng ban', 'Nhân sự', `Tổng: ${item.total_staff} • Hoạt động: ${item.active_staff}`, item.total_staff, '/quan-ly-nhan-vien', 'Xem phòng ban')))}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentStatsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                        <XAxis type="number" tick={{ fontSize: 11 }}/>
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140}/>
                        <Tooltip formatter={(value) => `${value} nhân sự`}/>
                        <Bar dataKey="total_staff" name="Tổng nhân sự" fill="#43a047" />
                        <Bar dataKey="active_staff" name="Đang hoạt động" fill="#42a5f5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="users-table" data-grid={{ x: 0, y: 10, w: 8, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Bảng chi tiết người dùng</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {userRoleData.map((item) => (
                        <div key={item.name} className="statistics-table-row">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="statistics-table-sub">Phân bổ vai trò</div>
                          </div>
                          <button className="statistics-chart-btn" onClick={() => openChartModal(`Chi tiết ${item.name}`, 'Thông tin chi tiết theo vai trò', [createRouteRow(item.name, 'Người dùng', 'Vai trò', `Số lượng: ${item.value}`, item.value, '/quan-ly-nguoi-dung', 'Xem người dùng')])}>
                            Xem chi tiết
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div key="users-dept-top" data-grid={{ x: 8, y: 10, w: 4, h: 9, minW: 3, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartBar/> Top 10 phòng ban</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {departmentTop10.length > 0 ? departmentTop10.map((item, index) => (
                        <div key={`dept-top-${item.code || index}`} className="statistics-table-row">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="statistics-table-sub">#{index + 1} nhân sự</div>
                          </div>
                          <div className="statistics-table-value">{item.total_staff}</div>
                        </div>
                      )) : <div className="statistics-empty-state">Chưa có dữ liệu</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div key="users-summary" data-grid={{ x: 0, y: 19, w: 12, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--wide statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Bảng tổng quan người dùng</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {[
                        { label: 'Tổng tài khoản', value: stats.userStats.totalUsers, detail: 'Tất cả người dùng trong hệ thống' },
                        { label: 'Bác sĩ', value: stats.userStats.totalDoctors, detail: 'Tài khoản bác sĩ đang quản lý' },
                        { label: 'Nhân viên', value: stats.userStats.totalStaff, detail: 'Tài khoản nhân viên hành chính/lâm sàng' },
                        { label: 'Bệnh nhân', value: stats.userStats.totalPatients, detail: 'Tài khoản bệnh nhân' }
                      ].map((item) => (
                        <div key={item.label} className="statistics-table-row">
                          <div>
                            <strong>{item.label}</strong>
                            <div className="statistics-table-sub">{item.detail}</div>
                          </div>
                          <div className="statistics-table-value">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GridLayout>
          </div>
        )}

        {activeSection === 'content' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Nội dung</p>
                <h3 className="statistics-section-title">Diễn đàn, bài viết và cộng đồng</h3>
                <p className="statistics-section-desc">Ba mảng nội dung được gộp chung để theo dõi nhanh lượng bài, câu hỏi và nhóm cộng đồng.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(sectionMetricCards)}
            <GridLayout className="statistics-widget-grid statistics-charts-grid--dense" rowHeight={34} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }} compactType="vertical" preventCollision={widgetEditMode} isDraggable={widgetEditMode} isResizable={widgetEditMode} draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined} draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select" margin={[16, 16]} layouts={widgetLayouts[activeSection] || {}} onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)} onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}>
              <div key="forum-summary" data-grid={{ x: 0, y: 0, w: 6, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Tổng quan diễn đàn</h3>
                    <button className="statistics-chart-btn" onClick={() => openChartModal('Diễn đàn', 'Tổng hợp câu hỏi và chủ đề', [
                      createRouteRow('Tổng câu hỏi', 'Diễn đàn', 'Tổng hợp', `Số lượng: ${stats.forumOverview.totalQuestions}`, stats.forumOverview.totalQuestions, '/quan-ly-dien-dan', 'Mở diễn đàn'),
                      createRouteRow('Đã trả lời', 'Diễn đàn', 'Tổng hợp', `Số lượng: ${stats.forumOverview.totalAnswers}`, stats.forumOverview.totalAnswers, '/quan-ly-dien-dan', 'Mở diễn đàn'),
                      createRouteRow('Chủ đề', 'Diễn đàn', 'Tổng hợp', `Số lượng: ${stats.forumOverview.topicCount}`, stats.forumOverview.topicCount, '/quan-ly-dien-dan', 'Mở diễn đàn')
                    ])}>
                      Xem chi tiết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      <div className="statistics-table-row"><div><strong>Tổng câu hỏi</strong><div className="statistics-table-sub">Câu hỏi đã công bố</div></div><div className="statistics-table-value">{stats.forumOverview.totalQuestions}</div></div>
                      <div className="statistics-table-row"><div><strong>Đã trả lời</strong><div className="statistics-table-sub">Tổng số phản hồi</div></div><div className="statistics-table-value">{stats.forumOverview.totalAnswers}</div></div>
                      <div className="statistics-table-row"><div><strong>Chủ đề</strong><div className="statistics-table-sub">Nhóm thảo luận hiện có</div></div><div className="statistics-table-value">{stats.forumOverview.topicCount}</div></div>
                      <div className="statistics-table-row"><div><strong>Chưa có trả lời</strong><div className="statistics-table-sub">Cần ưu tiên xử lý</div></div><div className="statistics-table-value">{stats.forumOverview.unansweredQuestions}</div></div>
                    </div>
                  </div>
                </div>
              </div>

              <div key="forum-status" data-grid={{ x: 6, y: 0, w: 6, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartPie/> Trạng thái câu hỏi</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={forumQuestionStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                          {forumQuestionStatusData.map((entry, index) => <Cell key={`forum-status-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} câu hỏi`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="forum-topics" data-grid={{ x: 0, y: 9, w: 6, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Top chủ đề</h3>
                    <button className="statistics-chart-btn" onClick={() => navigate('/quan-ly-dien-dan')}>
                      Mở quản lý
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {(Array.isArray(stats.forumOverview?.topTopics) ? stats.forumOverview.topTopics : []).length > 0 ? (Array.isArray(stats.forumOverview?.topTopics) ? stats.forumOverview.topTopics : []).map((item, index) => (
                        <div key={`topic-${item.id || index}`} className="statistics-table-row">
                          <div>
                            <strong>{item.title}</strong>
                            <div className="statistics-table-sub">#{index + 1} chủ đề</div>
                          </div>
                          <div className="statistics-table-value">{item.count}</div>
                        </div>
                      )) : <div className="statistics-empty-state">Chưa có dữ liệu chủ đề</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div key="forum-articles" data-grid={{ x: 6, y: 9, w: 6, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Bài viết</h3>
                    <button className="statistics-chart-btn" onClick={() => navigate('/quan-ly-bai-viet')}>
                      Mở quản lý bài viết
                    </button>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      <div className="statistics-table-row"><div><strong>Tổng bài viết</strong><div className="statistics-table-sub">Tất cả trạng thái</div></div><div className="statistics-table-value">{stats.articleOverview.total}</div></div>
                      <div className="statistics-table-row"><div><strong>Đã duyệt</strong><div className="statistics-table-sub">Hiển thị công khai</div></div><div className="statistics-table-value">{stats.articleOverview.approved}</div></div>
                      <div className="statistics-table-row"><div><strong>Chờ duyệt</strong><div className="statistics-table-sub">Cần kiểm tra</div></div><div className="statistics-table-value">{stats.articleOverview.pending + stats.articleOverview.pending_medical}</div></div>
                      <div className="statistics-table-row"><div><strong>Cần xử lý</strong><div className="statistics-table-sub">Sửa hoặc viết lại</div></div><div className="statistics-table-value">{stats.articleOverview.action_required}</div></div>
                    </div>
                  </div>
                </div>
              </div>

              <div key="forum-articles-status" data-grid={{ x: 0, y: 18, w: 6, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaChartPie/> Trạng thái bài viết</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={articleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                          {articleStatusData.map((entry, index) => <Cell key={`article-status-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} bài`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div key="forum-articles-recent" data-grid={{ x: 6, y: 18, w: 6, h: 9, minW: 4, minH: 7 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header">
                    <h3 className="statistics-chart-title"><FaClipboardList/> Bài viết gần đây</h3>
                  </div>
                  <div className="statistics-chart-body">
                    <div className="statistics-table-list">
                      {recentArticles.length > 0 ? recentArticles.map((item) => (
                        <div key={`article-${item.id}`} className="statistics-table-row">
                          <div>
                            <strong>{item.title}</strong>
                            <div className="statistics-table-sub">{item.category} • {item.status} • {item.author}</div>
                          </div>
                          <div className="statistics-table-value">{item.views}</div>
                        </div>
                      )) : <div className="statistics-empty-state">Chưa có dữ liệu bài viết</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div key="content-community-overview" data-grid={{ x: 0, y: 27, w: 6, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header"><h3 className="statistics-chart-title"><FaClipboardList/> Tổng quan nhóm</h3></div>
                  <div className="statistics-chart-body"><div className="statistics-table-list">
                    <div className="statistics-table-row"><div><strong>Tổng nhóm</strong><div className="statistics-table-sub">Tất cả nhóm</div></div><div className="statistics-table-value">{stats.communityOverview.totalGroups}</div></div>
                    <div className="statistics-table-row"><div><strong>Đang hoạt động</strong><div className="statistics-table-sub">Nhóm public / active</div></div><div className="statistics-table-value">{stats.communityOverview.activeGroups}</div></div>
                    <div className="statistics-table-row"><div><strong>Chờ duyệt</strong><div className="statistics-table-sub">Cần admin xem</div></div><div className="statistics-table-value">{stats.communityOverview.pendingGroups}</div></div>
                    <div className="statistics-table-row"><div><strong>Tạm dừng</strong><div className="statistics-table-sub">Bị ẩn / suspended</div></div><div className="statistics-table-value">{stats.communityOverview.suspendedGroups}</div></div>
                  </div></div>
                </div>
              </div>
              <div key="content-community-top" data-grid={{ x: 6, y: 27, w: 6, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header"><h3 className="statistics-chart-title"><FaClipboardList/> Top nhóm</h3><button className="statistics-chart-btn" onClick={() => navigate('/quan-ly-nhom-cong-dong')}>Mở quản lý</button></div>
                  <div className="statistics-chart-body"><div className="statistics-table-list">{communityTop10.length > 0 ? communityTop10.map((item, index) => (<div key={`community-${item.id || index}`} className="statistics-table-row"><div><strong>{item.name}</strong><div className="statistics-table-sub">{item.status} • {item.posts} bài</div></div><div className="statistics-table-value">#{index + 1}</div></div>)) : <div className="statistics-empty-state">Chưa có dữ liệu nhóm</div>}</div></div>
                </div>
              </div>
            </GridLayout>
          </div>
        )}

        {activeSection === 'events' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Sự kiện & khuyến mãi</p>
                <h3 className="statistics-section-title">Sự kiện, chiến dịch và voucher</h3>
                <p className="statistics-section-desc">Theo dõi các chiến dịch đang chạy và hiệu quả hiển thị của từng chương trình.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(sectionMetricCards)}
            <GridLayout className="statistics-widget-grid statistics-charts-grid--dense" rowHeight={34} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }} compactType="vertical" preventCollision={widgetEditMode} isDraggable={widgetEditMode} isResizable={widgetEditMode} draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined} draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select" margin={[16, 16]} layouts={widgetLayouts[activeSection] || {}} onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)} onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}>
              <div key="events-overview" data-grid={{ x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header"><h3 className="statistics-chart-title"><FaChartBar/> Tổng quan sự kiện</h3></div>
                  <div className="statistics-chart-body"><div className="statistics-table-list">
                    <div className="statistics-table-row"><div><strong>Tổng sự kiện</strong><div className="statistics-table-sub">Đang quản lý</div></div><div className="statistics-table-value">{stats.eventOverview.total_events}</div></div>
                    <div className="statistics-table-row"><div><strong>Đang hoạt động</strong><div className="statistics-table-sub">Sự kiện live</div></div><div className="statistics-table-value">{stats.eventOverview.active_events}</div></div>
                    <div className="statistics-table-row"><div><strong>Lượt xem</strong><div className="statistics-table-sub">Quan tâm nội dung</div></div><div className="statistics-table-value">{stats.eventOverview.total_views}</div></div>
                    <div className="statistics-table-row"><div><strong>CTR trung bình</strong><div className="statistics-table-sub">Tỷ lệ click</div></div><div className="statistics-table-value">{stats.eventOverview.avg_ctr}</div></div>
                  </div></div>
                </div>
              </div>
              <div key="events-top" data-grid={{ x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header"><h3 className="statistics-chart-title"><FaClipboardList/> Top sự kiện</h3><button className="statistics-chart-btn" onClick={() => navigate('/quan-ly-su-kien')}>Mở quản lý</button></div>
                  <div className="statistics-chart-body"><div className="statistics-table-list">{eventTop10.length > 0 ? eventTop10.map((item, index) => (<div key={`event-top-${item.id || index}`} className="statistics-table-row"><div><strong>{item.name}</strong><div className="statistics-table-sub">Click: {item.clicks} • CTR: {item.ctr}</div></div><div className="statistics-table-value">{item.views}</div></div>)) : <div className="statistics-empty-state">Chưa có dữ liệu sự kiện</div>}</div></div>
                </div>
              </div>
              <div key="promotions-overview" data-grid={{ x: 0, y: 8, w: 6, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header"><h3 className="statistics-chart-title"><FaChartPie/> Tổng quan khuyến mãi</h3></div>
                  <div className="statistics-chart-body"><div className="statistics-table-list">
                    <div className="statistics-table-row"><div><strong>Tổng khuyến mãi</strong><div className="statistics-table-sub">Voucher / game / chiến dịch</div></div><div className="statistics-table-value">{stats.promotionOverview.totalPromotions}</div></div>
                    <div className="statistics-table-row"><div><strong>Đang hoạt động</strong><div className="statistics-table-sub">Có thể áp dụng</div></div><div className="statistics-table-value">{stats.promotionOverview.activePromotions}</div></div>
                    <div className="statistics-table-row"><div><strong>Ngưng hoạt động</strong><div className="statistics-table-sub">Hết hiệu lực</div></div><div className="statistics-table-value">{stats.promotionOverview.inactivePromotions}</div></div>
                    <div className="statistics-table-row"><div><strong>Sắp hết hạn</strong><div className="statistics-table-sub">Cần chú ý</div></div><div className="statistics-table-value">{stats.promotionOverview.expiringSoon}</div></div>
                  </div></div>
                </div>
              </div>
              <div key="promotions-top" data-grid={{ x: 6, y: 8, w: 6, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header"><h3 className="statistics-chart-title"><FaClipboardList/> Khuyến mãi nổi bật</h3><button className="statistics-chart-btn" onClick={() => navigate('/quan-ly-khuyen-mai')}>Mở quản lý</button></div>
                  <div className="statistics-chart-body"><div className="statistics-table-list">{promotionTop10.length > 0 ? promotionTop10.map((item, index) => (<div key={`promo-${item.id || index}`} className="statistics-table-row"><div><strong>{item.name}</strong><div className="statistics-table-sub">{item.status} • {item.applyFor}</div></div><div className="statistics-table-value">#{index + 1}</div></div>)) : <div className="statistics-empty-state">Chưa có dữ liệu khuyến mãi</div>}</div></div>
                </div>
              </div>
            </GridLayout>
          </div>
        )}

        {activeSection === 'system' && (
          <div className="statistics-section-block">
            <div className="statistics-section-head">
              <div>
                <p className="statistics-insight-kicker">Liên hệ & Hệ thống</p>
                <h3 className="statistics-section-title">Tin nhắn liên hệ</h3>
                <p className="statistics-section-desc">Xem khối hỗ trợ khách hàng và thông tin hệ thống ở cùng một nơi.</p>
              </div>
            </div>
            <div className="statistics-widget-edit-note">
              {widgetEditMode && <span className="statistics-widget-edit-chip"><FaChartBar size={12}/> Kéo để đổi vị trí, kéo góc để đổi kích thước</span>}
            </div>
            {renderMetricStrip(sectionMetricCards)}
            <GridLayout className="statistics-widget-grid statistics-charts-grid--dense" rowHeight={34} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }} compactType="vertical" preventCollision={widgetEditMode} isDraggable={widgetEditMode} isResizable={widgetEditMode} draggableHandle={widgetEditMode ? '.statistics-chart-header' : undefined} draggableCancel="button, .statistics-chart-actions, .statistics-chart-btn, input, select" margin={[16, 16]} layouts={widgetLayouts[activeSection] || {}} onLayoutChange={(layout, layouts) => handleWidgetLayoutChange(layout, layouts)} onBreakpointChange={(breakpoint, cols) => { /* breakpoint change handled implicitly */ }}>
              <div key="system-contact" data-grid={{ x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 6 }}>
                <div className="statistics-chart-card statistics-chart-card--editable">
                  <div className="statistics-chart-header"><h3 className="statistics-chart-title"><FaClipboardList/> Liên hệ</h3><button className="statistics-chart-btn" onClick={() => navigate('/quan-ly-lien-he')}>Mở quản lý</button></div>
                  <div className="statistics-chart-body"><div className="statistics-table-list">
                    <div className="statistics-table-row"><div><strong>Tổng liên hệ</strong><div className="statistics-table-sub">Mọi trạng thái</div></div><div className="statistics-table-value">{stats.contactOverview.total}</div></div>
                    <div className="statistics-table-row"><div><strong>Mới</strong><div className="statistics-table-sub">Chưa xử lý</div></div><div className="statistics-table-value">{stats.contactOverview.new}</div></div>
                    <div className="statistics-table-row"><div><strong>Đang xử lý</strong><div className="statistics-table-sub">Đang trao đổi</div></div><div className="statistics-table-value">{stats.contactOverview.processing}</div></div>
                    <div className="statistics-table-row"><div><strong>Đã phản hồi</strong><div className="statistics-table-sub">Đã xử lý xong</div></div><div className="statistics-table-value">{stats.contactOverview.replied}</div></div>
                  </div></div>
                </div>
              </div>
              {/* Audit list removed from system section */}
            </GridLayout>
          </div>
        )}

        {/* CHART DETAIL MODAL */}
        {showChartModal && (
          <div className="statistics-export-modal" onClick={() => setShowChartModal(false)}>
            <div className="statistics-export-content statistics-chart-modal" onClick={(e) => e.stopPropagation()}>
              <div className="statistics-export-header">
                <h3 className="statistics-export-title">{chartModalTitle}</h3>
                <button className="statistics-export-close" onClick={() => setShowChartModal(false)}>
                  <FaTimes/>
                </button>
              </div>
              <p className="statistics-chart-modal-subtitle">{chartModalSubtitle}</p>
              <div className="statistics-chart-modal-summary-actions">
                {chartModalContext.path && (
                  <button
                    className="statistics-chart-btn statistics-chart-btn--modal-action"
                    onClick={() => navigate(chartModalContext.path, chartModalContext.routeState ? { state: chartModalContext.routeState } : undefined)}
                  >
                    {chartModalContext.label}
                  </button>
                )}
              </div>

              <div className="statistics-chart-modal-list">
                {chartModalLoading ? (
                  <div className="statistics-chart-modal-loading">Đang tải dữ liệu chi tiết...</div>
                ) : chartModalRows.length > 0 ? (
                  chartModalRows.map((row, index) => (
                    <div key={`${row.title || 'row'}-${index}`} className="statistics-chart-modal-card">
                      <div className="statistics-chart-modal-card-head">
                        <div>
                          <div className="statistics-chart-modal-card-title">{row.title || `Mục ${index + 1}`}</div>
                          <div className="statistics-chart-modal-card-category">{row.category || 'Chưa phân loại'}</div>
                        </div>
                        {row.value !== undefined && (
                          <div className="statistics-chart-modal-card-value">
                            {typeof row.value === 'number' && /doanh|thu|amount|refund|revenue|expense|profit/i.test(String(row.category || '') + String(row.detail || ''))
                              ? formatCurrencyValue(row.value)
                              : String(row.value)}
                          </div>
                        )}
                      </div>
                      <div className="statistics-chart-modal-card-subtitle">{row.subtitle || ''}</div>
                      <div className="statistics-chart-modal-card-detail">{row.detail || ''}</div>
                      <div className="statistics-chart-modal-card-actions">
                        {row.routePath ? (
                          <button
                            className="statistics-chart-btn statistics-chart-btn--modal-action"
                            onClick={() => navigate(row.routePath, row.routeState ? { state: row.routeState } : undefined)}
                          >
                            {row.routeLabel || 'Xem'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="statistics-chart-modal-loading">Không có dữ liệu chi tiết.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EXPORT MODAL */}
        {showExportModal && (
          <div className="statistics-export-modal" onClick={() => setShowExportModal(false)}>
            <div className="statistics-export-content" onClick={(e) => e.stopPropagation()}>
              <div className="statistics-export-header">
                <h3 className="statistics-export-title">Xuất báo cáo</h3>
                <button className="statistics-export-close" onClick={() => setShowExportModal(false)}>
                  <FaTimes/>
                </button>
              </div>
              <div className="statistics-export-options">
                <div className="statistics-export-option" onClick={exportToExcel}>
                  <div className="statistics-export-option-icon" style={{color: '#217346'}}>
                    <FaFileExcel size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>Excel tổng hợp</h4>
                    <p>Xuất tài chính + vận hành</p>
                  </div>
                </div>

                <div className="statistics-export-option" onClick={exportFinanceExcel}>
                  <div className="statistics-export-option-icon" style={{color: '#1e88e5'}}>
                    <FaFileExcel size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>Excel tài chính</h4>
                    <p>Chỉ doanh thu, chi phí, lợi nhuận</p>
                  </div>
                </div>

                <div className="statistics-export-option" onClick={exportOperationsExcel}>
                  <div className="statistics-export-option-icon" style={{color: '#43a047'}}>
                    <FaFileExcel size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>Excel vận hành</h4>
                    <p>Lịch hẹn, top dịch vụ, top bác sĩ</p>
                  </div>
                </div>
                
                <div className="statistics-export-option" onClick={exportToPDF}>
                  <div className="statistics-export-option-icon" style={{color: '#d32f2f'}}>
                    <FaFilePdf size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>PDF (.pdf)</h4>
                    <p>Xuất báo cáo định dạng PDF</p>
                  </div>
                </div>
                
                <div className="statistics-export-option" onClick={exportToCSV}>
                  <div className="statistics-export-option-icon" style={{color: '#43a047'}}>
                    <FaFileWord size={28}/>
                  </div>
                  <div className="statistics-export-option-text">
                    <h4>CSV (.csv)</h4>
                    <p>Xuất dữ liệu dạng CSV</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StatisticsPage;
