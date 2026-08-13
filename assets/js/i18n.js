// =========================================
// CRM System - Language Dictionary & Functions
// =========================================

const i18nDictionary = {
  en: {
    app_title: "CRM System",
    menu_visit: "Visit Logs",
    menu_doctor: "Doctors",
    menu_hospital: "Hospitals",
    menu_admin_tools: "Admin Tools",
    menu_org: "Organization",
    menu_matrix: "Matrix",
    menu_assign: "Assignment",
    menu_setting: "Settings",
    menu_dcr: "DCR Approvals",
    menu_media: "Media Management",
    menu_user: "Users Management",
    btn_logout: "Logout",
    msg_loading: "Loading System...",
    msg_load_failed: "Failed to load screen",
    msg_check_file: "Please check if the file exists.",

    opt_all: "- All -",
    opt_all_doctors: "- All Doctors -",
    opt_all_hospitals: "- All Hospitals -",
    opt_all_users: "- All Users -",
    opt_all_territories: "- All Territories -",
    opt_all_products: "- All Products -",
    opt_all_specialties: "- All Specialties -",
    opt_all_types: "- All Types -",
    opt_all_provinces: "- All Provinces -",
    opt_all_zones: "- All Zones -",
    opt_search_doc: "Search Doctor (EN/TH)...",
    opt_smart_search_ph: "Search Doctor, Hospital or Product...",
    opt_select_products: "-- Select Products --",
    opt_select_purpose: "-- Select Purpose --",
    opt_select_doc_default: "-- Search/Select Doctor --",

    kpi_total_visits: "Total Visits",
    kpi_pending_drafts: "Pending Drafts",
    kpi_submitted_logs: "Submitted Logs",

    visit_title: "Visit Logs",
    visit_subtitle: "Doctor visits and daily activity logs",
    title_add_visit: "Add New Visit",
    title_edit_visit: "Edit Visit",
    btn_add_visit: "Add New Visit",
    btn_clear: "Clear",
    btn_back: "Back",
    btn_dictate: "Dictate",
    btn_cancel: "Cancel",
    btn_save: "Save",
    btn_view: "View",
    btn_list: "List",
    btn_calendar: "Calendar",
    lbl_area_team: "Area / Team",
    
    filter_doctor: "Doctor Name (EN/TH)",
    filter_hospital: "Hospital Name (EN/TH)",
    filter_date_range: "Date Range",
    filter_status: "Status",
    filter_user: "User / Sales Rep",
    filter_territory: "Territory",
    filter_product: "Product",
    
    th_date: "Date",
    th_doctor: "Doctor",
    th_hospital: "Hospital",
    th_products: "Products",
    th_purpose: "Purpose",
    th_status: "Status",
    
    lbl_show_rows: "Show rows:",
    lbl_user: "User",
    lbl_territory: "Territory",
    lbl_doctor: "Doctor Name",
    lbl_products: "Products",
    lbl_date: "Date",
    lbl_start_time: "Start Time",
    lbl_end_time: "End Time",
    lbl_purpose: "Purpose",
    lbl_details: "Details",
    lbl_insight: "Insight",
    lbl_next_action: "Next Action",
    lbl_status: "Status",

    btn_add_tot: "Add TOT",
    leg_submitted: "Submitted Visit",
    leg_pending: "Pending Draft",
    leg_unlock: "Pending Unlock",
    leg_holiday: "Public Holiday",
    leg_company: "Company Event",
    leg_tot_appr: "TOT (Approved)",
    leg_tot_pend: "TOT (Pending)",

    lbl_location: "GPS Check-in",
    lbl_attachments: "Attachments",
    btn_add_file: "Add File/Photo",
    lbl_signature: "Doctor Signature",
    btn_clear_sig: "Clear Signature",
    txt_sign_here: "Click here to sign",
    lbl_coaching_main: "Joint Visit / Coaching",
    lbl_coaching_sub: "Manager Coaching included",

    title_sys_settings: "System Settings",
    desc_sys_settings: "Master Data & Index Configuration",
    title_target_call: "Target Call (Rating) Access",
    desc_target_call_1: "Control whether Sales Reps can edit the 'Target Call' tab in Doctor Profiles.",
    desc_target_call_2: "- Set Start/End Dates for automatic access.",
    desc_target_call_3: "- Or use the Toggle Switch for manual control.",
    lbl_start_date: "Start Date",
    lbl_end_date: "End Date",
    lbl_status: "Status",
    status_loading: "Loading...",
    title_categories: "1. Categories",
    title_index_values: "2. Index Values",
    btn_add_value: "Add Value",
    opt_all_categories: "- All Categories -",
    th_category: "Category",
    th_value: "Value",
    th_action: "Action",
    lbl_show_rows: "Show rows:",
    title_add_category: "Add Category",
    title_edit_category: "Edit Category",
    lbl_category_name: "Category Name",
    ph_category_name: "e.g. Zone, Specialty",
    title_add_index: "Add Value",
    title_edit_index: "Edit Value",
    lbl_category_select: "Category (IndexType)",

    title_visit_features: "Visit Form Features",
    desc_visit_features: "Show or hide specific sections in the Visit Form.",
    lbl_enable_gps: "GPS Check-in",
    lbl_enable_attachment: "Attachments",
    lbl_enable_signature: "Signature",
    btn_add_sample: "Add Item",
    txt_no_sample: "No samples distributed (Click 'Add Item')",
    
    sec_visit_info: "Visit Information",
    sec_activity_details: "Activity Details",
    sec_edetailing: "e-Detailing / Presentation",
    btn_export: "Export",
    lbl_filter_rep: "Employee / Sales Rep",
    btn_preview: "Preview",
    unit_items: "items",
    lbl_enable_samples: "Samples",
    lbl_samples_title: "Samples & Promo Items"
  },
  th: {
    app_title: "ระบบ CRM",
    menu_visit: "บันทึกเยี่ยม",
    menu_doctor: "แพทย์",
    menu_hospital: "โรงพยาบาล",
    menu_admin_tools: "จัดการระบบ (Admin)",
    menu_org: "โครงสร้างองค์กร",
    menu_matrix: "เมทริกซ์",
    menu_assign: "มอบหมายพื้นที่",
    menu_setting: "ตั้งค่าระบบ",
    menu_dcr: "อนุมัติ DCR",
    menu_media: "จัดการสื่อ e-Detailing",
    menu_user: "ผู้ใช้งานระบบ",
    btn_logout: "ออกจากระบบ",
    msg_loading: "กำลังโหลดระบบ...",
    msg_load_failed: "ไม่สามารถโหลดหน้าจอได้",
    msg_check_file: "โปรดตรวจสอบว่าสร้างไฟล์นี้ไว้แล้วหรือยัง",

    opt_all: "- ทั้งหมด -",
    opt_all_doctors: "- แพทย์ทั้งหมด -",
    opt_all_hospitals: "- โรงพยาบาลทั้งหมด -",
    opt_all_users: "- พนักงานทั้งหมด -",
    opt_all_territories: "- เขตพื้นที่ทั้งหมด -",
    opt_all_products: "- ผลิตภัณฑ์ทั้งหมด -",
    opt_all_specialties: "- ความเชี่ยวชาญทั้งหมด -",
    opt_all_types: "- ประเภททั้งหมด -",
    opt_all_provinces: "- จังหวัดทั้งหมด -",
    opt_all_zones: "- เขต/โซนทั้งหมด -",
    opt_search_doc: "ค้นหาชื่อแพทย์ (EN/TH)...",
    opt_smart_search_ph: "ค้นหาชื่อแพทย์, โรงพยาบาล หรือผลิตภัณฑ์...",
    opt_select_products: "-- เลือกผลิตภัณฑ์ --",
    opt_select_purpose: "-- เลือกวัตถุประสงค์ --",
    opt_select_doc_default: "-- ค้นหา/เลือกแพทย์ --",

    kpi_total_visits: "จำนวนการเยี่ยมทั้งหมด",
    kpi_pending_drafts: "ฉบับร่างรอยืนยัน",
    kpi_submitted_logs: "บันทึกที่ส่งแล้ว",

    visit_title: "บันทึกเยี่ยม",
    visit_subtitle: "บันทึกการเข้าพบแพทย์และกิจกรรมประจำวัน",
    title_add_visit: "สร้างบันทึกเยี่ยมใหม่",
    title_edit_visit: "แก้ไขบันทึกเยี่ยม",
    btn_add_visit: "สร้างบันทึกเยี่ยมใหม่",
    btn_clear: "ล้างตัวกรอง",
    btn_back: "ย้อนกลับ",
    btn_dictate: "พิมพ์ด้วยเสียง",
    btn_cancel: "ยกเลิก",
    btn_save: "บันทึก",
    btn_view: "ดูข้อมูล",
    btn_list: "รายการ",
    btn_calendar: "ปฏิทิน",
    lbl_area_team: "พื้นที่ / ทีม",
    
    filter_doctor: "ชื่อแพทย์ (EN/TH)",
    filter_hospital: "ชื่อโรงพยาบาล (EN/TH)",
    filter_date_range: "ช่วงวันที่",
    filter_status: "สถานะ",
    filter_user: "พนักงาน / ฝ่ายขาย",
    filter_territory: "เขตพื้นที่",
    filter_product: "ผลิตภัณฑ์",
    
    th_date: "วันที่",
    th_doctor: "แพทย์",
    th_hospital: "โรงพยาบาล",
    th_products: "ผลิตภัณฑ์",
    th_purpose: "วัตถุประสงค์",
    th_status: "สถานะ",
    
    lbl_show_rows: "แสดงแถว:",
    lbl_user: "พนักงาน",
    lbl_territory: "เขตพื้นที่",
    lbl_doctor: "ชื่อแพทย์",
    lbl_products: "ผลิตภัณฑ์",
    lbl_date: "วันที่",
    lbl_start_time: "เวลาเริ่ม",
    lbl_end_time: "เวลาสิ้นสุด",
    lbl_purpose: "วัตถุประสงค์",
    lbl_details: "รายละเอียด",
    lbl_insight: "ข้อมูลเชิงลึก (Insight)",
    lbl_next_action: "การดำเนินการถัดไป",
    lbl_status: "สถานะ",

    btn_add_tot: "เพิ่ม TOT",
    leg_submitted: "บันทึกที่ส่งแล้ว",
    leg_pending: "ฉบับร่างรอยืนยัน",
    leg_unlock: "รอปลดล็อก",
    leg_holiday: "วันหยุดนักขัตฤกษ์",
    leg_company: "กิจกรรมบริษัท",
    leg_tot_appr: "TOT (อนุมัติแล้ว)",
    leg_tot_pend: "TOT (รออนุมัติ)",

    lbl_location: "พิกัด (GPS Check-in)",
    lbl_attachments: "รูปถ่าย/ไฟล์แนบ",
    btn_add_file: "เพิ่มไฟล์/ถ่ายรูป",
    lbl_signature: "ลายเซ็นแพทย์",
    btn_clear_sig: "ล้างลายเซ็น",
    txt_sign_here: "คลิกที่นี่เพื่อเปิดหน้าต่างเซ็นชื่อ",
    lbl_coaching_main: "ออกเยี่ยมร่วม (Joint Visit)",
    lbl_coaching_sub: "มีหัวหน้า/ผู้จัดการเข้าร่วม",
    btn_add_sample: "เพิ่มรายการ",
    txt_no_sample: "ไม่มีการจ่ายสินค้าตัวอย่าง (กดปุ่ม 'เพิ่มรายการ')",

    title_sys_settings: "ตั้งค่าระบบ (System Settings)",
    desc_sys_settings: "จัดการข้อมูลหลักและข้อมูลดัชนี (Master Data & Index)",
    title_target_call: "สิทธิ์การเข้าถึง Target Call (Rating)",
    desc_target_call_1: "ควบคุมว่าพนักงานขายสามารถแก้ไขแท็บ 'Target Call' ในหน้าโปรไฟล์แพทย์ได้หรือไม่",
    desc_target_call_2: "- กำหนด วันที่เริ่ม/สิ้นสุด เพื่อเปิดสิทธิ์อัตโนมัติ",
    desc_target_call_3: "- หรือใช้ สวิตช์เปิด/ปิด เพื่อควบคุมด้วยตัวเอง",
    lbl_start_date: "วันที่เริ่ม",
    lbl_end_date: "วันที่สิ้นสุด",
    lbl_status: "สถานะ",
    status_loading: "กำลังโหลด...",
    title_categories: "1. หมวดหมู่ (Categories)",
    title_index_values: "2. ข้อมูลดัชนี (Index Values)",
    btn_add_value: "เพิ่มข้อมูล",
    opt_all_categories: "- ทุกหมวดหมู่ -",
    th_category: "หมวดหมู่",
    th_value: "ข้อมูล",
    th_action: "จัดการ",
    lbl_show_rows: "แสดงจำนวน:",
    title_add_category: "เพิ่มหมวดหมู่",
    title_edit_category: "แก้ไขหมวดหมู่",
    lbl_category_name: "ชื่อหมวดหมู่",
    ph_category_name: "เช่น Zone, Specialty",
    title_add_index: "เพิ่มข้อมูลดัชนี",
    title_edit_index: "แก้ไขข้อมูลดัชนี",
    lbl_category_select: "หมวดหมู่ (Category)",

    title_visit_features: "ฟีเจอร์ในหน้าบันทึกเยี่ยม",
    desc_visit_features: "เปิด/ปิด การแสดงผลบางส่วนในหน้าฟอร์มบันทึกเยี่ยม (มีผลกับทุกคน)",
    lbl_enable_gps: "พิกัด GPS",
    lbl_enable_attachment: "ไฟล์แนบ",
    lbl_enable_signature: "ลายเซ็นแพทย์",
    
    sec_visit_info: "ข้อมูลการเข้าพบ",
    sec_activity_details: "รายละเอียดกิจกรรม",
    sec_edetailing: "e-Detailing / สื่อการนำเสนอ",
    btn_export: "ส่งออก",
    lbl_filter_rep: "พนักงาน / ฝ่ายขาย",
    btn_preview: "เปิดดู",
    unit_items: "เล่ม",
    lbl_enable_samples: "สินค้าตัวอย่าง",
    lbl_samples_title: "สินค้าตัวอย่างและของแจก"
  }
};

