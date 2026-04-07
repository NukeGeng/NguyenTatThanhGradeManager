import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface NewsItem {
  id: number;
  title: string;
  publishedAt: string;
  summary: string;
  isNew: boolean;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="container page-wrap news-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <span>Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span>Tin tức</span>
      </nav>

      <header class="page-header">
        <div>
          <p class="eyebrow">Cổng thông tin</p>
          <h1 class="page-title">Tin tức NTTU</h1>
          <p class="subtitle">
            Danh sách tin tức nội bộ đang dùng dữ liệu mock cho giai đoạn frontend.
          </p>
        </div>
      </header>

      <section class="content-card news-card-shell">
        <div class="news-grid">
          @for (item of newsItems; track item.id) {
            <article class="news-card">
              <div class="card-head">
                <span class="date">{{ item.publishedAt }}</span>
                @if (item.isNew) {
                  <span class="chip chip-blue">Mới</span>
                }
              </div>

              <h2>{{ item.title }}</h2>
              <p>{{ item.summary }}</p>
            </article>
          }
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .news-page {
        display: grid;
        gap: 1rem;
      }

      .news-card-shell {
        padding: 1rem 1.1rem 1.1rem;
      }

      .news-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .news-card {
        border: 1px solid var(--gray-200);
        border-radius: 14px;
        padding: 1rem;
        background: #fff;
        transition:
          box-shadow 0.2s ease,
          transform 0.2s ease;
      }

      .news-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(15, 33, 68, 0.1);
      }

      .card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }

      .date {
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      .news-card h2 {
        margin: 0;
        color: var(--navy);
        font-size: 1rem;
      }

      .news-card p {
        margin: 0.5rem 0 0;
        color: var(--text-sub);
        line-height: 1.6;
        font-size: 0.9rem;
      }

      @media (max-width: 900px) {
        .news-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class NewsComponent {
  // Dữ liệu mock tạm thời, sẽ thay bằng API /api/news ở bước sau.
  readonly newsItems: NewsItem[] = [
    {
      id: 1,
      title: 'Thông báo đăng ký học phần học kỳ 2 năm học 2025-2026',
      publishedAt: '06/04/2026',
      summary:
        'Phòng đào tạo mở cổng đăng ký học phần từ 08:00 ngày 08/04 đến 23:59 ngày 12/04. Sinh viên kiểm tra kỹ tiên quyết trước khi đăng ký.',
      isNew: true,
    },
    {
      id: 2,
      title: 'Khoa CNTT tổ chức workshop ứng dụng AI trong giáo dục',
      publishedAt: '04/04/2026',
      summary:
        'Workshop chia sẻ các mô hình dự báo kết quả học tập, phân tích rủi ro và cách triển khai dashboard cảnh báo sớm trong nhà trường.',
      isNew: true,
    },
    {
      id: 3,
      title: 'Lịch thi kết thúc học phần đợt 1 đã được cập nhật',
      publishedAt: '01/04/2026',
      summary:
        'Sinh viên tra cứu lịch thi tại cổng đào tạo, chuẩn bị thẻ sinh viên và giấy tờ tùy thân khi vào phòng thi.',
      isNew: false,
    },
    {
      id: 4,
      title: 'Hướng dẫn cập nhật thông tin cá nhân trên hệ thống',
      publishedAt: '28/03/2026',
      summary:
        'Nhà trường khuyến nghị cập nhật email, số điện thoại và thông tin liên hệ phụ huynh để đảm bảo nhận đủ thông báo học vụ.',
      isNew: false,
    },
    {
      id: 5,
      title: 'Chương trình cố vấn học tập cho sinh viên năm nhất',
      publishedAt: '26/03/2026',
      summary:
        'Mỗi lớp sẽ được phân công giảng viên cố vấn hỗ trợ kế hoạch học tập, theo dõi chuyên cần và định hướng học phần phù hợp.',
      isNew: false,
    },
  ];
}
