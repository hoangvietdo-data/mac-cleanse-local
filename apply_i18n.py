#!/usr/bin/env python3
"""Apply i18n replacements to App.jsx safely."""
import re

with open("src/App.jsx", "r", encoding="utf-8") as f:
    src = f.read()

# 1. Insert TRANSLATIONS dict + lang helpers right after API_BASE line
TRANSLATIONS_BLOCK = """
// i18n translations
const TRANSLATIONS = {
  vi: {
    menu_smart_scan:'Quét Thông Minh',section_clean:'DỌN DẸP',menu_system_junk:'Rác Hệ Thống',
    menu_large_files:'Tập Tin Lớn & Cũ',section_manage:'QUẢN TRỊ',menu_optimization:'Tối Ưu Hóa',
    menu_maintenance:'Bảo Trì',menu_app_slimmer:'App Slimmer',
    ram_free:'RAM trống:',disk_free:'Ổ đĩa trống:',disk_total:'Tổng ổ đĩa:',
    feedback:'Góp ý',
    smart_scan_title:'Quét Thông Minh',smart_scan_desc:'Khởi chạy phân tích toàn diện rác hệ thống, tệp tin lớn và tình trạng bộ nhớ thiết bị của bạn.',
    scan:'QUÉT',scanning:'ĐANG QUÉT...',completed:'HOÀN TẤT',cleaning:'ĐANG DỌN...',cleaned:'ĐÃ DỌN XONG',
    click_to_scan:'Nhấp vào nút để bắt đầu phân tích thiết bị của bạn',
    junk_card:'Rác Hệ Thống',large_files_card:'Tập Tin Lớn & Cũ',files_unit:'tập tin',
    memory_ram:'Bộ Nhớ RAM',app_slimmed:'Ứng Dụng Nén',freed_unit:'giải phóng',free_word:'Trống',
    smart_clean_btn:'Dọn Dẹp Thông Minh',activity_log:'NHẬT KÝ HOẠT ĐỘNG',clear_log:'Xóa log',
    clean_success:'Hệ thống của bạn đã hoàn toàn sạch sẽ!',back:'Quay lại',
    sys_junk_title:'Rác Hệ Thống',sys_junk_desc:'Loại bỏ bộ nhớ đệm ứng dụng, tệp tin ghi nhật ký cũ và tệp tin rác của nhà phát triển để lấy lại không gian đĩa.',
    scan_junk:'Quét Rác',clean_junk:'Làm Sạch Rác Hệ Thống',
    user_caches:'Bộ Nhớ Đệm Của Ứng Dụng (User Caches)',user_logs:'Nhật Ký Hoạt Động (User Logs)',
    xcode_derived:'Dữ Liệu Xcode DerivedData (Dành cho Lập trình viên)',sys_trash:'Thùng Rác Hệ Thống (Trash Bins)',
    large_files_title:'Tập Tin Lớn & Cũ',large_files_desc:'Tìm kiếm và loại bỏ các tệp tin có dung lượng lớn ít khi sử dụng.',
    scan_large_files:'Quét Tệp Lớn',clean_files:'Dọn Dẹp Tệp',no_large_files:'Không tìm thấy tệp tin lớn nào.',
    cat_all:'Tất cả',cat_video:'Video',cat_archive:'Lưu trữ',cat_document:'Tài liệu',cat_audio:'Âm thanh',cat_image:'Hình ảnh',cat_other:'Khác',
    col_file:'Tên tệp',col_path:'Đường dẫn',col_size:'Kích thước',col_modified:'Ngày sửa đổi',col_action:'Hành động',
    opt_title:'Tối Ưu Hóa Tiến Trình',opt_desc:'Xem và tắt các ứng dụng chạy ngầm đang tiêu tốn nhiều tài nguyên hệ thống.',
    reload:'Tải Lại',sort_ram:'Sắp xếp theo RAM',sort_cpu:'Sắp xếp theo CPU',
    col_process:'Tiến trình',col_resources:'Tài nguyên',tip_kill:'Tắt tiến trình',
    maint_title:'Bảo Trì Hệ Thống',maint_desc:'Thực hiện tối ưu hóa hiệu năng RAM và dọn dẹp DNS.',
    purge_ram:'Giải Phóng RAM',purge_ram_desc:'Giải phóng bộ nhớ RAM không hoạt động để tăng tốc hệ thống.',
    run_btn:'Chạy',flush_dns:'Dọn Dẹp DNS Cache',flush_dns_desc:'Xóa bộ nhớ đệm phân giải tên miền DNS để sửa lỗi mạng.',
    slim_title:'Ứng Dụng Nén (App Slimmer)',slim_desc:'Giảm dung lượng ứng dụng bằng cách nén in-place hoặc giải phóng sang dạng stub tự phục hồi.',
    search_app:'Tìm kiếm ứng dụng...',
    filter_all:'Tất cả ứng dụng',filter_slimmable:'Có thể nén',filter_offloaded:'Đã giải phóng (Stub)',filter_running:'Đang chạy',filter_system:'Ứng dụng hệ thống',
    col_app:'Tên ứng dụng',col_phys:'Kích thước thực',col_log:'Kích thước ảo',col_cache:'Cache ẩn',col_status:'Trạng thái',
    scanning_apps:'Đang quét danh sách ứng dụng...',no_apps:'Không tìm thấy ứng dụng nào.',
    badge_system:'Hệ thống',badge_compressed:'Đã nén',badge_stub:'Đã giải phóng',badge_running:'Đang chạy',
    tip_compress:'Nén ứng dụng trực tiếp',tip_offload:'Giải phóng dung lượng (lưu trữ zip + stub)',tip_restore:'Phục hồi ứng dụng về gốc',tip_clean:'Xóa Caches',tip_uninstall:'Gỡ cài đặt hoàn toàn',
    confirm_title:'Xác Nhận Hành Động',cancel_btn:'Hủy',confirm_btn:'Xác nhận',
    col_log_actions:'NHẬT KÝ HOẠT ĐỘNG',
  },
  en: {
    menu_smart_scan:'Smart Scan',section_clean:'CLEANUP',menu_system_junk:'System Junk',
    menu_large_files:'Large & Old Files',section_manage:'ADMINISTRATION',menu_optimization:'Optimization',
    menu_maintenance:'Maintenance',menu_app_slimmer:'App Slimmer',
    ram_free:'Free RAM:',disk_free:'Free Disk:',disk_total:'Total Disk:',
    feedback:'Feedback',
    smart_scan_title:'Smart Scan',smart_scan_desc:'Launch a comprehensive analysis of system junk, large files, and device memory status.',
    scan:'SCAN',scanning:'SCANNING...',completed:'COMPLETED',cleaning:'CLEANING...',cleaned:'CLEANED',
    click_to_scan:'Click the button to start analyzing your device',
    junk_card:'System Junk',large_files_card:'Large & Old Files',files_unit:'files',
    memory_ram:'System RAM',app_slimmed:'Compressed Apps',freed_unit:'freed',free_word:'Free',
    smart_clean_btn:'Smart Clean',activity_log:'ACTIVITY LOG',clear_log:'Clear log',
    clean_success:'Your system is completely clean!',back:'Back',
    sys_junk_title:'System Junk',sys_junk_desc:'Remove application caches, old log files and developer junk to reclaim disk space.',
    scan_junk:'Scan Junk',clean_junk:'Clean System Junk',
    user_caches:'User Application Caches',user_logs:'User Activity Logs',
    xcode_derived:'Xcode DerivedData (for developers)',sys_trash:'System Trash Bins',
    large_files_title:'Large & Old Files',large_files_desc:'Find and remove large, rarely used files.',
    scan_large_files:'Scan Large Files',clean_files:'Clean Files',no_large_files:'No large files found.',
    cat_all:'All',cat_video:'Video',cat_archive:'Archives',cat_document:'Documents',cat_audio:'Audio',cat_image:'Images',cat_other:'Other',
    col_file:'File name',col_path:'Path',col_size:'Size',col_modified:'Date modified',col_action:'Action',
    opt_title:'Process Optimization',opt_desc:'View and terminate background apps consuming high system resources.',
    reload:'Reload',sort_ram:'Sort by RAM',sort_cpu:'Sort by CPU',
    col_process:'Process',col_resources:'Resources',tip_kill:'Kill process',
    maint_title:'System Maintenance',maint_desc:'Optimize RAM performance and flush DNS cache.',
    purge_ram:'Purge RAM',purge_ram_desc:'Release inactive RAM to speed up the system.',
    run_btn:'Run',flush_dns:'Flush DNS Cache',flush_dns_desc:'Clear DNS resolution cache to fix network issues.',
    slim_title:'App Slimmer',slim_desc:'Reduce app size via in-place compression or offloading to self-restoring stubs.',
    search_app:'Search apps...',
    filter_all:'All apps',filter_slimmable:'Compressible',filter_offloaded:'Offloaded (Stub)',filter_running:'Running',filter_system:'System apps',
    col_app:'App name',col_phys:'Physical size',col_log:'Logical size',col_cache:'Hidden cache',col_status:'Status',
    scanning_apps:'Scanning application list...',no_apps:'No applications found.',
    badge_system:'System',badge_compressed:'Compressed',badge_stub:'Offloaded',badge_running:'Running',
    tip_compress:'Compress app in-place',tip_offload:'Offload (zip archive + stub)',tip_restore:'Restore to original',tip_clean:'Clean Cache',tip_uninstall:'Uninstall completely',
    confirm_title:'Confirm Action',cancel_btn:'Cancel',confirm_btn:'Confirm',
    col_log_actions:'ACTIVITY LOG',
  }
};

"""