// ดึงค่าภาษาล่าสุดที่ผู้ใช้เคยเลือกไว้ (ถ้าไม่มีให้ใช้ 'en')
var currentLang = localStorage.getItem('appLang') || 'en';

// ฟังก์ชันสำหรับสั่งเปลี่ยนภาษา
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('appLang', lang);

  // สลับสีปุ่ม EN / TH
  const btnEN = document.getElementById('btnLangEN');
  const btnTH = document.getElementById('btnLangTH');
  if (btnEN && btnTH) {
    if (lang === 'th') {
      btnTH.className = "btn btn-primary";
      btnEN.className = "btn btn-outline-primary";
    } else {
      btnEN.className = "btn btn-primary";
      btnTH.className = "btn btn-outline-primary";
    }
  }

  // ค้นหาทุกจุดที่มี data-i18n แล้วยัดคำแปลลงไป
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18nDictionary[lang] && i18nDictionary[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = i18nDictionary[lang][key];
      } else if (el.tagName === 'OPTION') {
        el.text = i18nDictionary[lang][key];
      } else {
        el.innerText = i18nDictionary[lang][key];
      }
    }
  });

  // 🌟 บรอดแคสต์ (กระจายสัญญาณ) ไปให้หน้าย่อยต่างๆ อัปเดตข้อมูลของตัวเอง
  window.dispatchEvent(new CustomEvent('appLanguageChanged', { detail: lang }));
}

// ฟังก์ชันสำหรับแปลข้อความใน JavaScript
function t(key) {
  return (i18nDictionary[currentLang] && i18nDictionary[currentLang][key]) 
    ? i18nDictionary[currentLang][key] 
    : key;
}
