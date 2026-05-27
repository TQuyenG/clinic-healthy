// client/src/utils/normalizeUser.js
// Utility to normalize user/doctor objects returned by various APIs into a consistent shape
export const normalizeUserList = (users = [], defaultRole = 'staff') => {
  if (!Array.isArray(users)) return [];
  return users.map(u => ({
    id: u?.id || u?.user_id || u?.User?.id || u?.user?.id || u?.doctor_id || u?.doctorId || null,
    // Bổ sung u?.user?.full_name để đọc được dữ liệu từ serviceController
    full_name: u?.full_name || u?.User?.full_name || u?.user?.full_name || u?.name || u?.User?.fullName || u?.user?.fullName || u?.doctor_name || u?.fullName || '',
    avatar_url: u?.avatar_url || u?.User?.avatar_url || u?.user?.avatar_url || u?.avatar || u?.User?.avatar || u?.user?.avatar || u?.avatarUrl || '',
    email: u?.email || u?.User?.email || u?.user?.email || null,
    // Trích xuất code để sử dụng trong routing (dành cho bác sĩ)
    code: u?.code || u?.user_code || u?.doctor_code || null,
    // Trích xuất thêm chuyên khoa để giao diện dễ gọi
    specialty: u?.Specialty || u?.specialty || null,
    role: u?.role || (defaultRole || 'staff'),
    raw: u
  }));
};

export default normalizeUserList;