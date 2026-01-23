# Tab Isolation - Mỗi Tab Hoạt Động Độc Lập

## Thay đổi đã thực hiện

### 1. SessionStorage thay vì LocalStorage
- **Trước**: Dùng `localStorage` - tất cả tab share chung token
- **Sau**: Dùng `sessionStorage` - mỗi tab có token riêng

**Lợi ích:**
- Mỗi tab có thể đăng nhập với tài khoản khác nhau
- Token chỉ tồn tại trong tab hiện tại
- Khi đóng tab, token tự động bị xóa
- Các tab không ảnh hưởng đến nhau

### 2. Loại bỏ Auto-Login khi Reload
- **Trước**: Tự động check và login lại khi reload trang
- **Sau**: User phải đăng nhập lại trong mỗi tab

**Lợi ích:**
- Mỗi tab yêu cầu đăng nhập riêng
- Không tự động đăng nhập với token cũ
- User có quyền kiểm soát từng tab

### 3. WebSocket Connection Riêng cho Mỗi Tab
- Mỗi tab có WebSocket connection riêng
- Mỗi connection có `tabId` unique
- Tự động disconnect khi tab đóng

## Cách hoạt động

### Scenario 1: Mở nhiều tab
1. Tab 1: Đăng nhập với user "admin"
2. Tab 2: Đăng nhập với user "user1"
3. Tab 3: Không đăng nhập
→ Mỗi tab hoạt động độc lập, không ảnh hưởng nhau

### Scenario 2: Reload trang
1. Tab đang đăng nhập với user "admin"
2. Reload trang
3. Tab sẽ yêu cầu đăng nhập lại
→ Không tự động đăng nhập với token cũ

### Scenario 3: Đóng tab
1. Tab đang đăng nhập
2. Đóng tab
3. Token và WebSocket connection tự động bị xóa
→ Không ảnh hưởng đến các tab khác

## Lưu ý

- **SessionStorage** chỉ tồn tại trong một tab
- Khi đóng tab, tất cả data trong sessionStorage bị xóa
- Nếu muốn giữ login khi reload, user cần đăng nhập lại
- Mỗi tab có WebSocket connection riêng, tốn tài nguyên hơn nhưng đảm bảo isolation

## Nếu muốn giữ login khi reload

Nếu muốn giữ login khi reload (nhưng vẫn muốn mỗi tab độc lập), có thể:
1. Thêm option "Remember me" khi đăng nhập
2. Nếu chọn "Remember me", dùng localStorage
3. Nếu không chọn, dùng sessionStorage

Hiện tại, mặc định là sessionStorage để đảm bảo mỗi tab hoàn toàn độc lập.

