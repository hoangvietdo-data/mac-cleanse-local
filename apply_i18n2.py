#!/usr/bin/env python3
"""Apply remaining i18n replacements to App.jsx."""

with open("src/App.jsx", "r", encoding="utf-8") as f:
    src = f.read()

replacements = [
    # Junk clean button
    ("              Làm Sạch Rác Hệ Thống\n            </button>",
     "              {t('clean_junk')}\n            </button>"),
    # Large files desc (different text than expected)
    (">Khám phá các file chiếm dụng dung lượng lớn nhất trong Downloads, Documents, Desktop, Movies...</p>",
     ">{t('large_files_desc')}</p>"),
    # App Slimmer h1
    ("<h1>App Slimmer</h1>",
     "<h1>{t('slim_title')}</h1>"),
    # App Slimmer desc
    (">Nén các ứng dụng dung lượng lớn trực tiếp hoặc giải phóng chúng thành các stub 12 KB tự động khôi phục khi nhấp đúp.</p>",
     ">{t('slim_desc')}</p>"),
    # Filter buttons 
    (">Tất cả</button>",
     ">{t('cat_all')}</button>"),
    (">Có thể Slim</button>",
     ">{t('filter_slimmable')}</button>"),
    (">Đã giải phóng</button>",
     ">{t('filter_offloaded')}</button>"),
    (">Đang chạy</button>",
     ">{t('filter_running')}</button>"),
    (">Hệ thống</button>",
     ">{t('filter_system')}</button>"),
    # Table headers
    (">Tên Ứng Dụng</th>", ">{t('col_app')}</th>"),
    (">Dung Lượng Bộ Cài</th>", ">{t('col_phys')}</th>"),
    (">Dung Lượng Ẩn (Cache/Data)</th>", ">{t('col_cache')}</th>"),
    (">Lần Cuối Mở</th>", ">{t('col_modified')}</th>"),
    (">Trạng Thái</th>", ">{t('col_status')}</th>"),
    (">Thao tác</th>", ">{t('col_action')}</th>"),
    # Badges
    (">Hệ thống</span>", ">{t('badge_system')}</span>"),
    (">Đang chạy</span>", ">{t('badge_running')}</span>"),
    (">Đã giải phóng</span>", ">{t('badge_stub')}</span>"),
    # Action button titles
    ('title="Nén bằng APFS"', "title={t('tip_compress')}"),
    ('title="Giải phóng dung lượng (lưu trữ zip + stub)"', "title={t('tip_offload')}"),
    ('title="Phục hồi ứng dụng về gốc"', "title={t('tip_restore')}"),
    ('title="Dọn dẹp Dữ liệu & Cache ẩn"', "title={t('tip_clean')}"),
    ('title="Gỡ cài đặt hoàn toàn"', "title={t('tip_uninstall')}"),
    # Activity log
    ("> Nhật ký hoạt động</span>", "> {t('activity_log')}</span>"),
    (">Xóa logs</button>", ">{t('clear_log')}</button>"),
]

count = 0
for old, new in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        count += 1
    else:
        print(f"  [MISS] {old[:70]!r}")

print(f"Applied {count}/{len(replacements)} replacements")

with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(src)

print("Done.")
