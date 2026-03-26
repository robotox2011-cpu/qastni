// src/main.js
// ─── Qastni App Entry Point ───────────────────────────────
import {
  supabase, signIn, signUp, signOut, getCurrentUser
} from './lib/supabase.js'
import {
  createDeal, fetchMyDeals, fetchDeal,
  respondToDeal, markPaymentPaid,
  submitRating, getUserRatings, hasRated,
  fetchNotifications, markNotifsRead,
  subscribeToDeals, subscribeToNotifications, unsubscribe
} from './lib/api.js'

// ══════════════════════════════════════
// APP STATE
// ══════════════════════════════════════
const App = {
  user:        null,
  profile:     null,
  lang:        localStorage.getItem('q_lang') || 'ar',
  page:        'dash',
  filter:      'all',
  deals:       [],
  notifs:      [],
  channels:    [],
  ratingState: { dealId: null, target: null, targetEmail: null, stars: 0 },
  confirmCb:   null,
}

// ══════════════════════════════════════
// TRANSLATIONS (inline for single-file readability)
// ══════════════════════════════════════
const TR = {
  ar: {
    appName:'قسطني', tagline:'منصة التقسيط الآمنة بين الأفراد',
    login:'تسجيل الدخول', register:'إنشاء حساب', logout:'خروج',
    email:'البريد الإلكتروني', password:'كلمة المرور',
    fullName:'الاسم الكامل', phone:'رقم الجوال', natId:'رقم الهوية',
    confirmPass:'تأكيد كلمة المرور',
    dashboard:'الرئيسية', newDeal:'طلب جديد',
    incoming:'الطلبات الواردة', myDeals:'صفقاتي', profile:'ملفي الشخصي',
    activeDeals:'صفقات نشطة', completed:'مكتملة', pending:'معلق',
    totalVal:'إجمالي القيمة', recentDeals:'آخر الصفقات', viewAll:'عرض الكل',
    createNew:'إنشاء طلب تقسيط جديد',
    sellerEmail:'البريد الإلكتروني للبائع', itemType:'نوع السلعة',
    itemDesc:'وصف السلعة', totalPrice:'السعر الإجمالي (ر.س)',
    downPayment:'الدفعة الأولى (ر.س)', months:'عدد الأشهر',
    startDate:'تاريخ بدء الأقساط', notes:'ملاحظات إضافية',
    calcInstallment:'القسط الشهري المحسوب', sendRequest:'إرسال الطلب',
    accept:'قبول', reject:'رفض', viewDetails:'عرض التفاصيل',
    markPaid:'تحديد كمدفوع', rateParty:'قيّم الطرف الآخر',
    submitRating:'إرسال التقييم', cancel:'إلغاء',
    noDeals:'لا توجد صفقات بعد', noIncoming:'لا توجد طلبات واردة',
    paySchedule:'جدول الأقساط', progress:'تقدم السداد',
    contract:'عقد الاتفاقية', print:'طباعة',
    status_pending:'بانتظار الموافقة', status_active:'نشطة',
    status_rejected:'مرفوضة', status_completed:'مكتملة',
    cur:'ر.س', monthsShort:'شهر', monthsLong:'أشهر',
    buyer:'المشتري', seller:'البائع', to:'إلى', from:'من',
    totalPaid:'إجمالي المدفوع', remaining:'المتبقي',
    joinDate:'تاريخ الانضمام', totalDeals:'إجمالي الصفقات',
    avgRating:'متوسط التقييم', reviewsReceived:'التقييمات المستلمة',
    noRatings:'لا تقييمات بعد', ratingComment:'تعليق (اختياري)',
    howWasExp:'كيف كانت تجربتك في هذه الصفقة؟',
    disclaimer:'قسطني منصة وساطة فقط — لا تُجري معاملات مالية أو تحتجز أموالاً',
    contractTitle:'عقد اتفاقية تقسيط',
    contractParties:'أطراف الاتفاقية', contractFin:'التفاصيل المالية',
    contractTerms:'البنود والشروط', contractSig:'توقيع',
    contractDisclaimer:'وثيقة صادرة من منصة قسطني للتوثيق الرقمي — لأغراض الاتفاق فقط',
    items:{ car:'🚗 سيارة', phone:'📱 هاتف', laptop:'💻 لابتوب', tv:'📺 تلفاز', furniture:'🪑 أثاث', motorcycle:'🏍️ دراجة', other:'📦 أخرى' },
    terms:['يلتزم المشتري بسداد الأقساط الشهرية في مواعيدها المحددة.','يلتزم البائع بتسليم السلعة عند استلام الدفعة الأولى.','في حال التأخر في السداد يحق للبائع إخطار المشتري عبر المنصة.','تبقى ملكية السلعة للبائع حتى سداد كامل المبلغ.','قسطني وسيط مُيسّر فقط وليست طرفاً في هذه الاتفاقية.'],
    errRequired:'يرجى ملء جميع الحقول المطلوبة',
    errEmail:'البريد الإلكتروني غير صالح',
    errPassLen:'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    errPassMatch:'كلمتا المرور غير متطابقتان',
    errSelf:'لا يمكنك إرسال طلب لنفسك',
    errDown:'الدفعة الأولى يجب أن تكون أقل من السعر الإجمالي',
    errMonths:'عدد الأشهر يجب أن يكون بين 1 و60',
    toastSent:'✅ تم إرسال الطلب بنجاح!',
    toastAccepted:'✅ تمت الموافقة على الصفقة',
    toastRejected:'❌ تم رفض الطلب',
    toastPaid:'💰 تم تسجيل الدفعة بنجاح',
    toastCompleted:'🎉 اكتملت الصفقة بالكامل!',
    toastRated:'⭐ شكراً! تم إرسال تقييمك',
    toastRegistered:'🎉 تم إنشاء حسابك بنجاح!',
    loading:'جاري التحميل...',
    overdue:'متأخر', paid:'مدفوع', unpaid:'غير مدفوع',
    month:'الشهر', dueDate:'تاريخ الاستحقاق', amount:'المبلغ', action:'إجراء',
    buyerSig:'توقيع المشتري', sellerSig:'توقيع البائع',
    issuedDate:'تاريخ الإصدار',
    selectItem:'-- اختر السلعة --',
    hintSeller:'يجب أن يكون البائع مسجلاً في المنصة',
    hintMonths:'من 1 حتى 60 شهراً',
    toggle:'English',
    realtime:'🔴 مباشر',
  },
  en: {
    appName:'Qastni', tagline:'Safe P2P Installment Platform',
    login:'Sign In', register:'Create Account', logout:'Logout',
    email:'Email', password:'Password',
    fullName:'Full Name', phone:'Phone', natId:'National ID',
    confirmPass:'Confirm Password',
    dashboard:'Dashboard', newDeal:'New Request',
    incoming:'Incoming', myDeals:'My Deals', profile:'My Profile',
    activeDeals:'Active Deals', completed:'Completed', pending:'Pending',
    totalVal:'Total Value', recentDeals:'Recent Deals', viewAll:'View All',
    createNew:'Create New Installment Request',
    sellerEmail:"Seller's Email", itemType:'Item Type',
    itemDesc:'Item Description', totalPrice:'Total Price (SAR)',
    downPayment:'Down Payment (SAR)', months:'Number of Months',
    startDate:'Installment Start Date', notes:'Additional Notes',
    calcInstallment:'Calculated Monthly Installment', sendRequest:'Send Request',
    accept:'Accept', reject:'Reject', viewDetails:'View Details',
    markPaid:'Mark as Paid', rateParty:'Rate Other Party',
    submitRating:'Submit Rating', cancel:'Cancel',
    noDeals:'No deals yet', noIncoming:'No incoming requests',
    paySchedule:'Payment Schedule', progress:'Payment Progress',
    contract:'Agreement Contract', print:'Print',
    status_pending:'Pending Approval', status_active:'Active',
    status_rejected:'Rejected', status_completed:'Completed',
    cur:'SAR', monthsShort:'month', monthsLong:'months',
    buyer:'Buyer', seller:'Seller', to:'To', from:'From',
    totalPaid:'Total Paid', remaining:'Remaining',
    joinDate:'Member Since', totalDeals:'Total Deals',
    avgRating:'Avg Rating', reviewsReceived:'Reviews Received',
    noRatings:'No ratings yet', ratingComment:'Comment (optional)',
    howWasExp:'How was your experience in this deal?',
    disclaimer:'Qastni is a mediation platform only — no financial transactions or fund holding',
    contractTitle:'Installment Agreement Contract',
    contractParties:'Contract Parties', contractFin:'Financial Details',
    contractTerms:'Terms & Conditions', contractSig:'Signature',
    contractDisclaimer:'Document issued by Qastni P2P platform — for agreement purposes only',
    items:{ car:'🚗 Car', phone:'📱 Phone', laptop:'💻 Laptop', tv:'📺 TV', furniture:'🪑 Furniture', motorcycle:'🏍️ Motorcycle', other:'📦 Other' },
    terms:['The buyer commits to paying monthly installments on their scheduled dates.','The seller commits to delivering the item upon receiving the down payment.','In case of delayed payment, the seller may notify the buyer via the platform.','Ownership remains with the seller until full payment is completed.','Qastni is a facilitating intermediary only and is not party to this agreement.'],
    errRequired:'Please fill all required fields',
    errEmail:'Invalid email address',
    errPassLen:'Password must be at least 6 characters',
    errPassMatch:'Passwords do not match',
    errSelf:'You cannot send a request to yourself',
    errDown:'Down payment must be less than total price',
    errMonths:'Months must be between 1 and 60',
    toastSent:'✅ Request sent successfully!',
    toastAccepted:'✅ Deal accepted',
    toastRejected:'❌ Request rejected',
    toastPaid:'💰 Payment recorded successfully',
    toastCompleted:'🎉 Deal fully completed!',
    toastRated:'⭐ Thank you! Rating submitted',
    toastRegistered:'🎉 Account created successfully!',
    loading:'Loading...',
    overdue:'Overdue', paid:'Paid', unpaid:'Unpaid',
    month:'Month', dueDate:'Due Date', amount:'Amount', action:'Action',
    buyerSig:'Buyer Signature', sellerSig:'Seller Signature',
    issuedDate:'Issued',
    selectItem:'-- Select Item --',
    hintSeller:'Seller must be registered on the platform',
    hintMonths:'1 to 60 months',
    toggle:'عربي',
    realtime:'🔴 Live',
  }
}

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
const t = k => (TR[App.lang] || TR.ar)[k] || k
const isAr = () => App.lang === 'ar'

