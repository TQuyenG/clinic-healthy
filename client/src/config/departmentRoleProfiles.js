export const ROLE_PROFILES = {
  support: {
    receptionist_frontdesk: {
      code: 'receptionist_frontdesk',
      name: 'Lễ tân quầy',
      department: 'support',
      rank: 'staff',
      job_description: 'Lễ tân tại quầy, check-in, tiếp đón và hỗ trợ đặt lịch'
    },
    customer_care: {
      code: 'customer_care',
      name: 'Chăm sóc khách hàng',
      department: 'support',
      rank: 'staff',
      job_description: 'Hỗ trợ khách hàng, xử lý phản hồi và tin nhắn'
    },
  },
  finance: {
    cashier: {
      code: 'cashier',
      name: 'Thu ngân',
      department: 'finance',
      rank: 'staff',
      job_description: 'Thu tiền, xác nhận thanh toán tại quầy'
    },
    accountant_debt: {
      code: 'accountant_debt',
      name: 'Kế toán công nợ',
      department: 'finance',
      rank: 'staff',
      job_description: 'Theo dõi công nợ và các khoản cần đối soát'
    },
    accountant_reconciliation: {
      code: 'accountant_reconciliation',
      name: 'Kế toán đối soát',
      department: 'finance',
      rank: 'staff',
      job_description: 'Đối soát giao dịch, hoàn tiền và báo cáo tài chính'
    },
    // manager-level profiles removed — only staff-level profiles remain
  },
  content: {
    writer: {
      code: 'writer',
      name: 'Biên tập viên',
      department: 'content',
      rank: 'staff',
      job_description: 'Viết và chỉnh sửa bài viết, đề xuất cập nhật nội dung y tế',
      permissions: {
        articles: ['view', 'create', 'edit', 'duplicate'],
        medicines: ['view', 'propose_update'],
        diseases: ['view', 'propose_update'],
        forum: ['view_questions', 'create_question', 'comment_question', 'save_question', 'search_question'],
        events_vouchers: ['view_events', 'view_vouchers']
      }
    },
    marketing_specialist: {
      code: 'marketing_specialist',
      name: 'Marketing nội dung',
      department: 'content',
      rank: 'staff',
      job_description: 'Quản lý sự kiện, voucher và chiến dịch khuyến mãi',
      permissions: {
        articles: ['view', 'create', 'edit', 'duplicate'],
        events_vouchers: ['view_events', 'create_event', 'edit_event', 'delete_event', 'view_vouchers', 'create_voucher', 'edit_voucher', 'delete_voucher', 'create_game', 'config_rewards']
      }
    },
  },
  clinical: {
    clinical_staff: {
      code: 'clinical_staff',
      name: 'Nhân viên lâm sàng',
      department: 'clinical',
      rank: 'staff',
      job_description: 'Hỗ trợ vận hành lâm sàng, hồ sơ khám và điều phối khám'
    }
  },
  system: {
    it_support: {
      code: 'it_support',
      name: 'IT hỗ trợ',
      department: 'system',
      rank: 'staff',
      job_description: 'Hỗ trợ vận hành hệ thống, xem log và cấu hình cơ bản'
    },
    
  }
};

const normalizeForCompare = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeForCompare).sort();
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((accumulator, key) => {
      accumulator[key] = normalizeForCompare(value[key]);
      return accumulator;
    }, {});
  }

  return value;
};

export const getRoleProfile = (departmentCode, profileCode) => {
  const departmentProfiles = ROLE_PROFILES[departmentCode];
  if (!departmentProfiles) return null;
  return departmentProfiles[profileCode] || null;
};

export const findRoleProfileByPermissions = (departmentCode, permissions = {}, jobDescription = '') => {
  const departmentProfiles = ROLE_PROFILES[departmentCode];
  if (!departmentProfiles) return null;

  const normalizedPermissions = JSON.stringify(normalizeForCompare(permissions || {}));
  const normalizedJobDescription = (jobDescription || '').trim().toLowerCase();

  for (const profile of Object.values(departmentProfiles)) {
    const profilePermissions = JSON.stringify(normalizeForCompare(profile.permissions || {}));
    const profileJobDescription = (profile.job_description || '').trim().toLowerCase();

    if (profilePermissions === normalizedPermissions) {
      return profile;
    }

    if (normalizedJobDescription && profileJobDescription && normalizedJobDescription === profileJobDescription) {
      return profile;
    }
  }

  return null;
};

export default ROLE_PROFILES;
