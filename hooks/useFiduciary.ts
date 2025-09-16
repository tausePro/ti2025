import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FiduciaryAccount, ProjectFinancialConfig, PaymentOrder, FiduciaryMovement } from '@/types'

export function useFiduciaryAccounts(projectId: string) {
  const [accounts, setAccounts] = useState<FiduciaryAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('fiduciary_accounts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sifi_code')

      if (queryError) throw queryError

      setAccounts(data || [])
    } catch (err) {
      console.error('Error loading fiduciary accounts:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadAccounts()
    }
  }, [projectId])

  const createAccount = async (accountData: Omit<FiduciaryAccount, 'id' | 'created_at' | 'updated_at' | 'current_balance'>) => {
    try {
      const { data, error } = await supabase
        .from('fiduciary_accounts')
        .insert({
          ...accountData,
          current_balance: accountData.initial_balance
        })
        .select()
        .single()

      if (error) throw error

      setAccounts(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error creating fiduciary account:', err)
      throw err
    }
  }

  const updateAccount = async (accountId: string, updates: Partial<FiduciaryAccount>) => {
    try {
      const { data, error } = await supabase
        .from('fiduciary_accounts')
        .update(updates)
        .eq('id', accountId)
        .select()
        .single()

      if (error) throw error

      setAccounts(prev => prev.map(acc => acc.id === accountId ? data : acc))
      return data
    } catch (err) {
      console.error('Error updating fiduciary account:', err)
      throw err
    }
  }

  const deleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('fiduciary_accounts')
        .update({ is_active: false })
        .eq('id', accountId)

      if (error) throw error

      setAccounts(prev => prev.filter(acc => acc.id !== accountId))
    } catch (err) {
      console.error('Error deleting fiduciary account:', err)
      throw err
    }
  }

  return {
    accounts,
    loading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    refreshAccounts: loadAccounts
  }
}

export function useProjectFinancialConfig(projectId: string) {
  const [config, setConfig] = useState<ProjectFinancialConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('project_financial_config')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError
      }

      setConfig(data || null)
    } catch (err) {
      console.error('Error loading financial config:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadConfig()
    }
  }, [projectId])

  const createConfig = async (configData: Omit<ProjectFinancialConfig, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('project_financial_config')
        .insert(configData)
        .select()
        .single()

      if (error) throw error

      setConfig(data)
      return data
    } catch (err) {
      console.error('Error creating financial config:', err)
      throw err
    }
  }

  const updateConfig = async (updates: Partial<ProjectFinancialConfig>) => {
    try {
      const { data, error } = await supabase
        .from('project_financial_config')
        .update(updates)
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) throw error

      setConfig(data)
      return data
    } catch (err) {
      console.error('Error updating financial config:', err)
      throw err
    }
  }

  return {
    config,
    loading,
    error,
    createConfig,
    updateConfig,
    refreshConfig: loadConfig
  }
}

export function usePaymentOrders(projectId: string) {
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('payment_orders')
        .select(`
          *,
          fiduciary_account:fiduciary_accounts(*),
          approver:profiles!approved_by(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      setOrders(data || [])
    } catch (err) {
      console.error('Error loading payment orders:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadOrders()
    }
  }, [projectId])

  const createOrder = async (orderData: Omit<PaymentOrder, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'requested_at'>) => {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .insert(orderData)
        .select(`
          *,
          fiduciary_account:fiduciary_accounts(*),
          approver:profiles!approved_by(id, full_name, email)
        `)
        .single()

      if (error) throw error

      setOrders(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating payment order:', err)
      throw err
    }
  }

  const updateOrder = async (orderId: string, updates: Partial<PaymentOrder>) => {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .update(updates)
        .eq('id', orderId)
        .select(`
          *,
          fiduciary_account:fiduciary_accounts(*),
          approver:profiles!approved_by(id, full_name, email)
        `)
        .single()

      if (error) throw error

      setOrders(prev => prev.map(order => order.id === orderId ? data : order))
      return data
    } catch (err) {
      console.error('Error updating payment order:', err)
      throw err
    }
  }

  const approveOrder = async (orderId: string, approverId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select(`
          *,
          fiduciary_account:fiduciary_accounts(*),
          approver:profiles!approved_by(id, full_name, email)
        `)
        .single()

      if (error) throw error

      setOrders(prev => prev.map(order => order.id === orderId ? data : order))
      return data
    } catch (err) {
      console.error('Error approving payment order:', err)
      throw err
    }
  }

  const rejectOrder = async (orderId: string, rejectionReason: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', orderId)
        .select(`
          *,
          fiduciary_account:fiduciary_accounts(*),
          approver:profiles!approved_by(id, full_name, email)
        `)
        .single()

      if (error) throw error

      setOrders(prev => prev.map(order => order.id === orderId ? data : order))
      return data
    } catch (err) {
      console.error('Error rejecting payment order:', err)
      throw err
    }
  }

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrder,
    approveOrder,
    rejectOrder,
    refreshOrders: loadOrders
  }
}

export function useFiduciaryMovements(accountId: string) {
  const [movements, setMovements] = useState<FiduciaryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadMovements = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('fiduciary_movements')
        .select('*')
        .eq('fiduciary_account_id', accountId)
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      setMovements(data || [])
    } catch (err) {
      console.error('Error loading fiduciary movements:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accountId) {
      loadMovements()
    }
  }, [accountId])

  const createMovement = async (movementData: Omit<FiduciaryMovement, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('fiduciary_movements')
        .insert(movementData)
        .select()
        .single()

      if (error) throw error

      setMovements(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating fiduciary movement:', err)
      throw err
    }
  }

  return {
    movements,
    loading,
    error,
    createMovement,
    refreshMovements: loadMovements
  }
}