function fmtSAR(n) {
  if (!n && n !== 0) return '—'
  return Math.round(n * 100) / 100
    .toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ' + t('cur')
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString(isAr() ? 'ar-SA' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric' })
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
function initials(name = '') { return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?' }
function avatarBg(email = '') {
  const cols = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626']
  return cols[email.charCodeAt(0) % cols.length]
}
function addMonths(dateStr, n) {
  const d = new Date(dateStr); d.setMonth(d.getMonth() + n)
  return d.toISOString().split('T')[0]
}
function todayStr() { return new Date().toISOString().split('T')[0] }
const ITEM_ICONS = { car:'🚗', phone:'📱', laptop:'💻', tv:'📺', furniture:'🪑', motorcycle:'🏍️', other:'📦', 'سيارة':'🚗', 'هاتف':'📱', 'لابتوب':'💻', 'تلفاز':'📺', 'أثاث':'🪑', 'دراجة':'🏍️', 'أخرى':'📦' }
const getIcon = v => ITEM_ICONS[v] || '📦'

function avgRating(ratings) {
  if (!ratings?.length) return null
  return { avg: Math.round(ratings.reduce((s, r) => s + r.stars, 0) / ratings.length * 10) / 10, count: ratings.length }
}

function renderStars(avg, count, size = 13) {
  if (!avg) return `<span style="font-size:${size - 1}px;color:var(--g400)">${t('noRatings')}</span>`
  const full = Math.round(avg)
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span style="font-size:${size}px;color:${i < full ? '#f59e0b' : '#e2e8f0'}">${i < full ? '★' : '☆'}</span>`
  ).join('')
  return `<span style="display:inline-flex;align-items:center;gap:3px">${stars}<span style="font-size:${size - 1}px;font-weight:700;color:var(--g700)">${avg}</span><span style="font-size:${size - 2}px;color:var(--g400)">(${count})</span></span>`
}

function statusBadge(status) {
  const m = {
    pending:   ['b-amber', t('status_pending')],
    active:    ['b-blue',  t('status_active')],
    rejected:  ['b-red',   t('status_rejected')],
    completed: ['b-green', t('status_completed')],
  }
  const [cls, lbl] = m[status] || ['b-gray', status]
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${lbl}</span>`
}

// ══════════════════════════════════════
// DOM HELPERS
// ══════════════════════════════════════
const $ = id => document.getElementById(id)
const html = (id, content) => { const el = $(id); if (el) el.innerHTML = content }
const show = id => $(id)?.classList.remove('hidden')
const hide = id => $(id)?.classList.add('hidden')
const setText = (id, val) => { const el = $(id); if (el) el.textContent = val }

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
function toast(msg, type = 'info') {
  const container = $('toast-container')
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  container.appendChild(el)
  setTimeout(() => {
    el.classList.add('toast-exit')
    setTimeout(() => el.remove(), 240)
  }, 3200)
}

// ══════════════════════════════════════
// LANGUAGE
// ══════════════════════════════════════
function applyLang() {
  document.documentElement.dir = isAr() ? 'rtl' : 'ltr'
  document.documentElement.lang = App.lang
  document.body.classList.toggle('en', !isAr())
  document.querySelectorAll('.ar-text').forEach(el => el.classList.toggle('hidden', !isAr()))
  document.querySelectorAll('.en-text').forEach(el => el.classList.toggle('hidden',  isAr()))
  document.querySelectorAll('[data-lang-btn]').forEach(btn => btn.textContent = t('toggle'))
  localStorage.setItem('q_lang', App.lang)
}

window.toggleLang = () => { App.lang = isAr() ? 'en' : 'ar'; applyLang(); renderCurrent() }

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════
window.switchAuthTab = tab => {
  $('form-login')?.classList.toggle('hidden', tab !== 'login')
  $('form-register')?.classList.toggle('hidden', tab !== 'register')
  $('tab-login-btn')?.classList.toggle('active', tab === 'login')
  $('tab-reg-btn')?.classList.toggle('active', tab === 'register')
}

window.doLogin = async () => {
  const email = $('l-email')?.value.trim().toLowerCase()
  const pass  = $('l-pass')?.value
  clearAuthErr()
  if (!email || !pass) { showAuthErr('login', t('errRequired')); return }

  const btn = $('login-btn')
  btn.innerHTML = `<span class="spinner"></span>`
  btn.disabled = true

  try {
    await signIn({ email, password: pass })
    // onAuthStateChange handles the rest
  } catch (err) {
    showAuthErr('login', err.message)
    btn.textContent = t('login')
    btn.disabled = false
  }
}

window.doRegister = async () => {
  const name   = $('r-name')?.value.trim()
  const email  = $('r-email')?.value.trim().toLowerCase()
  const phone  = $('r-phone')?.value.trim()
  const natId  = $('r-id')?.value.trim()
  const pass   = $('r-pass')?.value
  const pass2  = $('r-pass2')?.value
  clearAuthErr()

  if (!name || !email || !pass) { showAuthErr('reg', t('errRequired')); return }
  if (!email.includes('@'))      { showAuthErr('reg', t('errEmail'));    return }
  if (pass.length < 6)           { showAuthErr('reg', t('errPassLen')); return }
  if (pass !== pass2)            { showAuthErr('reg', t('errPassMatch')); return }

  const btn = $('reg-btn')
  btn.innerHTML = `<span class="spinner"></span>`
  btn.disabled = true

  try {
    await signUp({ email, password: pass, fullName: name, phone, nationalId: natId })
    toast(t('toastRegistered'), 'success')
    // onAuthStateChange fires after email confirmation or immediately if disabled
  } catch (err) {
    showAuthErr('reg', err.message)
    btn.textContent = t('register')
    btn.disabled = false
  }
}

window.doLogout = async () => {
  // Cleanup realtime channels
  App.channels.forEach(ch => unsubscribe(ch))
  App.channels = []
  await signOut()
  // onAuthStateChange handles redirect
}

function showAuthErr(form, msg) {
  const id = form === 'login' ? 'login-err' : 'reg-err'
  const el = $(id)
  if (el) { el.textContent = '⚠️ ' + msg; el.classList.remove('hidden') }
}
function clearAuthErr() {
  $('login-err')?.classList.add('hidden')
  $('reg-err')?.classList.add('hidden')
}

// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════
const PAGE_TITLES = {
  dash: () => isAr() ? 'الرئيسية' : 'Dashboard',
  create: () => isAr() ? 'طلب جديد' : 'New Request',
  incoming: () => isAr() ? 'الطلبات الواردة' : 'Incoming Requests',
  deals: () => isAr() ? 'صفقاتي' : 'My Deals',
  detail: () => isAr() ? 'تفاصيل الصفقة' : 'Deal Details',
  profile: () => isAr() ? 'ملفي الشخصي' : 'My Profile',
}

const ALL_PAGES = Object.keys(PAGE_TITLES)

window.navigate = async (page, params = {}) => {
  App.page = page
  App.pageParams = params

  ALL_PAGES.forEach(p => {
    $(`page-${p}`)?.classList.add('hidden')
    $(`nav-${p}`)?.classList.remove('active')
  })
  $(`page-${page}`)?.classList.remove('hidden')
  $(`nav-${page}`)?.classList.add('active')
  setText('page-title-bar', PAGE_TITLES[page]?.() || '')

  updateBadge()

  if (page === 'dash')     await renderDash()
  if (page === 'incoming') await renderIncoming()
  if (page === 'deals')    await renderDeals()
  if (page === 'profile')  await renderProfile()
  if (page === 'detail')   await renderDetail(params.dealId)
  if (page === 'create')   initCreateForm()
}

function renderCurrent() {
  applyLang()
  const p = App.page
  if (p === 'dash')     renderDash()
  if (p === 'incoming') renderIncoming()
  if (p === 'deals')    renderDeals()
  if (p === 'profile')  renderProfile()
  if (p === 'detail' && App.pageParams?.dealId) renderDetail(App.pageParams.dealId)
  setText('page-title-bar', PAGE_TITLES[p]?.() || '')
}

function updateBadge() {
  const n = App.deals.filter(d => d.seller_email === App.user?.email && d.status === 'pending').length
  const badge = $('incoming-badge')
  if (badge) { badge.textContent = n; badge.classList.toggle('hidden', n === 0) }
}

// ══════════════════════════════════════
// INIT APP (after login)
// ══════════════════════════════════════
async function initApp(user, profile) {
  App.user    = user
  App.profile = profile

  // Build UI
  buildAppShell()

  // Load data
  await loadAllData()

  // Setup realtime
  setupRealtime()

  // Navigate to dashboard
  await navigate('dash')
}

async function loadAllData() {
  const [deals, notifs] = await Promise.all([
    fetchMyDeals(App.user.email, App.user.id).catch(() => []),
    fetchNotifications(App.user.id).catch(() => []),
  ])
  App.deals  = deals
  App.notifs = notifs
}

function setupRealtime() {
  const ch1 = subscribeToDeals(App.user.email, App.user.id, async () => {
    App.deals = await fetchMyDeals(App.user.email, App.user.id).catch(() => App.deals)
    updateBadge()
    renderCurrent()
    toast(isAr() ? '🔄 تم تحديث البيانات' : '🔄 Data updated', 'info')
  })

  const ch2 = subscribeToNotifications(App.user.id, async (payload) => {
    App.notifs = await fetchNotifications(App.user.id).catch(() => App.notifs)
    const n = payload.new
    toast(isAr() ? n?.title_ar : n?.title_en, 'info')
    updateBadge()
  })

  App.channels.push(ch1, ch2)
}

// ══════════════════════════════════════
// BUILD APP SHELL (HTML structure)
// ══════════════════════════════════════
function buildAppShell() {
  const u = App.user
  const p = App.profile
  const name  = p?.full_name || u.email.split('@')[0]
  const color = p?.avatar_color || avatarBg(u.email)
  const ini   = initials(name)

  const ITEM_OPTIONS = Object.entries(t('items'))
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join('')

  document.body.innerHTML = `
  <!-- APP SHELL -->
  <div class="app-shell">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sb-brand">
        <div class="sb-brand-icon">ق</div>
        <div>
          <div class="sb-brand-name">قسطني</div>
          <div class="sb-brand-tag">Qastni Platform</div>
        </div>
      </div>
      <nav class="sb-nav">
        <div class="sb-section-label ar-text">القائمة</div>
        <div class="sb-section-label en-text hidden">Menu</div>
        <button class="nav-item active" id="nav-dash" onclick="navigate('dash')">
          <span class="nav-icon">🏠</span>
          <span class="ar-text">الرئيسية</span><span class="en-text hidden">Dashboard</span>
        </button>
        <button class="nav-item" id="nav-create" onclick="navigate('create')">
          <span class="nav-icon">➕</span>
          <span class="ar-text">طلب جديد</span><span class="en-text hidden">New Request</span>
        </button>
        <button class="nav-item" id="nav-incoming" onclick="navigate('incoming')">
          <span class="nav-icon">📥</span>
          <span class="ar-text">الطلبات الواردة</span><span class="en-text hidden">Incoming</span>
          <span class="nav-badge hidden" id="incoming-badge">0</span>
        </button>
        <button class="nav-item" id="nav-deals" onclick="navigate('deals')">
          <span class="nav-icon">📋</span>
          <span class="ar-text">صفقاتي</span><span class="en-text hidden">My Deals</span>
        </button>
        <button class="nav-item" id="nav-profile" onclick="navigate('profile')">
          <span class="nav-icon">👤</span>
          <span class="ar-text">ملفي الشخصي</span><span class="en-text hidden">My Profile</span>
        </button>
      </nav>
      <div class="sb-footer">
        <div class="sb-user">
          <div class="sb-avatar" style="background:${color}">${ini}</div>
          <div style="flex:1;min-width:0">
            <div class="sb-user-name">${name}</div>
            <div class="sb-user-email">${u.email}</div>
            <div id="sb-stars" style="margin-top:3px"></div>
          </div>
        </div>
        <div class="flex gap8">
          <button class="lang-btn" data-lang-btn onclick="toggleLang()" style="flex:1">${t('toggle')}</button>
          <button class="btn btn-ghost btn-sm" onclick="doLogout()" style="flex:1">
            <span class="ar-text">خروج</span><span class="en-text hidden">Logout</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- MAIN -->
    <div class="main-area">
      <div class="topbar">
        <div class="flex aic gap8">
          <span class="topbar-title" id="page-title-bar">الرئيسية</span>
          <span style="font-size:10px;color:var(--g400)">${t('realtime')}</span>
        </div>
        <div class="flex aic gap8">
          <button class="lang-btn" data-lang-btn onclick="toggleLang()">${t('toggle')}</button>
          <button class="btn btn-ghost btn-sm" onclick="doLogout()">
            <span class="ar-text">خروج</span><span class="en-text hidden">Logout</span>
          </button>
        </div>
      </div>

      <!-- DASHBOARD -->
      <div class="page-wrap hidden" id="page-dash">
        <div class="page-inner">
          <div class="disclaimer-bar">⚠️ <span class="ar-text">${TR.ar.disclaimer}</span><span class="en-text hidden">${TR.en.disclaimer}</span></div>
          <h1 class="page-title" id="dash-welcome">مرحباً 👋</h1>
          <p class="page-subtitle ar-text">إليك ملخص نشاطك في منصة قسطني</p>
          <p class="page-subtitle en-text hidden">Here's a summary of your Qastni activity</p>
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon" style="background:#dbeafe">📊</div><div class="stat-value" id="s-active">0</div><div class="stat-label ar-text">صفقات نشطة</div><div class="stat-label en-text hidden">Active Deals</div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#dcfce7">✅</div><div class="stat-value" id="s-done">0</div><div class="stat-label ar-text">مكتملة</div><div class="stat-label en-text hidden">Completed</div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#fef3c7">⏳</div><div class="stat-value" id="s-pend">0</div><div class="stat-label ar-text">معلقة</div><div class="stat-label en-text hidden">Pending</div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#ede9fe">💰</div><div class="stat-value" id="s-val">0</div><div class="stat-label ar-text">إجمالي القيمة</div><div class="stat-label en-text hidden">Total Value</div></div>
          </div>
          <div class="section-hdr">
            <h2 class="section-title ar-text">آخر الصفقات</h2>
            <h2 class="section-title en-text hidden">Recent Deals</h2>
            <button class="btn btn-secondary btn-sm" onclick="navigate('deals')">
              <span class="ar-text">عرض الكل</span><span class="en-text hidden">View All</span>
            </button>
          </div>
          <div id="dash-list"></div>
          <div class="mt20">
            <button class="btn btn-primary btn-lg" onclick="navigate('create')">
              ➕ <span class="ar-text">إنشاء طلب تقسيط جديد</span><span class="en-text hidden">Create New Installment Request</span>
            </button>
          </div>
        </div>
      </div>

      <!-- CREATE DEAL -->
      <div class="page-wrap hidden" id="page-create">
        <div class="page-inner" style="max-width:720px">
          <h1 class="page-title ar-text">إنشاء طلب تقسيط</h1>
          <h1 class="page-title en-text hidden">Create Installment Request</h1>
          <p class="page-subtitle ar-text">أدخل التفاصيل وسيتم إرسال الطلب للبائع للموافقة</p>
          <p class="page-subtitle en-text hidden">Enter details — the request will be sent to the seller for approval</p>
          <div class="card">
            <div class="card-header">
              <h3 class="ar-text">تفاصيل الاتفاقية</h3>
              <h3 class="en-text hidden">Agreement Details</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label"><span class="ar-text">البريد الإلكتروني للبائع</span><span class="en-text hidden">Seller's Email</span> <span class="req">*</span></label>
                <input class="form-control" type="email" id="cr-seller" placeholder="seller@example.com"/>
                <p class="form-hint ar-text">يجب أن يكون البائع مسجلاً في المنصة</p>
                <p class="form-hint en-text hidden">Seller must be registered on the platform</p>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label"><span class="ar-text">نوع السلعة</span><span class="en-text hidden">Item Type</span> <span class="req">*</span></label>
                  <select class="form-control" id="cr-item">
                    <option value=""><span class="ar-text">-- اختر --</span></option>
                    ${ITEM_OPTIONS}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label"><span class="ar-text">وصف السلعة</span><span class="en-text hidden">Description</span></label>
                  <input class="form-control" type="text" id="cr-desc" placeholder="Toyota Camry 2021..."/>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label"><span class="ar-text">السعر الإجمالي (ر.س)</span><span class="en-text hidden">Total Price (SAR)</span> <span class="req">*</span></label>
                  <input class="form-control" type="number" id="cr-price" placeholder="50000" min="1" oninput="calcInstallment()"/>
                </div>
                <div class="form-group">
                  <label class="form-label"><span class="ar-text">الدفعة الأولى (ر.س)</span><span class="en-text hidden">Down Payment (SAR)</span></label>
                  <input class="form-control" type="number" id="cr-down" placeholder="5000" min="0" value="0" oninput="calcInstallment()"/>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label"><span class="ar-text">عدد الأشهر</span><span class="en-text hidden">Number of Months</span> <span class="req">*</span></label>
                  <input class="form-control" type="number" id="cr-months" placeholder="12" min="1" max="60" oninput="calcInstallment()"/>
                  <p class="form-hint ar-text">من 1 حتى 60 شهراً</p><p class="form-hint en-text hidden">1 to 60 months</p>
                </div>
                <div class="form-group">
                  <label class="form-label"><span class="ar-text">تاريخ بدء الأقساط</span><span class="en-text hidden">Start Date</span></label>
                  <input class="form-control" type="date" id="cr-startdate"/>
                </div>
              </div>
              <div class="calc-box">
                <div>
                  <div class="calc-label ar-text">القسط الشهري المحسوب</div>
                  <div class="calc-label en-text hidden">Monthly Installment</div>
                  <div class="calc-sublabel" id="calc-breakdown"></div>
                </div>
                <div class="calc-value" id="calc-val">—</div>
              </div>
              <div class="form-group mt16">
                <label class="form-label"><span class="ar-text">ملاحظات إضافية</span><span class="en-text hidden">Notes</span></label>
                <textarea class="form-control" id="cr-notes" rows="2" placeholder="${isAr() ? 'أي شروط خاصة...' : 'Any special conditions...'}"></textarea>
              </div>
            </div>
            <div class="card-footer flex jce gap10">
              <button class="btn btn-ghost" onclick="navigate('dash')">
                <span class="ar-text">إلغاء</span><span class="en-text hidden">Cancel</span>
              </button>
              <button class="btn btn-primary btn-lg" id="submit-deal-btn" onclick="handleSubmitDeal()">
                📤 <span class="ar-text">إرسال الطلب</span><span class="en-text hidden">Send Request</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- INCOMING -->
      <div class="page-wrap hidden" id="page-incoming">
        <div class="page-inner">
          <h1 class="page-title ar-text">الطلبات الواردة</h1>
          <h1 class="page-title en-text hidden">Incoming Requests</h1>
          <p class="page-subtitle ar-text">طلبات التقسيط المُرسلة إليك من المشترين</p>
          <p class="page-subtitle en-text hidden">Installment requests sent to you by buyers</p>
          <div id="incoming-list"></div>
        </div>
      </div>

      <!-- MY DEALS -->
      <div class="page-wrap hidden" id="page-deals">
        <div class="page-inner">
          <h1 class="page-title ar-text">صفقاتي</h1>
          <h1 class="page-title en-text hidden">My Deals</h1>
          <p class="page-subtitle ar-text">جميع اتفاقيات التقسيط الخاصة بك</p>
          <p class="page-subtitle en-text hidden">All your installment agreements</p>
          <div class="tab-bar">
            <button class="tab-btn active" onclick="filterDeals('all')" id="tab-all"><span class="ar-text">الكل</span><span class="en-text hidden">All</span></button>
            <button class="tab-btn" onclick="filterDeals('active')" id="tab-active"><span class="ar-text">نشطة</span><span class="en-text hidden">Active</span></button>
            <button class="tab-btn" onclick="filterDeals('pending')" id="tab-pending"><span class="ar-text">معلقة</span><span class="en-text hidden">Pending</span></button>
            <button class="tab-btn" onclick="filterDeals('completed')" id="tab-completed"><span class="ar-text">مكتملة</span><span class="en-text hidden">Completed</span></button>
            <button class="tab-btn" onclick="filterDeals('rejected')" id="tab-rejected"><span class="ar-text">مرفوضة</span><span class="en-text hidden">Rejected</span></button>
          </div>
          <div id="deals-list"></div>
        </div>
      </div>

      <!-- DEAL DETAIL -->
      <div class="page-wrap hidden" id="page-detail">
        <div class="page-inner" id="detail-content"></div>
      </div>

      <!-- PROFILE -->
      <div class="page-wrap hidden" id="page-profile">
        <div class="page-inner" id="profile-content"></div>
      </div>
    </div>
  </div>

  <!-- RATING MODAL -->
  <div class="modal-overlay hidden" id="rating-modal">
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <h3 id="rating-title"><span class="ar-text">تقييم الطرف الآخر</span><span class="en-text hidden">Rate Other Party</span></h3>
        <button class="modal-close" onclick="closeRatingModal()">✕</button>
      </div>
      <div class="modal-body" style="text-align:center">
        <p class="text-muted mb16 ar-text">${TR.ar.howWasExp}</p>
        <p class="text-muted mb16 en-text hidden">${TR.en.howWasExp}</p>
        <div class="stars-input">
          ${[1,2,3,4,5].map(n => `<span class="star-rate" onclick="setStarRating(${n})" data-v="${n}">⭐</span>`).join('')}
        </div>
        <div class="form-group mt12">
          <textarea class="form-control" id="rating-comment" rows="2" placeholder="${isAr() ? 'تعليق (اختياري)...' : 'Comment (optional)...'}"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeRatingModal()"><span class="ar-text">إلغاء</span><span class="en-text hidden">Cancel</span></button>
        <button class="btn btn-primary" onclick="handleSubmitRating()">⭐ <span class="ar-text">إرسال التقييم</span><span class="en-text hidden">Submit Rating</span></button>
      </div>
    </div>
  </div>

  <!-- TOAST -->
  <div class="toast-container" id="toast-container"></div>
  `

  applyLang()
  updateSidebarStars()
}

async function updateSidebarStars() {
  const ratings = await getUserRatings(App.user.email).catch(() => [])
  const r = avgRating(ratings)
  const el = $('sb-stars')
  if (el) el.innerHTML = renderStars(r?.avg, r?.count, 12)
}

// ══════════════════════════════════════
// CREATE FORM
// ══════════════════════════════════════
function initCreateForm() {
  const sd = $('cr-startdate')
  if (sd && !sd.value) sd.value = todayStr()
}

window.calcInstallment = () => {
  const price  = parseFloat($('cr-price')?.value) || 0
  const down   = parseFloat($('cr-down')?.value)  || 0
  const months = parseInt($('cr-months')?.value)  || 0
  const valEl  = $('calc-val')
  const brkEl  = $('calc-breakdown')
  if (!valEl) return
  if (price > 0 && months > 0 && down < price) {
    const rem  = price - down
    const inst = rem / months
    valEl.textContent = fmtSAR(inst)
    if (brkEl) brkEl.textContent = `(${fmtSAR(rem)} ÷ ${months} ${t('monthsShort')})`
  } else {
    valEl.textContent = '—'
    if (brkEl) brkEl.textContent = ''
  }
}

window.handleSubmitDeal = async () => {
  const sellerEmail = $('cr-seller')?.value.trim().toLowerCase()
  const item        = $('cr-item')?.value
  const description = $('cr-desc')?.value.trim()
  const price       = parseFloat($('cr-price')?.value)
  const downPayment = parseFloat($('cr-down')?.value) || 0
  const months      = parseInt($('cr-months')?.value)
  const notes       = $('cr-notes')?.value.trim()
  const startDate   = $('cr-startdate')?.value || todayStr()

  if (!sellerEmail || !item || !price || !months) { toast(t('errRequired'), 'error'); return }
  if (!sellerEmail.includes('@'))  { toast(t('errEmail'),   'error'); return }
  if (months < 1 || months > 60)  { toast(t('errMonths'),  'error'); return }
  if (downPayment >= price)        { toast(t('errDown'),    'error'); return }
  if (sellerEmail === App.user.email) { toast(t('errSelf'), 'error'); return }

  const btn = $('submit-deal-btn')
  btn.innerHTML = `<span class="spinner"></span>`
  btn.disabled = true

  try {
    const installment = Math.round(((price - downPayment) / months) * 100) / 100
    const deal = await createDeal({
      buyerId: App.user.id,
      buyerEmail: App.user.email,
      buyerName: App.profile?.full_name || App.user.email.split('@')[0],
      sellerEmail, item, description, price, downPayment,
      months, installment, notes, startDate,
    })

    // Refresh local deals
    App.deals = await fetchMyDeals(App.user.email, App.user.id)

    // Reset form
    ;['cr-seller','cr-desc','cr-price','cr-notes'].forEach(id => { const el = $(id); if(el) el.value='' })
    $('cr-item').value = ''
    $('cr-down').value = '0'
    $('cr-months').value = ''
    $('cr-startdate').value = todayStr()
    $('calc-val').textContent = '—'

    toast(t('toastSent'), 'success')
    await navigate('dash')
  } catch (err) {
    toast('⚠️ ' + err.message, 'error')
    btn.innerHTML = `📤 <span class="ar-text">إرسال الطلب</span><span class="en-text hidden">Send Request</span>`
    btn.disabled = false
  }
}

// ══════════════════════════════════════
// RENDER FUNCTIONS
// ══════════════════════════════════════
async function renderDash() {
  const mine  = App.deals
  const totalVal = mine.filter(d => ['active','completed'].includes(d.status)).reduce((s,d) => s + d.price, 0)

  $('s-active') && ($('s-active').textContent = mine.filter(d=>d.status==='active').length)
  $('s-done')   && ($('s-done').textContent   = mine.filter(d=>d.status==='completed').length)
  $('s-pend')   && ($('s-pend').textContent   = mine.filter(d=>d.status==='pending').length)
  $('s-val')    && ($('s-val').textContent    = totalVal >= 1000 ? (totalVal/1000).toFixed(1)+'K' : totalVal)

  const name = App.profile?.full_name || App.user.email.split('@')[0]
  $('dash-welcome') && ($('dash-welcome').textContent = isAr() ? `مرحباً، ${name} 👋` : `Welcome, ${name} 👋`)

  const recent = [...mine].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5)
  html('dash-list', recent.length === 0 ? emptyState('📄', t('noDeals')) : recent.map(buildDealCard).join(''))
}

async function renderIncoming() {
  const pending = App.deals.filter(d => d.seller_email === App.user.email && d.status === 'pending')
  if (!pending.length) { html('incoming-list', emptyState('📥', t('noIncoming'))); return }

  html('incoming-list', pending.map(deal => `
    <div class="card mb16">
      <div class="card-header">
        <div>
          <h3>${getIcon(deal.item)} ${deal.item}${deal.description ? ' — '+deal.description : ''}</h3>
          <div class="text-sm text-muted mt8">${t('from')}: <strong>${deal.buyer_name}</strong> (${deal.buyer_email})</div>
        </div>
        ${statusBadge(deal.status)}
      </div>
      <div class="card-body">
        <div class="info-grid">
          <div class="info-item"><div class="info-label">${t('totalPrice')}</div><div class="info-value blue">${fmtSAR(deal.price)}</div></div>
          <div class="info-item"><div class="info-label">${t('calcInstallment')}</div><div class="info-value blue">${fmtSAR(deal.installment)}</div></div>
          <div class="info-item"><div class="info-label">${t('downPayment')}</div><div class="info-value">${fmtSAR(deal.down_payment)}</div></div>
          <div class="info-item"><div class="info-label">${t('months')}</div><div class="info-value">${deal.months} ${t('monthsLong')}</div></div>
        </div>
        ${deal.notes ? `<div class="mt12 text-sm text-muted"><strong>${t('notes')}:</strong> ${deal.notes}</div>` : ''}
      </div>
      <div class="card-footer flex jce gap10">
        <button class="btn btn-danger btn-sm" onclick="handleRespond('${deal.id}','rejected')">✗ ${t('reject')}</button>
        <button class="btn btn-success btn-sm" onclick="handleRespond('${deal.id}','active')">✓ ${t('accept')}</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('detail',{dealId:'${deal.id}'})">👁 ${t('viewDetails')}</button>
      </div>
    </div>
  `).join(''))
}

window.filterDeals = filter => {
  App.filter = filter
  ;['all','active','pending','completed','rejected'].forEach(f => {
    $('tab-'+f)?.classList.toggle('active', f === filter)
  })
  renderDeals()
}

async function renderDeals() {
  let mine = App.deals
  if (App.filter !== 'all') mine = mine.filter(d => d.status === App.filter)
  mine = [...mine].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  html('deals-list', mine.length === 0 ? emptyState('📋', t('noDeals')) : mine.map(buildDealCard).join(''))
}

async function renderDetail(dealId) {
  if (!dealId) return
  html('detail-content', `<div class="empty-state"><div class="spinner" style="width:30px;height:30px;border-color:var(--g300);border-top-color:var(--b600)"></div></div>`)

  let deal
  try {
    deal = await fetchDeal(dealId)
  } catch {
    deal = App.deals.find(d => d.id === dealId)
  }
  if (!deal) { html('detail-content', emptyState('❌', 'Deal not found')); return }

  const isBuyer   = deal.buyer_id === App.user.id
  const payments  = deal.payments || []
  const paid      = payments.filter(p => p.is_paid).length
  const total     = deal.months
  const pct       = Math.round((paid / total) * 100) || 0
  const paidAmt   = paid * deal.installment
  const remaining = Math.max(deal.price - deal.down_payment - paidAmt, 0)

  const alreadyRated = await hasRated(dealId, App.user.id).catch(() => false)
  const canRate = deal.status === 'completed' && !alreadyRated
  const rateTargetEmail = isBuyer ? deal.seller_email : deal.buyer_email

  const rows = [...payments]
    .sort((a,b) => a.month_num - b.month_num)
    .map(p => {
      const isOverdue = !p.is_paid && new Date(p.due_date) < new Date()
      const rowCls = p.is_paid ? 'row-paid' : (isOverdue ? 'row-overdue' : '')
      const canMark = deal.status === 'active' && isBuyer && !p.is_paid
      return `
      <tr class="${rowCls}">
        <td>${t('month')} ${p.month_num}</td>
        <td style="color:${isOverdue?'var(--amber600)':'inherit'}">${fmtDate(p.due_date)}${isOverdue&&!p.is_paid?' ⚠️':''}</td>
        <td><strong>${fmtSAR(p.amount)}</strong></td>
        <td>${p.is_paid
          ? `<span class="badge b-green">✓ ${t('paid')}</span>`
          : isOverdue
            ? `<span class="badge b-amber">${t('overdue')}</span>`
            : `<span class="badge b-gray">${t('unpaid')}</span>`}
        </td>
        <td>${canMark ? `<button class="btn btn-primary btn-sm" onclick="handleMarkPaid('${deal.id}','${p.id}')">💳 ${t('markPaid')}</button>` : '—'}</td>
      </tr>`
    }).join('')

  const ratings = deal.ratings || []
  const ratingsHtml = ratings.length
    ? ratings.map(r => `<div style="padding:12px 0;border-bottom:1px solid var(--g100)"><div class="flex aic jsb mb8"><strong class="text-sm">${r.from_name}</strong>${renderStars(r.stars,1)}</div>${r.comment?`<p class="text-sm text-muted">"${r.comment}"</p>`:''}<div class="text-xs text-muted mt8">${fmtDate(r.created_at)}</div></div>`).join('')
    : `<div class="text-sm text-muted">${t('noRatings')}</div>`

  html('detail-content', `
    <button class="btn btn-ghost btn-sm mb16" onclick="navigate('deals')">← ${isAr()?'رجوع':'Back'}</button>
    <div class="flex aic jsb mb20" style="flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:20px;font-weight:800">${getIcon(deal.item)} ${deal.item}${deal.description?' — '+deal.description:''}</h1>
        <div class="text-sm text-muted mt8">${isAr()?'رقم العقد':'Contract #'}: <strong>${deal.contract_num}</strong></div>
      </div>
      <div class="flex aic gap10">
        ${statusBadge(deal.status)}
        ${canRate ? `<button class="btn btn-warning" onclick="openRatingModal('${deal.id}','${isBuyer?'seller':'buyer'}','${rateTargetEmail}')">⭐ ${t('rateParty')}</button>` : ''}
      </div>
    </div>

    <div class="card mb16">
      <div class="card-header"><h2>${isAr()?'طرفا الصفقة والتفاصيل المالية':'Parties & Financial Details'}</h2></div>
      <div class="card-body">
        <div class="info-grid mb16">
          <div class="info-item"><div class="info-label">${t('buyer')}</div><div class="info-value">${deal.buyer_name}</div><div class="info-sub">${deal.buyer_email}</div></div>
          <div class="info-item"><div class="info-label">${t('seller')}</div><div class="info-value">${deal.seller_email}</div></div>
        </div>
        <div class="info-grid-3">
          <div class="info-item"><div class="info-label">${t('totalPrice')}</div><div class="info-value blue">${fmtSAR(deal.price)}</div></div>
          <div class="info-item"><div class="info-label">${t('downPayment')}</div><div class="info-value">${fmtSAR(deal.down_payment)}</div></div>
          <div class="info-item"><div class="info-label">${t('calcInstallment')}</div><div class="info-value blue">${fmtSAR(deal.installment)}</div></div>
          <div class="info-item"><div class="info-label">${t('months')}</div><div class="info-value">${deal.months}</div></div>
          <div class="info-item"><div class="info-label">${t('startDate')}</div><div class="info-value">${fmtDate(deal.start_date)}</div></div>
          <div class="info-item"><div class="info-label">${t('remaining')}</div><div class="info-value" style="color:${remaining>0?'var(--amber600)':'var(--green600)'}">${fmtSAR(remaining)}</div></div>
        </div>
        ${deal.notes?`<div class="divider"></div><p class="text-sm text-muted"><strong>${t('notes')}:</strong> ${deal.notes}</p>`:''}
      </div>
    </div>

    ${deal.status==='active' ? `
    <div class="card mb16">
      <div class="card-body">
        <div class="flex aic jsb mb12"><h3>${t('progress')}</h3><span class="badge b-blue">${paid}/${total} ${t('monthsLong')}</span></div>
        <div class="progress-label"><span>${t('totalPaid')}: ${fmtSAR(paidAmt)}</span><span>${pct}%</span></div>
        <div class="progress-track" style="height:12px"><div class="progress-fill pf-blue" style="width:${pct}%"></div></div>
        <div class="flex jsb mt8 text-xs text-muted"><span>${isAr()?'الدفعة الأولى:':'Down Payment:'} ${fmtSAR(deal.down_payment)}</span><span>${t('remaining')}: ${fmtSAR(remaining)}</span></div>
      </div>
    </div>` : ''}

    <div class="card mb16">
      <div class="card-header"><h2>${t('paySchedule')}</h2><span class="text-sm text-muted">${paid}/${total} ${isAr()?'مدفوع':'paid'}</span></div>
      <div class="table-scroll">
        <table class="pay-table">
          <thead><tr><th>${t('month')}</th><th>${t('dueDate')}</th><th>${t('amount')}</th><th>${t('status')}</th><th>${t('action')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div class="mb16">
      <div class="section-hdr">
        <h2>${t('contract')}</h2>
        <button class="btn btn-secondary btn-sm" onclick="printContract('${deal.id}')">🖨️ ${t('print')}</button>
      </div>
      ${buildContract(deal)}
    </div>

    <div class="card">
      <div class="card-header"><h2>⭐ ${isAr()?'التقييمات':'Ratings'}</h2></div>
      <div class="card-body">${ratingsHtml}</div>
    </div>
  `)
}

async function renderProfile() {
  const u = App.user
  const p = App.profile
  const name   = p?.full_name || u.email.split('@')[0]
  const color  = p?.avatar_color || avatarBg(u.email)
  const ratings = await getUserRatings(u.email).catch(() => [])
  const r = avgRating(ratings)
  const mine = App.deals

  html('profile-content', `
    <div class="card mb20">
      <div style="background:linear-gradient(135deg,var(--b600),var(--b800));padding:32px 28px;text-align:center;border-radius:var(--r16) var(--r16) 0 0">
        <div style="width:72px;height:72px;border-radius:50%;background:${color};border:3px solid rgba(255,255,255,.3);display:inline-flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff;margin-bottom:12px">${initials(name)}</div>
        <h2 style="color:#fff;font-size:20px;font-weight:800">${name}</h2>
        <div style="color:rgba(255,255,255,.65);font-size:13px;margin-top:4px">${u.email}</div>
        <div style="margin-top:10px">${r ? renderStars(r.avg, r.count, 16) : `<span style="color:rgba(255,255,255,.5);font-size:12px">${t('noRatings')}</span>`}</div>
      </div>
      <div class="card-body">
        <div class="info-grid">
          ${p?.phone ? `<div class="info-item"><div class="info-label">${t('phone')}</div><div class="info-value">${p.phone}</div></div>` : ''}
          ${p?.national_id ? `<div class="info-item"><div class="info-label">${t('natId')}</div><div class="info-value">${p.national_id}</div></div>` : ''}
          <div class="info-item"><div class="info-label">${t('joinDate')}</div><div class="info-value">${fmtDate(u.created_at)}</div></div>
        </div>
      </div>
    </div>

    <div class="info-grid-3 mb20">
      <div class="stat-card"><div class="stat-icon" style="background:#dbeafe">📊</div><div class="stat-value">${mine.length}</div><div class="stat-label ar-text">إجمالي الصفقات</div><div class="stat-label en-text hidden">Total Deals</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#dcfce7">✅</div><div class="stat-value">${mine.filter(d=>d.status==='completed').length}</div><div class="stat-label ar-text">مكتملة</div><div class="stat-label en-text hidden">Completed</div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#fef3c7">⭐</div><div class="stat-value">${r ? r.avg : '—'}</div><div class="stat-label ar-text">متوسط التقييم</div><div class="stat-label en-text hidden">Avg Rating</div></div>
    </div>

    <div class="card mb20">
      <div class="card-header"><h2>⭐ ${isAr()?'التقييمات المستلمة':'Reviews Received'}</h2><span class="badge b-blue">${ratings.length}</span></div>
      <div class="card-body">
        ${ratings.length === 0
          ? emptyState('⭐', t('noRatings'))
          : ratings.map(r => `<div style="padding:12px 0;border-bottom:1px solid var(--g100)"><div class="flex aic jsb mb8"><strong class="text-sm">${r.from_name}</strong>${renderStars(r.stars,1)}</div>${r.comment?`<p class="text-sm text-muted">"${r.comment}"</p>`:''}<div class="text-xs text-muted mt8">${fmtDate(r.created_at)}</div></div>`).join('')}
      </div>
    </div>

    <div class="disclaimer-bar">⚠️ <span class="ar-text">${TR.ar.disclaimer}</span><span class="en-text hidden">${TR.en.disclaimer}</span></div>
  `)
  applyLang()
}

// ══════════════════════════════════════
// DEAL CARD BUILDER
// ══════════════════════════════════════
function buildDealCard(deal) {
  const isBuyer = deal.buyer_id === App.user.id || deal.buyer_email === App.user.email
  const payments = deal.payments || []
  const paid  = payments.filter(p => p.is_paid).length
  const total = deal.months || 1
  const pct   = Math.round((paid/total)*100)
  const roleLabel = isBuyer ? t('to') : t('from')
  const other = isBuyer ? deal.seller_email : deal.buyer_name
  const pfCls = pct>=100?'pf-green':pct<25?'pf-amber':'pf-blue'

  return `
  <div class="deal-card" onclick="navigate('detail',{dealId:'${deal.id}'})">
    <div class="deal-icon">${getIcon(deal.item)}</div>
    <div class="deal-body">
      <div class="deal-title">${deal.item}${deal.description?' — '+deal.description:''}</div>
      <div class="deal-meta">${roleLabel}: <strong>${other}</strong> <span style="opacity:.4">•</span> ${fmtDate(deal.created_at)}</div>
      ${deal.status==='active' ? `
      <div>
        <div class="progress-label"><span>${paid}/${total} ${t('monthsShort')}</span><span>${pct}%</span></div>
        <div class="progress-track"><div class="progress-fill ${pfCls}" style="width:${pct}%"></div></div>
      </div>` : ''}
    </div>
    <div class="deal-right">
      <div class="deal-price">${fmtSAR(deal.price)}</div>
      <div class="deal-price-sub">${fmtSAR(deal.installment)}/${t('monthsShort')}</div>
      <div style="margin-top:8px">${statusBadge(deal.status)}</div>
    </div>
  </div>`
}

function emptyState(emoji, title) {
  return `<div class="empty-state"><div class="empty-emoji">${emoji}</div><div class="empty-title">${title}</div></div>`
}

// ══════════════════════════════════════
// CONTRACT
// ══════════════════════════════════════
function buildContract(deal) {
  return `
  <div class="contract-wrap" id="contract-${deal.id}">
    <div class="contract-hdr">
      <div class="contract-logo">قسطني — Qastni</div>
      <div class="contract-doc-title">${t('contractTitle')}</div>
      <div class="contract-num">${deal.contract_num}</div>
    </div>
    <div class="contract-body">
      <div class="contract-section">
        <div class="contract-section-title">${t('contractParties')}</div>
        <div class="contract-parties">
          <div class="contract-party">
            <div class="contract-party-role">${t('buyer')}</div>
            <div class="contract-party-name">${deal.buyer_name}</div>
            <div class="contract-party-email">${deal.buyer_email}</div>
          </div>
          <div class="contract-party">
            <div class="contract-party-role">${t('seller')}</div>
            <div class="contract-party-name">${deal.seller_email}</div>
            <div class="contract-party-email">${isAr()?'رقم العقد:':'Contract:'} ${deal.contract_num}</div>
          </div>
        </div>
      </div>
      <div class="contract-section">
        <div class="contract-section-title">${t('contractFin')}</div>
        <div class="contract-fin">
          <div class="contract-fin-item"><div class="contract-fin-label">${isAr()?'السلعة':'Item'}</div><div class="contract-fin-value" style="font-size:14px">${deal.item}${deal.description?' — '+deal.description:''}</div></div>
          <div class="contract-fin-item"><div class="contract-fin-label">${t('totalPrice')}</div><div class="contract-fin-value">${fmtSAR(deal.price)}</div></div>
          <div class="contract-fin-item"><div class="contract-fin-label">${t('downPayment')}</div><div class="contract-fin-value">${fmtSAR(deal.down_payment)}</div></div>
          <div class="contract-fin-item"><div class="contract-fin-label">${t('calcInstallment')}</div><div class="contract-fin-value">${fmtSAR(deal.installment)}</div></div>
          <div class="contract-fin-item"><div class="contract-fin-label">${t('months')}</div><div class="contract-fin-value">${deal.months} ${t('monthsLong')}</div></div>
          <div class="contract-fin-item"><div class="contract-fin-label">${t('startDate')}</div><div class="contract-fin-value" style="font-size:13px">${fmtDate(deal.start_date)}</div></div>
        </div>
      </div>
      <div class="contract-section">
        <div class="contract-section-title">${t('contractTerms')}</div>
        <div class="contract-terms"><ol>${t('terms').map(item=>`<li>${item}</li>`).join('')}</ol></div>
      </div>
      ${deal.notes ? `<div class="contract-section"><div class="contract-section-title">${t('notes')}</div><div class="contract-terms">${deal.notes}</div></div>` : ''}
      <div class="contract-sig-row">
        <div class="contract-sig"><div>${t('buyerSig')}</div><div style="margin-top:4px;font-weight:700;color:var(--g700)">${deal.buyer_name}</div></div>
        <div class="contract-sig"><div>${t('sellerSig')}</div><div style="margin-top:4px;font-weight:700;color:var(--g700)">${deal.seller_email}</div></div>
      </div>
    </div>
    <div class="contract-footer">${t('contractDisclaimer')}<br>${t('issuedDate')}: ${fmtDate(deal.created_at)}</div>
  </div>`
}

window.printContract = dealId => {
  const el = $('contract-' + dealId)
  if (!el) return
  const w = window.open('', '_blank', 'width=800,height=700')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contract</title>
    <style>body{font-family:${isAr()?'Tajawal':'Inter'},sans-serif;direction:${isAr()?'rtl':'ltr'};padding:20px;color:#0f172a}
    .contract-wrap{border:2px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .contract-hdr{background:#1e293b;padding:24px;text-align:center;color:#fff}
    .contract-body{padding:24px}.contract-section{margin-bottom:18px}
    .contract-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f1f5f9}
    .contract-parties{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .contract-party{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
    .contract-party-role{font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;font-weight:700}
    .contract-party-name{font-size:15px;font-weight:700;color:#0f172a}
    .contract-fin{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .contract-fin-item{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px}
    .contract-fin-label{font-size:10px;text-transform:uppercase;color:#3b82f6;margin-bottom:3px;font-weight:700}
    .contract-fin-value{font-size:15px;font-weight:800;color:#1e40af}
    .contract-terms{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:12px;color:#475569;line-height:1.8}
    .contract-terms ol{padding-inline-start:16px}
    .contract-sig-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
    .contract-sig{border-top:1.5px solid #cbd5e1;padding-top:8px;text-align:center;font-size:11px;color:#94a3b8}
    .contract-footer{padding:14px 24px;background:#f8fafc;border-top:2px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}</style>
    </head><body>${el.outerHTML}</body></html>`)
  w.document.close(); w.focus(); setTimeout(() => w.print(), 500)
}

// ══════════════════════════════════════
// RESPOND TO DEAL
// ══════════════════════════════════════
window.handleRespond = async (dealId, status) => {
  try {
    await respondToDeal(dealId, status, App.user.id)
    App.deals = await fetchMyDeals(App.user.email, App.user.id)
    toast(status === 'active' ? t('toastAccepted') : t('toastRejected'), status==='active'?'success':'error')
    updateBadge()
    renderIncoming()
  } catch (err) {
    toast('⚠️ ' + err.message, 'error')
  }
}

// ══════════════════════════════════════
// MARK PAYMENT PAID
// ══════════════════════════════════════
window.handleMarkPaid = async (dealId, paymentId) => {
  try {
    const { isCompleted } = await markPaymentPaid(paymentId, dealId, App.user.id)
    App.deals = await fetchMyDeals(App.user.email, App.user.id)
    toast(isCompleted ? t('toastCompleted') : t('toastPaid'), 'success')
    await renderDetail(dealId)
  } catch (err) {
    toast('⚠️ ' + err.message, 'error')
  }
}

// ══════════════════════════════════════
// RATINGS
// ══════════════════════════════════════
window.openRatingModal = (dealId, target, targetEmail) => {
  App.ratingState = { dealId, target, targetEmail, stars: 0 }
  setStarRating(0)
  $('rating-comment').value = ''
  $('rating-modal').classList.remove('hidden')
}

window.closeRatingModal = () => $('rating-modal')?.classList.add('hidden')

window.setStarRating = val => {
  App.ratingState.stars = val
  document.querySelectorAll('.star-rate').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.v) <= val)
  })
}

window.handleSubmitRating = async () => {
  const { dealId, targetEmail, stars } = App.ratingState
  if (!stars) { toast(isAr()?'⚠️ يرجى اختيار عدد النجوم':'⚠️ Please select stars','error'); return }

  try {
    await submitRating({
      dealId,
      fromUserId:  App.user.id,
      fromEmail:   App.user.email,
      fromName:    App.profile?.full_name || App.user.email.split('@')[0],
      toEmail:     targetEmail,
      stars,
      comment:     $('rating-comment')?.value.trim() || '',
    })
    closeRatingModal()
    toast(t('toastRated'), 'success')
    await renderDetail(dealId)
    updateSidebarStars()
  } catch (err) {
    toast('⚠️ ' + err.message, 'error')
  }
}

// ══════════════════════════════════════
// BOOT
// ══════════════════════════════════════
async function boot() {
  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      hide('loading-screen')
      await initApp(user, profile)
    } else if (event === 'SIGNED_OUT' || !session) {
      App.user = null; App.profile = null; App.deals = []
      document.body.innerHTML = getAuthHTML()
      applyLang()
      hide('loading-screen')
    }
  })

  // Check existing session
  const session = await getSession()
  if (!session) {
    document.body.innerHTML = getAuthHTML()
    applyLang()
    hide('loading-screen')
  }
  // If session exists, onAuthStateChange fires automatically
}

function getAuthHTML() {
  return `
  <div class="auth-screen">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">ق</div>
        <div class="auth-title">قسطني</div>
        <div class="auth-sub ar-text">منصة التقسيط الآمنة بين الأفراد</div>
        <div class="auth-sub en-text hidden">Safe P2P Installment Platform</div>
        <div class="auth-tabs mt16">
          <button class="auth-tab active" id="tab-login-btn" onclick="switchAuthTab('login')">
            <span class="ar-text">تسجيل الدخول</span><span class="en-text hidden">Sign In</span>
          </button>
          <button class="auth-tab" id="tab-reg-btn" onclick="switchAuthTab('register')">
            <span class="ar-text">حساب جديد</span><span class="en-text hidden">Register</span>
          </button>
        </div>
        <div style="margin-top:14px"><button class="lang-btn" data-lang-btn onclick="toggleLang()" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.25);color:#fff">${isAr()?'English':'عربي'}</button></div>
      </div>

      <div id="form-login" class="auth-body">
        <div class="form-group"><label class="form-label"><span class="ar-text">البريد الإلكتروني</span><span class="en-text hidden">Email</span></label>
          <input class="form-control" type="email" id="l-email" placeholder="you@example.com"/></div>
        <div class="form-group"><label class="form-label"><span class="ar-text">كلمة المرور</span><span class="en-text hidden">Password</span></label>
          <input class="form-control" type="password" id="l-pass" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()"/>
        </div>
        <div id="login-err" class="alert alert-danger hidden"></div>
        <button class="btn btn-primary btn-full btn-lg" id="login-btn" onclick="doLogin()">
          <span class="ar-text">تسجيل الدخول</span><span class="en-text hidden">Sign In</span>
        </button>
      </div>

      <div id="form-register" class="auth-body hidden">
        <div class="form-group"><label class="form-label"><span class="ar-text">الاسم الكامل</span><span class="en-text hidden">Full Name</span> <span class="req">*</span></label>
          <input class="form-control" type="text" id="r-name" placeholder="${isAr()?'أحمد محمد':'Ahmed Mohammed'}"/></div>
        <div class="form-group"><label class="form-label"><span class="ar-text">البريد الإلكتروني</span><span class="en-text hidden">Email</span> <span class="req">*</span></label>
          <input class="form-control" type="email" id="r-email" placeholder="you@example.com"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label"><span class="ar-text">رقم الجوال</span><span class="en-text hidden">Phone</span></label>
            <input class="form-control" type="tel" id="r-phone" placeholder="+966 5X XXX XXXX"/></div>
          <div class="form-group"><label class="form-label"><span class="ar-text">رقم الهوية</span><span class="en-text hidden">National ID</span></label>
            <input class="form-control" type="text" id="r-id" placeholder="1XXXXXXXXX"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label"><span class="ar-text">كلمة المرور</span><span class="en-text hidden">Password</span> <span class="req">*</span></label>
            <input class="form-control" type="password" id="r-pass" placeholder="••••••••"/></div>
          <div class="form-group"><label class="form-label"><span class="ar-text">تأكيد كلمة المرور</span><span class="en-text hidden">Confirm</span> <span class="req">*</span></label>
            <input class="form-control" type="password" id="r-pass2" placeholder="••••••••"/></div>
        </div>
        <div id="reg-err" class="alert alert-danger hidden"></div>
        <button class="btn btn-primary btn-full btn-lg" id="reg-btn" onclick="doRegister()">
          <span class="ar-text">إنشاء الحساب</span><span class="en-text hidden">Create Account</span>
        </button>
      </div>

      <div class="auth-footer">
        <div class="auth-footer-text ar-text">هذه المنصة تُيسّر الاتفاقيات بين المستخدمين فقط ولا تُجري أي معاملات مالية</div>
        <div class="auth-footer-text en-text hidden">This platform only facilitates agreements between users — no real money transactions.</div>
      </div>
    </div>
  </div>
  <div class="toast-container" id="toast-container"></div>
  `
}

import { getSession } from './lib/supabase.js'
boot()
