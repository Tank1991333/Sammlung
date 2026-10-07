// Optionale Synchronisation über Supabase (kostenloses Kontingent).
// Aktiv nur, wenn VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY bei Vercel eingetragen sind.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
export const syncAvailable = !!supabase

export async function signIn(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function pullCollection(userId) {
  const { data, error } = await supabase
    .from('collections').select('data, updated_at').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.data || null
}

export async function pushCollection(userId, payload) {
  const { error } = await supabase.from('collections').upsert({
    user_id: userId, data: payload, updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function pullPhotoIds(userId) {
  const { data, error } = await supabase.from('photos').select('coin_id').eq('user_id', userId)
  if (error) throw error
  return data.map((r) => r.coin_id)
}

export async function pullPhoto(userId, coinId) {
  const { data, error } = await supabase
    .from('photos').select('data').eq('user_id', userId).eq('coin_id', coinId).maybeSingle()
  if (error) throw error
  return data?.data || null
}

export async function pushPhoto(userId, coinId, dataUrl) {
  const { error } = await supabase.from('photos').upsert({
    user_id: userId, coin_id: coinId, data: dataUrl, updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteRemotePhoto(userId, coinId) {
  const { error } = await supabase.from('photos').delete().eq('user_id', userId).eq('coin_id', coinId)
  if (error) throw error
}
