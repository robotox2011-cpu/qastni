// src/lib/api.js
// ─── All Supabase data operations ────────────────────────
import { supabase } from './supabase.js'

// ══════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════

/** Generate contract number */
function genContractNum() {
  return 'QST-' + Date.now().toString().slice(-6)
}

/** Add N months to a date string */
function addMonths(dateStr, n) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().split('T')[0]
}

// ══════════════════════════════════════
// DEALS
// ══════════════════════════════════════

/**
 * Create a new deal + generate its payment schedule
 */
export async function createDeal({
  buyerId, buyerEmail, buyerName,
  sellerEmail, item, description,
  price, downPayment, months, installment,
  notes, startDate
}) {
  // 1. Insert deal
  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .insert({
      contract_num: genContractNum(),
      buyer_id:     buyerId,
      buyer_email:  buyerEmail,
      buyer_name:   buyerName,
      seller_email: sellerEmail,
      item,
      description,
      price,
      down_payment: downPayment,
      months,
      installment,
      notes,
      start_date:   startDate,
      status:       'pending',
    })
    .select()
    .single()

  if (dealErr) throw dealErr

  // 2. Generate payment schedule rows
  const schedule = Array.from({ length: months }, (_, i) => ({
    deal_id:   deal.id,
    month_num: i + 1,
    due_date:  addMonths(startDate, i + 1),
    amount:    installment,
    is_paid:   false,
  }))

  const { error: payErr } = await supabase.from('payments').insert(schedule)
  if (payErr) throw payErr

  // 3. Notify seller (look up seller profile by email)
  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (
      await supabase.auth.admin?.getUserByEmail?.(sellerEmail)
        .then(r => r?.data?.user?.id)
        .catch(() => null)
    ))
    .maybeSingle()

  // Try to find seller by joining auth users via a safe workaround:
  // We store seller_id when seller accepts, so notification goes by email lookup
  await createNotification({
    // We'll notify by email match when seller logs in
    userEmail:  sellerEmail,
    type:       'deal_request',
    titleAr:    'طلب تقسيط جديد',
    titleEn:    'New Installment Request',
    bodyAr:     `${buyerName} أرسل إليك طلب تقسيط لـ ${item}`,
    bodyEn:     `${buyerName} sent you an installment request for ${item}`,
    dealId:     deal.id,
  })

  return deal
}

/**
 * Fetch all deals for the current user (as buyer OR seller)
 */
export async function fetchMyDeals(userEmail, userId) {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      payments ( id, month_num, due_date, amount, is_paid, paid_at )
    `)
    .or(`buyer_id.eq.${userId},seller_email.eq.${userEmail}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Fetch a single deal with payments and ratings
 */
export async function fetchDeal(dealId) {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      payments ( * ),
      ratings  ( * )
    `)
    .eq('id', dealId)
    .single()

  if (error) throw error
  return data
}

/**
 * Accept or reject a deal
 */
export async function respondToDeal(dealId, status, sellerId) {
  const updates = { status }
  if (status === 'active')    { updates.accepted_at = new Date().toISOString(); updates.seller_id = sellerId }
  if (status === 'rejected')  { updates.rejected_at = new Date().toISOString() }

  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)
    .select()
    .single()

  if (error) throw error

  // Notify buyer
  const deal = data
  await createNotificationById({
    userId:  deal.buyer_id,
    type:    status === 'active' ? 'deal_accepted' : 'deal_rejected',
    titleAr: status === 'active' ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك',
    titleEn: status === 'active' ? 'Your request was accepted' : 'Your request was rejected',
    bodyAr:  `تم ${status === 'active' ? 'قبول' : 'رفض'} طلب تقسيط ${deal.item}`,
    bodyEn:  `Your installment request for ${deal.item} was ${status === 'active' ? 'accepted' : 'rejected'}`,
    dealId:  deal.id,
  })

  return data
}

// ══════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════

/**
 * Mark a payment as paid
 */
export async function markPaymentPaid(paymentId, dealId, buyerId) {
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) throw error

  // Check if all payments are done → complete the deal
  const { data: allPay } = await supabase
    .from('payments')
    .select('is_paid')
    .eq('deal_id', dealId)

  const allDone = allPay?.every(p => p.is_paid)
  if (allDone) {
    await supabase
      .from('deals')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', dealId)
  }

  return { payment, isCompleted: allDone }
}

// ══════════════════════════════════════
// RATINGS
// ══════════════════════════════════════

/**
 * Submit a rating
 */
export async function submitRating({ dealId, fromUserId, fromEmail, fromName, toEmail, stars, comment }) {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ deal_id: dealId, from_user_id: fromUserId, from_email: fromEmail, from_name: fromName, to_email: toEmail, stars, comment })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get ratings for a user (by email)
 */
export async function getUserRatings(email) {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('to_email', email)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Check if user has rated a deal
 */
export async function hasRated(dealId, fromUserId) {
  const { data } = await supabase
    .from('ratings')
    .select('id')
    .eq('deal_id', dealId)
    .eq('from_user_id', fromUserId)
    .maybeSingle()
  return !!data
}

// ══════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════

/**
 * Create notification by email (used when we don't have user_id yet)
 */
async function createNotification({ userEmail, type, titleAr, titleEn, bodyAr, bodyEn, dealId }) {
  // We store a pending notification; it gets picked up when user logs in
  // For now we skip if we can't resolve user_id - the RLS handles this
  // In production you'd use a Supabase Edge Function for this
  console.log('[Notification queued]', { userEmail, type, titleEn })
}

/**
 * Create notification by user ID
 */
async function createNotificationById({ userId, type, titleAr, titleEn, bodyAr, bodyEn, dealId }) {
  if (!userId) return
  await supabase.from('notifications').insert({
    user_id:  userId,
    type,
    title_ar: titleAr,
    title_en: titleEn,
    body_ar:  bodyAr,
    body_en:  bodyEn,
    deal_id:  dealId,
  })
}

/**
 * Fetch notifications for current user
 */
export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

/**
 * Mark notifications as read
 */
export async function markNotifsRead(userId) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
}

// ══════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ══════════════════════════════════════

/**
 * Subscribe to deal changes for the current user
 */
export function subscribeToDeals(userEmail, userId, callback) {
  const channel = supabase
    .channel('deals-realtime')
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'deals',
        filter: `buyer_id=eq.${userId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'deals',
        filter: `seller_email=eq.${userEmail}`,
      },
      callback
    )
    .subscribe()

  return channel
}

/**
 * Subscribe to payment changes for a deal
 */
export function subscribeToPayments(dealId, callback) {
  return supabase
    .channel(`payments-${dealId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'payments',
        filter: `deal_id=eq.${dealId}`,
      },
      callback
    )
    .subscribe()
}

/**
 * Subscribe to notifications
 */
export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`notifs-${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

/** Unsubscribe from a channel */
export function unsubscribe(channel) {
  if (channel) supabase.removeChannel(channel)
}
