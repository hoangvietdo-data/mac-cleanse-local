# AppSlimmer & CleanMyMac Web - macOS Storage Optimizer

Ứng dụng web cục bộ (Local Web App) giúp tối ưu hóa dung lượng ổ đĩa macOS bằng cách nén ứng dụng in-place với công nghệ APFS, giải phóng (offload) tự động các ứng dụng ít sử dụng, quét dung lượng ẩn và dọn dẹp hệ thống.

> [!IMPORTANT]
> **Đây là ứng dụng chạy cục bộ (Local-only)**. Vì ứng dụng cần can thiệp hệ thống để quét dung lượng, quản lý tiến trình và xóa file rác trên máy Mac của bạn, nó **không thể** triển khai trực tuyến trên các dịch vụ đám mây như Vercel hay Netlify. Bạn cần tải mã nguồn về và chạy trên chính máy Mac của mình.

---

## 🌟 Tính năng nổi bật

1. **Quét Thông Minh (Smart Scan)**: Phân tích nhanh dung lượng ổ đĩa, rác hệ thống, tệp tin lớn và bộ nhớ RAM trống.
2. **Dọn Rác Hệ Thống (System Junk)**: Dọn sạch bộ nhớ đệm (Caches), nhật ký (Logs), dữ liệu Xcode DerivedData và Thùng rác.
3. **Đo Dung Lượng Thực Của App (Real App Storage Scan)**: Hiển thị kích thước thực tế của từng ứng dụng (như Zalo, Chrome, Spotify) bao gồm cả dữ liệu đệm và file lưu trữ ẩn trong thư mục thư viện `~/Library` (Application Support, Containers, Group Containers), hỗ trợ dọn dẹp sạch dữ liệu ẩn chỉ với 1 click.
4. **App Slimmer**:
   - **Nén ứng dụng (Compress)**: Nén dung lượng tệp thực thi của app bằng công nghệ nén APFS của Apple.
   - **Giải phóng ứng dụng (Offload)**: Đóng gói ứng dụng ít sử dụng thành tệp nén và để lại một tệp kích hoạt "tự phục hồi" siêu nhẹ (Stub) để giữ nguyên vị trí. Khi click mở, ứng dụng tự động giải nén và hoạt động bình thường.
5. **Tối Ưu Hóa (Optimization)**: Theo dõi và buộc đóng các tiến trình ngầm đang tiêu tốn nhiều tài nguyên CPU/RAM.
6. **Bảo Trì (Maintenance)**: Giải phóng bộ nhớ RAM (Purge) và xóa bộ nhớ đệm DNS (Flush DNS) nhanh chóng.
7. **Thiết Kế Tối Giản (Flat Style)**: Giao diện phẳng hoàn toàn, đơn màu, không hiệu ứng bóng đổ hay làm mờ nền, cho tốc độ tải cực nhanh.

---

## 🔒 Bảo mật tuyệt đối

- Máy chủ backend được cấu hình **chỉ lắng nghe địa chỉ local loopback `127.0.0.1`**, ngăn chặn hoàn toàn mọi truy cập trái phép từ thiết bị khác trong cùng mạng Wi-Fi/Lan hoặc Internet vào máy của bạn.
- Hoàn toàn chạy Offline, không thu thập bất kỳ dữ liệu người dùng nào hay gửi yêu cầu kết nối ra Internet.

---

## ⚙️ Hướng dẫn cài đặt & sử dụng

### Yêu cầu hệ thống
- Hệ điều hành macOS.
- Đã cài đặt **Node.js** (Tải bản LTS tại [nodejs.org](https://nodejs.org/)).

### Cách 1: Sử dụng bộ khởi chạy nhanh (Khuyên dùng)
1. Tải/Clone mã nguồn này về máy.
2. Click đúp vào file `start.command` trong thư mục dự án để khởi động.
3. Trình duyệt của bạn sẽ tự động mở trang quản trị tại địa chỉ: `http://localhost:5173`.

### Cách 2: Khởi chạy thủ công bằng Terminal
1. Di chuyển vào thư mục dự án:
   ```bash
   cd path/to/macos-app-slimmer
   ```
2. Cài đặt các thư viện cần thiết (chỉ cần chạy lần đầu tiên):
   ```bash
   npm install
   ```
3. Khởi chạy dự án (chạy đồng thời cả backend và frontend):
   ```bash
   npm run dev
   ```
4. Mở trình duyệt web của bạn và truy cập địa chỉ: `http://localhost:5173`.
