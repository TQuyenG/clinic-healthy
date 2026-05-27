# Hệ thống Quản lý Màu Phòng Ban Động

## Tính năng

Hệ thống này cho phép admin cấu hình màu sắc cho từng phòng ban và áp dụng đồng bộ trên toàn bộ hệ thống.

## Các file đã tạo/sửa đổi

### 1. Context API - Quản lý trạng thái màu sắc
- **`client/src/contexts/DepartmentColorContext.js`** (MỚI)
  - Provider cung cấp màu sắc phòng ban cho toàn app
  - Lưu trữ trong localStorage
  - Cung cấp hooks: `useDepartmentColors()`

### 2. App Wrapper
- **`client/src/App.js`**
  - Wrap app với `<DepartmentColorProvider>`
  - Đảm bảo tất cả components con có thể truy cập màu sắc

### 3. Page chính - Quản lý nhân sự
- **`client/src/pages/StaffManagementPage.js`**
  - Import và sử dụng hook `useDepartmentColors()`
  - Xóa hardcode color trong DEPARTMENTS object
  - Truyền `departmentColors` xuống tất cả components con:
    - OverviewDashboard
    - DepartmentAssignmentTab
    - OrganizationChart

### 4. Component - Tab Phân ban
- **`client/src/components/DepartmentAssignmentTab.js`**
  - Thêm nút "Cấu hình màu" trong header
  - Modal popup cấu hình màu cho từng phòng ban
  - Color picker với preview realtime
  - Nút "Reset mặc định"
  - Áp dụng màu động cho badge phòng ban

- **`client/src/components/DeptAssign-ColorConfig.css`** (MỚI)
  - Styles cho modal cấu hình màu
  - Grid layout cho color pickers
  - Hover effects và transitions

### 5. Component - Biểu đồ tổ chức
- **`client/src/components/OrganizationChart.js`**
  - Nhận prop `departmentColors`
  - Áp dụng màu động cho:
    - Department nodes
    - Manager nodes
    - Connection edges

## Cách sử dụng

### 1. Cấu hình màu sắc (Admin only)

1. Vào trang **Quản lý Nhân sự**
2. Chọn tab **"Phân ban"**
3. Click nút **"Cấu hình màu"** (icon palette) ở header
4. Modal popup hiển thị danh sách phòng ban với color picker
5. Chọn màu mới cho từng phòng ban
6. Preview màu realtime trong ô preview
7. Click **"Lưu màu sắc"** để áp dụng
8. Hoặc click **"Reset mặc định"** để về màu gốc

### 2. Màu sắc được áp dụng ở đâu?

Màu sắc của phòng ban sẽ tự động đồng bộ trên:

#### Tab Tổng quan
- ✅ Biểu đồ tròn (Pie chart)
- ✅ Legend phòng ban
- ✅ Bảng thống kê (badge quản lý, nút chi tiết)
- ✅ Sơ đồ cây tổ chức (Organization Chart):
  - Department nodes
  - Manager nodes  
  - Connection edges

#### Tab Phân ban
- ✅ Badge phòng ban trong bảng nhân viên
- ✅ Select dropdown phòng ban (outline color)

#### Tab các phòng ban cụ thể
- ✅ Badge và visual elements

## API & Data Flow

```
localStorage "departmentColors"
    ↓
DepartmentColorContext
    ↓
App.js → DepartmentColorProvider
    ↓
StaffManagementPage (useDepartmentColors)
    ↓
├── OverviewDashboard (departmentColors prop)
│   ├── Pie Chart → fill color
│   ├── Legend → background color
│   ├── Table badges → background + color
│   └── OrganizationChart (departmentColors prop)
│       ├── Department nodes → header background
│       ├── Manager nodes → header background
│       └── Edges → stroke color
│
└── DepartmentAssignmentTab (departmentColors prop)
    ├── Color Config Modal
    │   ├── updateDepartmentColor()
    │   └── resetToDefaults()
    └── Table badges → dynamic color
```

## Màu mặc định

```javascript
{
  BGD: '#FF9800',      // Cam - Ban Giám Đốc
  clinical: '#4CAF50',  // Xanh lá - Vận hành lâm sàng
  system: '#2196F3',    // Xanh dương - Hệ thống & IT
  support: '#9C27B0',   // Tím - Chăm sóc KH
  finance: '#F44336',   // Đỏ - Tài chính
  content: '#00BCD4'    // Xanh cyan - Nội dung
}
```

## Lợi ích

1. **Tính nhất quán**: Một màu cho một phòng ban trên toàn hệ thống
2. **Dễ nhận biết**: User dễ dàng phân biệt phòng ban bằng màu sắc
3. **Tùy biến**: Admin có thể thay đổi theo nhu cầu branding
4. **Persistent**: Màu được lưu trong localStorage, không mất khi refresh
5. **Performance**: Không cần gọi API, load instant từ localStorage

## Technical Details

### Context Pattern
- Sử dụng React Context API để shared state
- Provider ở level cao nhất (App.js)
- Consumer components sử dụng hook `useDepartmentColors()`

### Storage
- LocalStorage key: `"departmentColors"`
- Format: `{ "BGD": "#FF9800", "clinical": "#4CAF50", ... }`
- Auto-save on every update

### Color Format
- Hex color codes (#RRGGBB)
- Native HTML color input
- Validation: Must be valid hex

## Future Enhancements

- [ ] Export/Import color themes
- [ ] Predefined color palettes
- [ ] Color accessibility checker (contrast ratio)
- [ ] Dark mode compatible colors
- [ ] Admin-only permission check
