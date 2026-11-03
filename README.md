# TRỢ LÝ TRA CỨU VĂN BẢN – BẢN MẪU

Website tĩnh (HTML + JavaScript) để tra cứu trong các file Word về tín dụng nông nghiệp, nông thôn. **Không cần API AI, không cần mật khẩu, không phải cài máy chủ.**

## 1. Có sẵn 4 văn bản

- Nghị định 55/2015/NĐ-CP
- Nghị định 116/2018/NĐ-CP
- Nghị định 156/2025/NĐ-CP
- Thông tư 29/2025/TT-NHNN

Dữ liệu trích xuất từ nguyên văn các đoạn trong file Word đính kèm; ưu tiên tìm sửa đổi năm 2025 theo chủ đề. Người sử dụng vẫn phải tự kiểm tra hiệu lực, các sửa đổi khác và quy định nội bộ.

## 2. Chạy trực tiếp trên máy tính

Giải nén. Mở `index.html` bằng Chrome hoặc Edge. Các file `data.js`, `app.js` phải nằm cùng `index.html`. Có thể hỏi ngay không cần Internet (không dùng fetch tải JSON). Chức năng cài đặt PWA và Service Worker phát huy tác dụng khi chạy qua HTTPS hoặc localhost, không có khi dùng `file://`.

Để kiểm thử dưới localhost (nếu có Python): tại thư mục chứa mã, chạy `python -m http.server 8000`, sau đó mở http://localhost:8000.

## 3. Đưa toàn bộ lên GitHub Pages (đề xuất: tự cập nhật khi thêm Word)

1. Trên github.com → New repository → đặt tên, ví dụ `tra-cuu-van-ban` → Public (chỉ khi các văn bản được phép công khai).
2. Giải nén ZIP và tải **toàn bộ nội dung bên trong thư mục** lên gốc repository (`index.html`, `app.js`, `data.js`, `build_data.py`, `.github/workflows/pages.yml`, `van-ban-goc/...`, ...). Nếu tải qua giao diện web cần đảm bảo thư mục `.github/workflows` được giữ đúng; cách đơn giản là tải riêng từng file / kéo cả thư mục đúng cấu trúc, hoặc dùng GitHub Desktop.
3. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Repo → Actions → chọn “Build document index and deploy GitHub Pages” → Run workflow (hoặc workflow được chạy tự động khi đẩy lên nhánh `main`).
5. Khi chạy thành công, vào Settings → Pages → Visit site. URL thường có dạng `https://TEN-TAI-KHOAN.github.io/tra-cuu-van-ban/`.

**Với cấu hình Actions này:** chỉ cần thêm file `.docx` vào `van-ban-goc` và lưu thay đổi trên nhánh `main`; GitHub Actions sẽ tự chạy `build_data.py`, tái tạo dữ liệu và triển khai website. Không phải sửa `index.html`.

**Phương án đơn giản khác:** Chọn Pages → “Deploy from a branch” / `main` / `/ (root)` để chạy bản có sẵn. Nhưng nếu bổ sung Word, phải chạy `cap_nhat_du_lieu.bat` ở máy Windows (cần Python 3 và thư viện `python-docx`), rồi upload `data.js` lên repo. Nếu chỉ upload Word mà không cập nhật `data.js` thì dữ liệu tra cứu không đổi.

## 4. Thêm nhiều văn bản

- Đặt các file Word `.docx` vào `van-ban-goc` (không phải PDF scan).
- Với GitHub Actions: đẩy lên `main` và trang sẽ được xây dựng lại tự động.
- Với máy offline: chạy `cap_nhat_du_lieu.bat` nếu đã cài Python. File `.doc` cũ cần chuyển thành `.docx`.
- PDF có thể cần được chuyển sang Word trước khi thêm; bản mẫu chưa tự OCR PDF scan.
- Văn bản bổ sung chưa nằm trong danh mục nhận diện sẽ được tra cứu bằng tên file; cần chuẩn hóa thông tin/sửa đổi của văn bản nếu muốn phân tích hiệu lực chính xác.

## 5. Giới hạn / an toàn

- Đây là **công cụ tìm kiếm có dẫn nguồn**, không phải mô hình ngôn ngữ ChatGPT. Đáp án là các đoạn trích có sắp xếp và một số mẫu tóm tắt được lập trình rõ ràng; không bảo đảm hiểu mọi cách diễn đạt.
- Công cụ không tự hợp nhất hoàn toàn các Nghị định sửa đổi và không tự cập nhật hiệu lực theo CSDL pháp luật. Mọi kết quả quan trọng cần được xác minh trước khi áp dụng.
- GitHub Pages là website **truy cập công khai**, kể cả một số repo riêng tư vẫn có thể tạo site public. **Không tải lên tài liệu mật, văn bản nội bộ chưa được phép công bố, thông tin khách hàng, hồ sơ tín dụng cá nhân, CCCD, dữ liệu cá nhân.**
- Tìm kiếm chạy trực tiếp trong trình duyệt. Website không gửi nội dung câu hỏi đến API và không lưu nhật ký câu hỏi lên máy chủ của dự án. GitHub có thể lưu log truy cập theo chính sách của họ.
- Để có chatbot AI thực sự (hỏi sâu, tổng hợp nhiều nguồn và suy luận), cần thêm dịch vụ AI với RAG, quản lý quyền truy cập, bảo vệ API key ở máy chủ riêng. **Không đặt API key trong HTML/JS công khai.**

## 6. Cấu trúc

```text
index.html                 giao diện
app.js                     tra cứu, trích xuất và trả lời
data.js                    dữ liệu đã biên mục để chạy ngay cả khi mở file trực tiếp
data.json                  bản JSON tiện kiểm tra và tích hợp sau này
build_data.py              chuyển DOCX thành bộ tìm kiếm
van-ban-goc/*.docx         nguồn văn bản Word
manifest.webmanifest       cấu hình cài đặt PWA
sw.js                      service worker cache trang
.github/workflows/pages.yml    cập nhật / xuất bản tự động
cap_nhat_du_lieu.bat       cập nhật thủ công cho Windows
```