src = src.replace(
    "// API Base URL\nconst API_BASE = '/api';\n\n// Format bytes",
    "// API Base URL\nconst API_BASE = '/api';\n" + TRANSLATIONS_BLOCK + "// Format bytes"
)

# 2. Add lang state + helpers after activeTab useState
src = src.replace(
    "  const [activeTab, setActiveTab] = useState('smart_scan');\n  \n  // State",
    "  const [activeTab, setActiveTab] = useState('smart_scan');\n"
    "  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'vi');\n"
    "  const t = (key) => (TRANSLATIONS[lang] || TRANSLATIONS.vi)[key] || key;\n"
    "  const toggleLang = () => { const nl = lang === 'vi' ? 'en' : 'vi'; localStorage.setItem('lang', nl); setLang(nl); };\n"
    "  \n  // State"
)

# 3. Add top-bar inside main-content after opening tag
src = src.replace(
    "      {/* Main Dashboard Panel */}\n      <main className=\"main-content\">\n        \n        {/* ========================================== */}",
    """      {/* Main Dashboard Panel */}
      <main className="main-content">
        {/* Top bar: language toggle + feedback */}
        <div className="top-bar">
          <button id="lang-toggle-btn" className="top-bar-btn" onClick={toggleLang} title="Switch language">
            {lang === 'vi' ? '🇬🇧 EN' : '🇻🇳 VI'}
          </button>
          <a id="feedback-btn" className="top-bar-btn" href="mailto:vietdohoang.work@gmail.com?subject=MacCleanse%20Local%20Feedback" title="Send feedback">
            ✉ {t('feedback')}
          </a>
        </div>
        
        {/* ========================================== */}"""
)

