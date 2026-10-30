# diggory-scan-role-channel-dis

Userscript Tampermonkey khảo sát cấu trúc server đang mở trên Discord Web và xuất kết quả thành JSON.

## Tính năng

- Ghi nhận danh mục, kênh, role và ứng dụng/bot mà giao diện hoặc cache Discord đã nạp cho thấy.
- Quét danh sách thành viên theo từng nhóm đang hiển thị, với giới hạn số lượng tùy chỉnh cho mỗi nhóm.
- Phân loại người và bot/app theo dấu hiệu giao diện. Đây là ước đoán, có thể thiếu hoặc sai.
- Mở danh mục và cuộn cột kênh trước khi quét thành viên; có thể kết thúc hoặc dừng quét thành viên.
- Xem trước trực tiếp, rồi lưu hoặc sao chép JSON. Có tùy chọn bỏ ID để chia sẻ ẩn danh hơn.

## Cài đặt

1. Cài Tampermonkey cho trình duyệt Chromium.
2. Mở [tệp userscript](https://raw.githubusercontent.com/Diggoryite42/diggory-scan-role-channel-dis/main/diggory-scan-role-channel-dis.user.js).
3. Chọn cài đặt trong Tampermonkey, sau đó mở Discord Web và vào server bạn có quyền truy cập.

## Cách dùng

Mở giao diện khảo sát trên Discord, đặt số thành viên tối đa cho mỗi nhóm, rồi chọn **Bắt đầu quét**. Mở danh sách thành viên trước khi bắt đầu. Script sẽ tự mở các danh mục, cuộn cột kênh và quét phần thành viên Discord đang tải. Chọn **Kết thúc quét** để hoàn tất. Dùng xem trước để kiểm tra dữ liệu trước khi lưu JSON.

Không nhập tin nhắn trong lúc quét vì script cuộn giao diện và mở hồ sơ thành viên để đọc role hiển thị.

## Giới hạn và quyền riêng tư

- Script chỉ chạy trên `https://discord.com/channels/*` và khai báo `@grant none`.
- Script không lấy token, không đọc nội dung tin nhắn và không tự gửi request API. Một số dữ liệu được đọc từ giao diện và cache Discord đã nạp sẵn.
- Danh sách ảo hóa, kênh ẩn, nhóm chưa tải, hồ sơ không mở được hoặc thay đổi giao diện Discord có thể làm kết quả thiếu.
- Nhãn APP chỉ là dấu hiệu nhận diện bot/app, không đảm bảo phân loại đầy đủ.
- Role đọc từ hồ sơ thành viên là các role nhìn thấy trên giao diện, không phải phép tính quyền hiệu lực.
- JSON có thể chứa tên và ID server/thành viên. Hãy kiểm tra tùy chọn ẩn ID và nội dung trước khi chia sẻ.
- Việc cuộn và mở hồ sơ có thể làm giao diện Discord tải thêm dữ liệu. Chỉ khảo sát server bạn được phép truy cập và tuân thủ quy định áp dụng.

## Giấy phép

Phát hành theo giấy phép MIT. Xem [LICENSE](LICENSE).