# 4. Sidebar menu items
replacements = [
    # Section labels
    ("<Icons.Radar /> Quét Thông Minh", "<Icons.Radar /> {t('menu_smart_scan')}"),
    (">Dọn Dẹp</div>", ">{t('section_clean')}</div>"),
    ("<Icons.Junk /> Rác Hệ Thống", "<Icons.Junk /> {t('menu_system_junk')}"),
    ("<Icons.LargeFiles /> Tập Tin Lớn & Cũ", "<Icons.LargeFiles /> {t('menu_large_files')}"),
    (">Quản Trị</div>", ">{t('section_manage')}</div>"),
    ("<Icons.Optimization /> Tối Ưu Hóa", "<Icons.Optimization /> {t('menu_optimization')}"),
    ("<Icons.Maintenance /> Bảo Trì", "<Icons.Maintenance /> {t('menu_maintenance')}"),
    ("<Icons.AppSlimmer /> App Slimmer", "<Icons.AppSlimmer /> {t('menu_app_slimmer')}"),
    # Sidebar widget
    (">RAM trống:</span>", ">{t('ram_free')}</span>"),
    (">Ổ đĩa trống:</span>", ">{t('disk_free')}</span>"),
    (">Tổng ổ đĩa:</span>", ">{t('disk_total')}</span>"),
    # Smart scan header
    ("<h1>Quét Thông Minh</h1>", "<h1>{t('smart_scan_title')}</h1>"),
    (">Khởi chạy phân tích toàn diện rác hệ thống, tệp tin lớn và tình trạng bộ nhớ thiết bị của bạn.</p>", ">{t('smart_scan_desc')}</p>"),
    # Radar button states
    ("&& 'QUÉT'}", "&& t('scan')}"),
    ("&& 'ĐANG QUÉT...'}", "&& t('scanning')}"),
    ("&& 'HOÀN TẤT'}", "&& t('completed')}"),
    ("&& 'ĐANG DỌN...'}", "&& t('cleaning')}"),
    ("&& 'ĐÃ DỌN Xong'}", "&& t('cleaned')}"),
    # Idle message
    (">Nhấp vào nút để bắt đầu phân tích thiết bị của bạn</p>", ">{t('click_to_scan')}</p>"),
    # Scan result cards
    (">Rác Hệ Thống</div>\n                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>\n                      {loading ? '...' : formatBytes(totalSystemJunk)}",
     ">{t('junk_card')}</div>\n                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>\n                      {loading ? '...' : formatBytes(totalSystemJunk)}"),
    (">Tập Tin Lớn & Cũ</div>\n                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>\n                      {loading ? '...' : `${largeFiles.length} tập tin`}",
     ">{t('large_files_card')}</div>\n                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>\n                      {loading ? '...' : `${largeFiles.length} ${t('files_unit')}`}"),
    (">Bộ Nhớ RAM</div>", ">{t('memory_ram')}</div>"),
    ("|| 0)} Trống", "|| 0)} {t('free_word')}"),
    (">Ứng Dụng Nén</div>", ">{t('app_slimmed')}</div>"),
    (".isStub).length} giải phóng", ".isStub).length} {t('freed_unit')}"),
    # Smart clean button
    ("Dọn Dẹp Thông Minh ({formatBytes(totalSystemJunk)})", "{t('smart_clean_btn')} ({formatBytes(totalSystemJunk)})"),
    # Cleaned state
    (">Hệ thống của bạn đã hoàn toàn sạch sẽ!</h3>", ">{t('clean_success')}</h3>"),
    (">Quay lại</button>", ">{t('back')}</button>"),
    # System Junk tab
    ("<h1>Rác Hệ Thống</h1>", "<h1>{t('sys_junk_title')}</h1>"),
    (">Loại bỏ bộ nhớ đệm ứng dụng, tệp tin ghi nhật ký cũ và tệp tin rác của nhà phát triển để lấy lại không gian đĩa.</p>", ">{t('sys_junk_desc')}</p>"),
    (">Bộ Nhớ Đệm Của Ứng Dụng (User Caches)</div>", ">{t('user_caches')}</div>"),
    (">Nhật Ký Hoạt Động (User Logs)</div>", ">{t('user_logs')}</div>"),
    (">Dữ Liệu Xcode DerivedData (Dành cho Lập trình viên)</div>", ">{t('xcode_derived')}</div>"),
    (">Thùng Rác Hệ Thống (Trash Bins)</div>", ">{t('sys_trash')}</div>"),
    # Junk buttons
    (">Quét Rác</button>", ">{t('scan_junk')}</button>"),
    (">Làm Sạch Rác Hệ Thống<", ">{t('clean_junk')}<"),
    # Large files tab
    ("<h1>Tập Tin Lớn & Cũ</h1>", "<h1>{t('large_files_title')}</h1>"),
    (">Tìm kiếm và loại bỏ các tệp tin có dung lượng lớn ít khi sử dụng.</p>", ">{t('large_files_desc')}</p>"),
    (">Quét Tệp Lớn</button>", ">{t('scan_large_files')}</button>"),
    # Optimization tab
    ("<h1>Tối Ưu Hóa Tiến Trình</h1>", "<h1>{t('opt_title')}</h1>"),
    (">Xem và tắt các ứng dụng chạy ngầm đang tiêu tốn nhiều tài nguyên hệ thống.</p>", ">{t('opt_desc')}</p>"),
    # Maintenance tab
    ("<h1>Bảo Trì Hệ Thống</h1>", "<h1>{t('maint_title')}</h1>"),
    (">Thực hiện tối ưu hóa hiệu năng RAM và dọn dẹp DNS.</p>", ">{t('maint_desc')}</p>"),
    (">Giải Phóng RAM</h3>", ">{t('purge_ram')}</h3>"),
    (">Giải phóng bộ nhớ RAM không hoạt động để tăng tốc hệ thống.</p>", ">{t('purge_ram_desc')}</p>"),
    (">Dọn Dẹp DNS Cache</h3>", ">{t('flush_dns')}</h3>"),
    (">Xóa bộ nhớ đệm phân giải tên miền DNS để sửa lỗi mạng.</p>", ">{t('flush_dns_desc')}</p>"),
    # App slimmer tab
    ("<h1>Ứng Dụng Nén (App Slimmer)</h1>", "<h1>{t('slim_title')}</h1>"),
    (">Giảm dung lượng ứng dụng bằng cách nén in-place hoặc giải phóng sang dạng stub tự phục hồi.</p>", ">{t('slim_desc')}</p>"),
    ("placeholder=\"Tìm kiếm ứng dụng...\"", "placeholder={t('search_app')}"),
    (">Tất cả ứng dụng</button>", ">{t('filter_all')}</button>"),
    (">Có thể nén</button>", ">{t('filter_slimmable')}</button>"),
    (">Đã giải phóng (Stub)</button>", ">{t('filter_offloaded')}</button>"),
    # Activity log
    (">NHẬT KÝ HOẠT ĐỘNG</span>", ">{t('activity_log')}</span>"),
    (">Xóa log</button>", ">{t('clear_log')}</button>"),
]

count = 0
for old, new in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        count += 1
    else:
        print(f"  [MISS] {old[:60]!r}")

print(f"Applied {count}/{len(replacements)} replacements")

with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(src)

print("Done! src/App.jsx updated.")
